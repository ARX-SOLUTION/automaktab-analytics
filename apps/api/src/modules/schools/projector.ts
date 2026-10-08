import {sql} from 'drizzle-orm';
import type {EventEnvelope,SourceRecord} from '@automaktab/contracts';
import {ProductStore,type ProductExecutor} from '../../db/product-store.js';
import {contentHash} from '../collection/collector.js';

export type ProjectionResult='applied'|'duplicate'|'PARENT_NOT_READY'|'SOURCE_BASELINE_MISSING'|'ALIAS_NOT_VERIFIED'|'VERSION_GAP'|'VERSION_CONFLICT'|'OWNERSHIP_MISMATCH'|'INVALID_TRUSTED_EVENT';
type ProjectedRecord=Omit<SourceRecord,'company_id'|'aggregate_type'>&{company_id:string|null;aggregate_type:string};
export class SchoolProjector {
 constructor(readonly store:ProductStore){}
 async apply(tx:ProductExecutor,event:EventEnvelope):Promise<ProjectionResult>{
  const {aggregate_id:id,aggregate_type:type,aggregate_version:version,effective_at:effectiveAt,source,environment:env}=event;
  const companyId=event.company_id??null;
  if(!id||!type||!version||!effectiveAt||(!companyId&&event.name!=='lead.created')||!['company','branch','student','lead','usage','learning'].includes(type))return 'INVALID_TRUSTED_EVENT';
  const names:Record<string,string[]>={company:['company.updated'],branch:['branch.updated'],student:['student.updated'],lead:['lead.created','lead.school_linked'],usage:['usage.action'],learning:['learning.result']};
  if(!names[type]?.includes(event.name))return 'INVALID_TRUSTED_EVENT';
  if(companyId)await this.store.lock(tx,companyId,env);
  else await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'lead:'+env+':'+id}))`);
  if(['company','branch','student'].includes(type)){const [baseline]=await this.store.query(tx,sql`SELECT id FROM analytics_barriers WHERE source=${source} AND environment=${env} LIMIT 1`);if(!baseline)return 'SOURCE_BASELINE_MISSING';}
  const [head]=await this.store.query(tx,sql`SELECT version::text,company_id FROM analytics_heads WHERE source=${source} AND environment=${env} AND aggregate_type=${type} AND aggregate_id=${id} FOR UPDATE`);
  const record={aggregate_type:type,aggregate_id:id,aggregate_version:version,company_id:companyId,properties:event.properties};
  const hash=contentHash({...record,effective_at:new Date(effectiveAt).toISOString()});
  if(head&&BigInt(version)<=BigInt(String(head.version))){
   const [fact]=await this.store.query(tx,sql`SELECT content_hash FROM analytics_fact_versions WHERE source=${source} AND environment=${env} AND aggregate_type=${type} AND aggregate_id=${id} AND version=${version}::numeric`);
   return fact?.content_hash===hash?'duplicate':'VERSION_CONFLICT';
  }
  if(head&&head.company_id!==companyId&&!(type==='lead'&&head.company_id===null&&event.name==='lead.school_linked'))return 'OWNERSHIP_MISMATCH';
  if(BigInt(version)!==BigInt(String(head?.version??'0'))+1n)return 'VERSION_GAP';
  if(['company','branch','student'].includes(type)&&event.name!==type+'.updated')return 'INVALID_TRUSTED_EVENT';
  const result=await this.applyRecord(tx,record,effectiveAt,source,env,false);
  if(result!=='applied')return result;
  await tx.execute(sql`INSERT INTO analytics_fact_versions(source,environment,aggregate_type,aggregate_id,version,company_id,effective_at,properties,content_hash) VALUES (${source},${env},${type},${id},${version}::numeric,${companyId},${effectiveAt}::timestamptz,${JSON.stringify(event.properties)}::jsonb,${hash})`);
  await tx.execute(sql`INSERT INTO analytics_heads(source,environment,aggregate_type,aggregate_id,version,company_id,effective_at) VALUES (${source},${env},${type},${id},${version}::numeric,${companyId},${effectiveAt}::timestamptz) ON CONFLICT(source,environment,aggregate_type,aggregate_id) DO UPDATE SET version=EXCLUDED.version,company_id=EXCLUDED.company_id,effective_at=EXCLUDED.effective_at`);
  if(companyId&&['company','branch','student'].includes(type))await tx.execute(sql`INSERT INTO billing_company_ledgers(company_id,environment,revision) VALUES (${companyId},${env},1) ON CONFLICT(company_id,environment) DO UPDATE SET revision=billing_company_ledgers.revision+1`);
  return 'applied';
 }
 async seedBaseline(tx:ProductExecutor,record:SourceRecord,cutover:string,source:string,env:string):Promise<ProjectionResult>{
  if(record.aggregate_version!=='0')return 'INVALID_TRUSTED_EVENT';
  const [exists]=await this.store.query(tx,sql`SELECT content_hash FROM analytics_fact_versions WHERE source=${source} AND environment=${env} AND aggregate_type=${record.aggregate_type} AND aggregate_id=${record.aggregate_id} AND version=0`);
  const hash=contentHash({...record,effective_at:new Date(cutover).toISOString()});
  if(exists)return exists.content_hash===hash?'duplicate':'VERSION_CONFLICT';
  const [head]=await this.store.query(tx,sql`SELECT version FROM analytics_heads WHERE source=${source} AND environment=${env} AND aggregate_type=${record.aggregate_type} AND aggregate_id=${record.aggregate_id}`);
  if(head)return 'VERSION_CONFLICT';
  const result=await this.applyRecord(tx,record,cutover,source,env,true);if(result!=='applied')return result;
  await tx.execute(sql`INSERT INTO analytics_fact_versions(source,environment,aggregate_type,aggregate_id,version,company_id,effective_at,properties,content_hash) VALUES (${source},${env},${record.aggregate_type},${record.aggregate_id},0,${record.company_id},${cutover}::timestamptz,${JSON.stringify(record.properties)}::jsonb,${hash})`);
  await tx.execute(sql`INSERT INTO analytics_heads(source,environment,aggregate_type,aggregate_id,version,company_id,effective_at) VALUES (${source},${env},${record.aggregate_type},${record.aggregate_id},0,${record.company_id},${cutover}::timestamptz)`);
  await tx.execute(sql`INSERT INTO billing_company_ledgers(company_id,environment,revision) VALUES (${record.company_id},${env},1) ON CONFLICT(company_id,environment) DO UPDATE SET revision=billing_company_ledgers.revision+1`);
  return 'applied';
 }
 private async applyRecord(tx:ProductExecutor,record:ProjectedRecord,effectiveAt:string,source:string,env:string,baseline:boolean):Promise<ProjectionResult>{
  const {aggregate_type:type,aggregate_id:id,company_id:companyId,properties:p}=record;
  if(type==='company'){
   if(id!==companyId||typeof p.name!=='string'||typeof p.slug!=='string'||typeof p.is_demo!=='boolean')return 'INVALID_TRUSTED_EVENT';
   await tx.execute(sql`INSERT INTO analytics_schools(id,environment,name,slug,status,is_demo,deleted_at,data_through) VALUES (${id},${env},${p.name},${p.slug},${String(p.status)},${p.is_demo},${p.deleted_at?String(p.deleted_at):null}::timestamptz,${effectiveAt}::timestamptz) ON CONFLICT(id,environment) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,status=EXCLUDED.status,is_demo=EXCLUDED.is_demo,deleted_at=EXCLUDED.deleted_at,data_through=EXCLUDED.data_through`);
  }else if(type==='branch'){
   if(p.company_id!==companyId||typeof p.name!=='string'||typeof p.is_active!=='boolean')return 'INVALID_TRUSTED_EVENT';
   const [school]=await this.store.query(tx,sql`SELECT id FROM analytics_schools WHERE id=${companyId} AND environment=${env}`);if(!school)return 'PARENT_NOT_READY';
   const [existing]=await this.store.query(tx,sql`SELECT company_id FROM analytics_branches WHERE id=${id} AND environment=${env}`);if(existing&&existing.company_id!==companyId)return 'OWNERSHIP_MISMATCH';
   await tx.execute(sql`INSERT INTO analytics_branches(id,environment,company_id,name,is_active,deleted_at,data_through) VALUES (${id},${env},${companyId},${p.name},${p.is_active},${p.deleted_at?String(p.deleted_at):null}::timestamptz,${effectiveAt}::timestamptz) ON CONFLICT(id,environment) DO UPDATE SET name=EXCLUDED.name,is_active=EXCLUDED.is_active,deleted_at=EXCLUDED.deleted_at,data_through=EXCLUDED.data_through`);
  }else if(type==='student'){
   if(p.company_id!==companyId||typeof p.branch_id!=='string')return 'INVALID_TRUSTED_EVENT';
   const [branch]=await this.store.query(tx,sql`SELECT company_id FROM analytics_branches WHERE id=${p.branch_id} AND environment=${env}`);if(!branch)return 'PARENT_NOT_READY';if(branch.company_id!==companyId)return 'OWNERSHIP_MISMATCH';
   const canonical=typeof p.billing_subject_id==='string'?p.billing_subject_id:id;
   if(canonical!==id){const [proof]=await this.store.query(tx,sql`SELECT canonical_id FROM analytics_subject_aliases WHERE source=${source} AND environment=${env} AND company_id=${companyId} AND subject_id=${id} AND effective_at<=${effectiveAt}::timestamptz AND (revoked_at IS NULL OR revoked_at>${effectiveAt}::timestamptz) ORDER BY effective_at DESC LIMIT 1`);if(proof?.canonical_id!==canonical)return 'ALIAS_NOT_VERIFIED';}
   const [existing]=await this.store.query(tx,sql`SELECT company_id FROM analytics_subjects WHERE id=${id} AND environment=${env}`);if(existing&&existing.company_id!==companyId)return 'OWNERSHIP_MISMATCH';
   await tx.execute(sql`INSERT INTO analytics_subjects(id,environment,company_id,branch_id,canonical_id,status,deleted_at,coverage_from,data_through) VALUES (${id},${env},${companyId},${p.branch_id},${canonical},${String(p.status)},${p.deleted_at?String(p.deleted_at):null}::timestamptz,${effectiveAt}::timestamptz,${effectiveAt}::timestamptz) ON CONFLICT(id,environment) DO UPDATE SET branch_id=EXCLUDED.branch_id,canonical_id=EXCLUDED.canonical_id,status=EXCLUDED.status,deleted_at=EXCLUDED.deleted_at,data_through=EXCLUDED.data_through`);
   await tx.execute(sql`INSERT INTO analytics_lifecycle(subject_id,environment,company_id,branch_id,canonical_id,status,deleted,effective_at,version) VALUES (${id},${env},${companyId},${p.branch_id},${canonical},${String(p.status)},${Boolean(p.deleted_at)},${effectiveAt}::timestamptz,${baseline?'0':record.aggregate_version}::numeric)`);
  }else if(type==='lead'&&p.lead_id){
   if(p.lead_id!==id)return 'INVALID_TRUSTED_EVENT';
   if(record.aggregate_version!=='1'&&p.company_id){const [school]=await this.store.query(tx,sql`SELECT id FROM analytics_schools WHERE id=${companyId} AND environment=${env}`);if(!school)return 'PARENT_NOT_READY';}
   await tx.execute(sql`INSERT INTO analytics_leads(id,environment,anonymous_id,company_id,properties,created_at,linked_at) VALUES (${String(p.lead_id)},${env},${p.anonymous_id?String(p.anonymous_id):null},${p.company_id?companyId:null},${JSON.stringify(p)}::jsonb,${effectiveAt}::timestamptz,${p.company_id?effectiveAt:null}::timestamptz) ON CONFLICT(id,environment) DO UPDATE SET company_id=EXCLUDED.company_id,linked_at=EXCLUDED.linked_at,properties=analytics_leads.properties||EXCLUDED.properties`);
  }else if(['usage','learning'].includes(type)){
   if(type==='learning'&&(typeof p.subject_id!=='string'||typeof p.branch_id!=='string'||typeof p.practice!=='boolean'))return 'INVALID_TRUSTED_EVENT';
   const [school]=await this.store.query(tx,sql`SELECT id FROM analytics_schools WHERE id=${companyId} AND environment=${env}`);if(!school)return 'PARENT_NOT_READY';
   if(p.branch_id){const [branch]=await this.store.query(tx,sql`SELECT company_id FROM analytics_branches WHERE id=${String(p.branch_id)} AND environment=${env}`);if(!branch)return 'PARENT_NOT_READY';if(branch.company_id!==companyId)return 'OWNERSHIP_MISMATCH';}
   if(p.subject_id){const [subject]=await this.store.query(tx,sql`SELECT company_id,branch_id FROM analytics_subjects WHERE id=${String(p.subject_id)} AND environment=${env}`);if(!subject)return 'PARENT_NOT_READY';if(subject.company_id!==companyId)return 'OWNERSHIP_MISMATCH';if(p.branch_id&&subject.branch_id!==p.branch_id){const [historical]=await this.store.query(tx,sql`SELECT properties FROM analytics_fact_versions WHERE source=${source} AND environment=${env} AND aggregate_type='student' AND aggregate_id=${String(p.subject_id)} AND effective_at<=${effectiveAt}::timestamptz ORDER BY effective_at DESC,version DESC LIMIT 1`);if((historical?.properties as Record<string,unknown>|undefined)?.branch_id!==p.branch_id)return 'OWNERSHIP_MISMATCH';}}
  }else return 'INVALID_TRUSTED_EVENT';
  return 'applied';
 }
}
