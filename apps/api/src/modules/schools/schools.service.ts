import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {businessDate,exactKeys,identifier,instant,integerMoney,object,parseEventEnvelope,type Environment,type SourceRecord} from '@automaktab/contracts';
import {ProductStore,type Actor,type ProductExecutor} from '../../db/product-store.js';
import {CollectorService,contentHash,type CollectionOptions} from '../collection/collector.js';
import {SchoolProjector} from './projector.js';

export interface BasisInterval {subjectId:string;branchId:string;from:string;to:string;status:string;deleted?:boolean;demo?:boolean;}
export interface SchoolBasis {complete:boolean;blockers:string[];coverageFrom:string|null;dataThrough:string|null;checkpoint:string;intervals:BasisInterval[];}
type SourceHead={aggregate_type:string;aggregate_id:string;aggregate_version:string};
interface Snapshot {schema_version:1;source:string;environment:Environment;cutover_at:string;as_of:string;barrier_version:string;snapshot_hash:string;records:SourceRecord[];heads:SourceHead[];signal_heads:SourceHead[];baseline_records:SourceRecord[];baseline_hash:string;}
export interface SourceQuality {dataThrough:string|null;coverageFrom:string|null;status:'fresh'|'stale'|'partial';warnings:string[];}
type SourceState={manifest:Snapshot|null;records:Map<string,SourceRecord>;companies:Set<string>;global:Set<string>;warnings:Map<string,Set<string>>;dataThrough:string|null;coverageFrom:string|null};
type Fact={aggregate_type:string;aggregate_id:string;version:string;effective_at:Date;properties:Record<string,unknown>};
const iso=(value:unknown)=>new Date(value instanceof Date?value.getTime():String(value)).toISOString();
const day=(value:string)=>new Date(Date.parse(value)+5*3600000).toISOString().slice(0,10);
export function snapshotHash(records:SourceRecord[]):string{return contentHash([...records].sort((a,b)=>{const x=a.aggregate_type+':'+a.aggregate_id,y=b.aggregate_type+':'+b.aggregate_id;return x<y?-1:x>y?1:0;}));}
const headsHash=(heads:SourceHead[])=>contentHash([...heads].sort((a,b)=>(a.aggregate_type+':'+a.aggregate_id).localeCompare(b.aggregate_type+':'+b.aggregate_id)));

export class SchoolService {
 constructor(readonly store:ProductStore,readonly options:CollectionOptions={environment:'synthetic'}){}
 async acceptSnapshot(input:unknown,authorization?:string){
  const snapshot=this.parseSnapshot(input);new CollectorService(this.store,this.options).authorize(authorization,snapshot.source,snapshot.environment);
  return this.store.transaction(async tx=>{
   const companies=[...new Set(snapshot.baseline_records.concat(snapshot.records).map(record=>record.company_id))].sort();for(const company of companies)await this.store.lock(tx,company,snapshot.environment);
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'source:'+snapshot.source+':'+snapshot.environment}))`);
   const [existing]=await this.store.query(tx,sql`SELECT manifest,cutover_at,content_hash FROM analytics_barriers WHERE source=${snapshot.source} AND environment=${snapshot.environment} ORDER BY version DESC LIMIT 1 FOR UPDATE`);
   if(existing){const old=existing.manifest as Snapshot;if(iso(existing.cutover_at)!==new Date(snapshot.cutover_at).toISOString()||old.baseline_hash!==snapshot.baseline_hash)throw new Error('BASELINE_CONFLICT');}
   else {
    const projector=new SchoolProjector(this.store),order=['company','branch','student'];
    for(const record of [...snapshot.baseline_records].sort((a,b)=>order.indexOf(a.aggregate_type)-order.indexOf(b.aggregate_type))){const result=await projector.seedBaseline(tx,record,snapshot.cutover_at,snapshot.source,snapshot.environment);if(result!=='applied'&&result!=='duplicate')throw new Error('BASELINE_'+result);}
   }
   const [sameVersion]=await this.store.query(tx,sql`SELECT content_hash,manifest FROM analytics_barriers WHERE source=${snapshot.source} AND environment=${snapshot.environment} AND version=${snapshot.barrier_version}::numeric`);
   if(sameVersion){
    const old=sameVersion.manifest as Snapshot;
    if(sameVersion.content_hash!==snapshot.snapshot_hash||old.baseline_hash!==snapshot.baseline_hash||!Array.isArray(old.signal_heads)||headsHash(old.signal_heads)!==headsHash(snapshot.signal_heads))throw new Error('BARRIER_CONFLICT');
    if(Date.parse(snapshot.as_of)>Date.parse(old.as_of))await tx.execute(sql`UPDATE analytics_barriers SET as_of=${snapshot.as_of}::timestamptz,manifest=${JSON.stringify(snapshot)}::jsonb WHERE source=${snapshot.source} AND environment=${snapshot.environment} AND version=${snapshot.barrier_version}::numeric`);
   }else await tx.execute(sql`INSERT INTO analytics_barriers(id,source,environment,cutover_at,as_of,version,content_hash,manifest) VALUES (${randomUUID()},${snapshot.source},${snapshot.environment},${snapshot.cutover_at}::timestamptz,${snapshot.as_of}::timestamptz,${snapshot.barrier_version}::numeric,${snapshot.snapshot_hash},${JSON.stringify(snapshot)}::jsonb)`);
   return {accepted:true,snapshotHash:snapshot.snapshot_hash,barrierVersion:snapshot.barrier_version};
  });
 }
 private parseSnapshot(input:unknown):Snapshot {
  const raw=object(input);exactKeys(raw,['schema_version','source','environment','cutover_at','as_of','barrier_version','snapshot_hash','records','heads','signal_heads','baseline_records','baseline_hash']);
  if(raw.schema_version!==1||raw.environment!==this.options.environment||!Array.isArray(raw.records)||!Array.isArray(raw.baseline_records)||!Array.isArray(raw.heads)||!Array.isArray(raw.signal_heads)||raw.records.length>100000||raw.baseline_records.length>100000||raw.heads.length>100000||raw.signal_heads.length>100000)throw new Error('INVALID_SNAPSHOT');
  const cutover=instant(raw.cutover_at),asOf=instant(raw.as_of);if(Date.parse(cutover)>Date.parse(asOf)||Date.parse(asOf)>Date.now()+300000)throw new Error('INVALID_SNAPSHOT');
  const source=identifier(raw.source),seen=new Set<string>();
  const parseRecords=(items:unknown[],baseline:boolean)=>items.map(value=>{
   const record=object(value);exactKeys(record,['aggregate_type','aggregate_id','aggregate_version','company_id','properties']);
   if(!['company','branch','student'].includes(String(record.aggregate_type)))throw new Error('INVALID_SNAPSHOT');
   const type=record.aggregate_type as SourceRecord['aggregate_type'],version=integerMoney(record.aggregate_version);
   if(baseline&&version!=='0')throw new Error('INVALID_BASELINE');
   const key=(baseline?'baseline:':'current:')+type+':'+identifier(record.aggregate_id);if(seen.has(key))throw new Error('DUPLICATE_SNAPSHOT_RECORD');seen.add(key);
   const event=parseEventEnvelope({...record,schema_version:1,event_id:'snapshot-validation',source,environment:raw.environment,name:type+'.updated',occurred_at:asOf,effective_at:cutover,aggregate_version:'1'},'trusted');
   return {aggregate_type:type,aggregate_id:event.aggregate_id!,aggregate_version:version,company_id:event.company_id!,properties:event.properties};
  });
  const records=parseRecords(raw.records,false),baseline=parseRecords(raw.baseline_records,true);
  if(raw.snapshot_hash!==snapshotHash(records)||raw.baseline_hash!==snapshotHash(baseline))throw new Error('SNAPSHOT_HASH_MISMATCH');
  const heads=raw.heads.map(value=>{const h=object(value);exactKeys(h,['aggregate_type','aggregate_id','aggregate_version']);return {aggregate_type:identifier(h.aggregate_type),aggregate_id:identifier(h.aggregate_id),aggregate_version:integerMoney(h.aggregate_version)};});
  const signals=new Set<string>(),signalHeads=raw.signal_heads.map(value=>{const h=object(value);exactKeys(h,['aggregate_type','aggregate_id','aggregate_version']);if(!['lead','usage','learning'].includes(String(h.aggregate_type)))throw new Error('INVALID_SIGNAL_HEADS');const head={aggregate_type:String(h.aggregate_type),aggregate_id:identifier(h.aggregate_id),aggregate_version:integerMoney(h.aggregate_version)},key=head.aggregate_type+':'+head.aggregate_id;if(signals.has(key))throw new Error('INVALID_SIGNAL_HEADS');signals.add(key);return head;});
  const indexed=new Map(records.map(record=>[record.aggregate_type+':'+record.aggregate_id,record]));
  if(heads.length!==records.length||new Set(heads.map(head=>head.aggregate_type+':'+head.aggregate_id)).size!==heads.length||heads.some(head=>indexed.get(head.aggregate_type+':'+head.aggregate_id)?.aggregate_version!==head.aggregate_version))throw new Error('SOURCE_HEADS_MISMATCH');
  for(const record of records){if(record.aggregate_type==='company'&&record.aggregate_id!==record.company_id)throw new Error('OWNERSHIP_MISMATCH');if(record.aggregate_type!=='company'&&!indexed.has('company:'+record.company_id))throw new Error('MISSING_SNAPSHOT_PARENT');if(record.aggregate_type==='student'&&indexed.get('branch:'+String(record.properties.branch_id))?.company_id!==record.company_id)throw new Error('MISSING_SNAPSHOT_PARENT');}
  return {schema_version:1,source,environment:raw.environment as Environment,cutover_at:iso(cutover),as_of:iso(asOf),barrier_version:integerMoney(raw.barrier_version),snapshot_hash:String(raw.snapshot_hash),records,heads,signal_heads:signalHeads,baseline_records:baseline,baseline_hash:String(raw.baseline_hash)};
 }
 async verifyAlias(input:unknown,authorization?:string){
  const proof=object(input);exactKeys(proof,['source','environment','companyId','subjectId','canonicalId','effectiveAt','proofId']);
  new CollectorService(this.store,this.options).authorize(authorization,String(proof.source),String(proof.environment));
  const company=identifier(proof.companyId),subject=identifier(proof.subjectId),canonical=identifier(proof.canonicalId),effective=instant(proof.effectiveAt),proofId=identifier(proof.proofId);
  if(subject===canonical)throw new Error('INVALID_ALIAS_PROOF');
  return this.store.transaction(async tx=>{
   await this.store.lock(tx,company,this.options.environment);
   const [target]=await this.store.query(tx,sql`SELECT company_id,canonical_id FROM analytics_subjects WHERE id=${canonical} AND environment=${this.options.environment}`);
   if(!target||target.company_id!==company||target.canonical_id!==canonical)throw new Error('ALIAS_TARGET_NOT_CANONICAL');
   const [known]=await this.store.query(tx,sql`SELECT company_id FROM analytics_subjects WHERE id=${subject} AND environment=${this.options.environment}`);if(known&&known.company_id!==company)throw new Error('OWNERSHIP_MISMATCH');
   const [prior]=await this.store.query(tx,sql`SELECT subject_id,canonical_id,effective_at FROM analytics_subject_aliases WHERE environment=${this.options.environment} AND company_id=${company} AND proof_id=${proofId}`);
   if(prior){if(prior.subject_id!==subject||prior.canonical_id!==canonical||iso(prior.effective_at)!==new Date(effective).toISOString())throw new Error('ALIAS_PROOF_CONFLICT');return {verified:true,proofId,replayed:true};}
   await tx.execute(sql`INSERT INTO analytics_subject_aliases(source,environment,company_id,subject_id,canonical_id,effective_at,proof_id) VALUES (${String(proof.source)},${this.options.environment},${company},${subject},${canonical},${effective}::timestamptz,${proofId})`);
   await tx.execute(sql`INSERT INTO analytics_audit(actor_id,environment,company_id,operation,record_id,details) VALUES ('trusted-source',${this.options.environment},${company},'subject.alias_verified',${proofId},${JSON.stringify({subjectId:subject,canonicalId:canonical,effectiveAt:effective})}::jsonb)`);
   await tx.execute(sql`INSERT INTO billing_company_ledgers(environment,company_id,revision) VALUES (${this.options.environment},${company},1) ON CONFLICT(environment,company_id) DO UPDATE SET revision=billing_company_ledgers.revision+1`);
   return {verified:true,proofId,replayed:false};
  });
 }
 async revokeAlias(input:unknown,authorization?:string){
  const proof=object(input);exactKeys(proof,['source','environment','companyId','proofId','revokedAt']);new CollectorService(this.store,this.options).authorize(authorization,String(proof.source),String(proof.environment));
  const company=identifier(proof.companyId),id=identifier(proof.proofId),at=instant(proof.revokedAt);
  return this.store.transaction(async tx=>{await this.store.lock(tx,company,this.options.environment);const rows=await this.store.query(tx,sql`UPDATE analytics_subject_aliases SET revoked_at=${at}::timestamptz WHERE source=${String(proof.source)} AND environment=${this.options.environment} AND company_id=${company} AND proof_id=${id} AND effective_at<${at}::timestamptz AND revoked_at IS NULL RETURNING subject_id`);if(!rows.length)throw new Error('ALIAS_PROOF_NOT_FOUND');await tx.execute(sql`UPDATE billing_company_ledgers SET revision=revision+1 WHERE company_id=${company} AND environment=${this.options.environment}`);await tx.execute(sql`INSERT INTO analytics_audit(actor_id,environment,company_id,operation,record_id,details) VALUES ('trusted-source',${this.options.environment},${company},'subject.alias_revoked',${id},${JSON.stringify({revokedAt:at})}::jsonb)`);return {revoked:true};});
 }
 private read<T>(work:(tx:ProductExecutor)=>Promise<T>):Promise<T>{return this.store.transaction(async tx=>{await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`);return work(tx);});}
 private page(page:{limit?:number;cursor?:string}):number{const limit=page.limit??100;if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_REQUEST');if(page.cursor)identifier(page.cursor);return limit;}
 private async inspectSource(tx:ProductExecutor,actor:Actor):Promise<SourceState>{
  const source=this.options.trustedSource??'crm',state:SourceState={manifest:null,records:new Map(),companies:new Set(),global:new Set(),warnings:new Map(),dataThrough:null,coverageFrom:null};
  const warn=(company:string|null,code:string)=>{if(!company){state.global.add(code);return;}const warnings=state.warnings.get(company)??new Set<string>();warnings.add(code);state.warnings.set(company,warnings);};
  const [barrier]=await this.store.query(tx,sql`SELECT manifest,as_of,cutover_at,content_hash FROM analytics_barriers WHERE source=${source} AND environment=${actor.environment} ORDER BY version DESC LIMIT 1`);
  if(!barrier){state.global.add('SOURCE_BARRIER_MISSING');return state;}
  try{state.manifest=this.parseSnapshot(barrier.manifest);if(state.manifest.source!==source||state.manifest.environment!==actor.environment||state.manifest.snapshot_hash!==barrier.content_hash||iso(barrier.as_of)!==state.manifest.as_of||iso(barrier.cutover_at)!==state.manifest.cutover_at)throw new Error('INVALID_SNAPSHOT');}
  catch{state.manifest=null;state.global.add('SOURCE_MANIFEST_INVALID');return state;}
  const manifest=state.manifest;state.dataThrough=manifest.as_of;state.coverageFrom=manifest.cutover_at;
  const lifecycle=await this.store.query(tx,sql`SELECT h.aggregate_type,h.aggregate_id,h.version::text,h.company_id,f.effective_at,f.properties,f.content_hash FROM analytics_heads h LEFT JOIN analytics_fact_versions f ON f.source=h.source AND f.environment=h.environment AND f.aggregate_type=h.aggregate_type AND f.aggregate_id=h.aggregate_id AND f.version=h.version WHERE h.source=${source} AND h.environment=${actor.environment} AND h.aggregate_type IN ('company','branch','student') ORDER BY h.aggregate_type,h.aggregate_id LIMIT 100001`);
  if(lifecycle.length>100000)state.global.add('SOURCE_MANIFEST_LIMIT');
  for(const row of lifecycle){const company=String(row.company_id),key=row.aggregate_type+':'+row.aggregate_id;state.companies.add(company);if(!row.effective_at||!row.properties){warn(company,'SOURCE_HEADS_MISMATCH');continue;}const record:SourceRecord={aggregate_type:row.aggregate_type as SourceRecord['aggregate_type'],aggregate_id:String(row.aggregate_id),aggregate_version:String(row.version),company_id:company,properties:row.properties as Record<string,unknown>};state.records.set(key,record);if(row.content_hash!==contentHash({...record,effective_at:iso(row.effective_at)}))warn(company,'SOURCE_HEADS_MISMATCH');}
  const expected=new Map(manifest.records.map(record=>[record.aggregate_type+':'+record.aggregate_id,record]));
  for(const record of manifest.records){state.companies.add(record.company_id);const actual=state.records.get(record.aggregate_type+':'+record.aggregate_id);if(!actual||contentHash(actual)!==contentHash(record)){warn(record.company_id,'SOURCE_HEADS_MISMATCH');if(actual&&actual.company_id!==record.company_id)warn(actual.company_id,'SOURCE_HEADS_MISMATCH');}}
  for(const [key,record] of state.records)if(!expected.has(key))warn(record.company_id,'SOURCE_HEADS_MISMATCH');
  const pending=await this.store.query(tx,sql`SELECT payload->>'company_id' AS company_id,coalesce(blocker,'SOURCE_PENDING') AS blocker FROM analytics_inbox WHERE environment=${actor.environment} AND source=${source} AND trust='trusted' AND state<>'applied' GROUP BY payload->>'company_id',blocker LIMIT 100001`);
  if(pending.length>100000)state.global.add('SOURCE_MANIFEST_LIMIT');for(const row of pending)warn(row.company_id?String(row.company_id):null,String(row.blocker));
  const aliases=await this.store.query(tx,sql`SELECT DISTINCT ON(company_id,subject_id) company_id,subject_id,canonical_id FROM analytics_subject_aliases WHERE source=${source} AND environment=${actor.environment} AND effective_at<=${manifest.as_of}::timestamptz AND (revoked_at IS NULL OR revoked_at>${manifest.as_of}::timestamptz) ORDER BY company_id,subject_id,effective_at DESC LIMIT 100001`);
  if(aliases.length>100000)state.global.add('SOURCE_MANIFEST_LIMIT');const proofs=new Map(aliases.map(row=>[row.company_id+':'+row.subject_id,String(row.canonical_id)])),active=new Map<string,string>();
  for(const record of state.records.values())if(record.aggregate_type==='student'){
   const canonical=String(record.properties.billing_subject_id??record.aggregate_id),target=state.records.get('student:'+canonical);
   if(canonical!==record.aggregate_id&&(proofs.get(record.company_id+':'+record.aggregate_id)!==canonical||target?.company_id!==record.company_id||String(target.properties.billing_subject_id??target.aggregate_id)!==canonical))warn(record.company_id,'ALIAS_NOT_VERIFIED');
   const school=state.records.get('company:'+record.company_id),branch=state.records.get('branch:'+String(record.properties.branch_id));
   if(!school||!branch||branch.company_id!==record.company_id)warn(record.company_id,'SOURCE_HEADS_MISMATCH');
   if(record.properties.status==='active'&&!record.properties.deleted_at&&!school?.properties.deleted_at&&!school?.properties.is_demo&&!branch?.properties.deleted_at){const key=record.company_id+':'+canonical,branchId=String(record.properties.branch_id),prior=active.get(key);if(prior&&prior!==branchId)warn(record.company_id,'CANONICAL_BRANCH_CONFLICT');active.set(key,branchId);}
  }
  const signals=await this.store.query(tx,sql`SELECT aggregate_type,aggregate_id,version::text AS aggregate_version FROM analytics_heads WHERE source=${source} AND environment=${actor.environment} AND aggregate_type IN ('lead','usage','learning') ORDER BY aggregate_type,aggregate_id LIMIT 100001`);
  if(signals.length>100000)state.global.add('SOURCE_MANIFEST_LIMIT');
  if(signals.length!==manifest.signal_heads.length||headsHash(signals as SourceHead[])!==headsHash(manifest.signal_heads))state.global.add('SOURCE_SIGNAL_HEADS_MISMATCH');
  return state;
 }
 private quality(state:SourceState,companyId?:string):SourceQuality{
  const warnings=new Set(state.global);if(companyId){for(const warning of state.warnings.get(companyId)??[])warnings.add(warning);if(state.manifest&&!state.companies.has(companyId))warnings.add('SCHOOL_NOT_FOUND');}else for(const group of state.warnings.values())for(const warning of group)warnings.add(warning);
  const age=state.dataThrough?Date.now()-Date.parse(state.dataThrough):Infinity,status:SourceQuality['status']=warnings.size||age>15*60000?'partial':age>2*60000?'stale':'fresh';
  if(state.dataThrough&&age>2*60000)warnings.add('SOURCE_BARRIER_STALE');
  return {dataThrough:state.dataThrough,coverageFrom:state.coverageFrom,status,warnings:[...warnings].sort()};
 }
 private counts(state:SourceState,scope:{companyId?:string;branchId?:string}={}){
  const schools=new Set<string>(),branches=new Set<string>(),students=new Set<string>();
  for(const record of state.records.values())if(record.aggregate_type==='company'&&(!scope.companyId||record.aggregate_id===scope.companyId)&&!record.properties.is_demo&&!record.properties.deleted_at)schools.add(record.aggregate_id);
  for(const record of state.records.values())if(record.aggregate_type==='branch'&&schools.has(record.company_id)&&(!scope.branchId||record.aggregate_id===scope.branchId)&&!record.properties.deleted_at)branches.add(record.aggregate_id);
  for(const record of state.records.values())if(record.aggregate_type==='student'&&schools.has(record.company_id)&&branches.has(String(record.properties.branch_id))&&record.properties.status==='active'&&!record.properties.deleted_at)students.add(record.company_id+':'+String(record.properties.billing_subject_id??record.aggregate_id));
  const complete=this.quality(state,scope.companyId).status!=='partial';return {schools:complete?schools.size:null,branches:complete?branches.size:null,activeStudents:complete?students.size:null};
 }
 async qualitySummary(actor:Actor,scope:{companyId?:string}={}):Promise<SourceQuality>{if(scope.companyId)identifier(scope.companyId);return this.read(async tx=>this.quality(await this.inspectSource(tx,actor),scope.companyId));}
 async summary(actor:Actor,scope:{companyId?:string;branchId?:string}={}){
  if(scope.companyId)identifier(scope.companyId);if(scope.branchId){identifier(scope.branchId);if(!scope.companyId)throw new Error('INVALID_REQUEST');}
  return this.read(async tx=>{const state=await this.inspectSource(tx,actor);if(scope.companyId&&state.manifest&&!state.companies.has(scope.companyId))throw new Error('NOT_FOUND');if(scope.branchId){const branch=state.records.get('branch:'+scope.branchId)??state.manifest?.records.find(record=>record.aggregate_type==='branch'&&record.aggregate_id===scope.branchId);if(branch?.company_id!==scope.companyId)throw new Error('NOT_FOUND');}return {...this.counts(state,scope),...this.quality(state,scope.companyId)};});
 }
 async list(actor:Actor,page:{limit?:number;cursor?:string;q?:string;companyId?:string}={}){
  const limit=this.page(page);if(page.companyId)identifier(page.companyId);if(page.q!==undefined&&(typeof page.q!=='string'||page.q.length>100))throw new Error('INVALID_REQUEST');const search=(page.q??'').trim().replace(/[\\%_]/g,char=>'\\'+char);
  return this.read(async tx=>{const state=await this.inspectSource(tx,actor),rows=await this.store.query(tx,sql`SELECT s.id,s.name,s.status,s.is_demo FROM analytics_schools s WHERE s.environment=${actor.environment} AND s.id>${page.cursor??''} AND s.name ILIKE ${'%'+search+'%'} AND (${page.companyId??null}::text IS NULL OR s.id=${page.companyId??null}) AND EXISTS(SELECT 1 FROM analytics_heads h WHERE h.source=${this.options.trustedSource??'crm'} AND h.environment=s.environment AND h.aggregate_type='company' AND h.aggregate_id=s.id) ORDER BY s.id LIMIT ${limit+1}`);
   const byCompany=new Map<string,{branches:number;active:Set<string>}>();for(const record of state.records.values()){const counts=byCompany.get(record.company_id)??{branches:0,active:new Set<string>()};byCompany.set(record.company_id,counts);if(record.aggregate_type==='branch'&&!record.properties.deleted_at)counts.branches++;if(record.aggregate_type==='student'&&record.properties.status==='active'&&!record.properties.deleted_at){const school=state.records.get('company:'+record.company_id),branch=state.records.get('branch:'+String(record.properties.branch_id));if(school&&!school.properties.is_demo&&!school.properties.deleted_at&&branch?.company_id===record.company_id&&!branch.properties.deleted_at)counts.active.add(String(record.properties.billing_subject_id??record.aggregate_id));}}
   return {items:rows.slice(0,limit).map(row=>{const quality=this.quality(state,String(row.id)),counts=byCompany.get(String(row.id));return {id:String(row.id),name:String(row.name),status:String(row.status),isDemo:Boolean(row.is_demo),activeStudents:quality.status==='partial'?null:counts?.active.size??0,branchesCount:counts?.branches??0,dataThrough:quality.dataThrough};}),nextCursor:rows.length>limit?String(rows[limit-1]?.id):null};
  });
 }
 private async branchPage(tx:ProductExecutor,actor:Actor,id:string,page:{limit?:number;cursor?:string}){const limit=this.page(page),rows=await this.store.query(tx,sql`SELECT b.id,b.name,b.is_active,b.deleted_at FROM analytics_branches b WHERE b.company_id=${id} AND b.environment=${actor.environment} AND b.id>${page.cursor??''} AND EXISTS(SELECT 1 FROM analytics_heads h WHERE h.source=${this.options.trustedSource??'crm'} AND h.environment=b.environment AND h.aggregate_type='branch' AND h.aggregate_id=b.id AND h.company_id=${id}) ORDER BY b.id LIMIT ${limit+1}`);return {items:rows.slice(0,limit).map(row=>({id:String(row.id),name:String(row.name),status:row.deleted_at?'deleted':row.is_active?'active':'inactive'})),nextCursor:rows.length>limit?String(rows[limit-1]?.id):null};}
 async branches(actor:Actor,id:string,page:{limit?:number;cursor?:string}={}){identifier(id);return this.read(async tx=>{const [school]=await this.store.query(tx,sql`SELECT h.aggregate_id FROM analytics_heads h WHERE h.source=${this.options.trustedSource??'crm'} AND h.environment=${actor.environment} AND h.aggregate_type='company' AND h.aggregate_id=${id}`);if(!school)throw new Error('NOT_FOUND');return this.branchPage(tx,actor,id,page);});}
 async detail(actor:Actor,id:string){
  identifier(id);return this.read(async tx=>{const [row]=await this.store.query(tx,sql`SELECT s.name,s.status,s.is_demo FROM analytics_schools s WHERE s.id=${id} AND s.environment=${actor.environment} AND EXISTS(SELECT 1 FROM analytics_heads h WHERE h.source=${this.options.trustedSource??'crm'} AND h.environment=s.environment AND h.aggregate_type='company' AND h.aggregate_id=s.id)`);if(!row)throw new Error('NOT_FOUND');const state=await this.inspectSource(tx,actor),quality=this.quality(state,id),counts=this.counts(state,{companyId:id}),branches=await this.branchPage(tx,actor,id,{});let branchesCount=0;for(const record of state.records.values())if(record.aggregate_type==='branch'&&record.company_id===id&&!record.properties.deleted_at)branchesCount++;return {id,name:String(row.name),status:String(row.status),isDemo:Boolean(row.is_demo),activeStudents:counts.activeStudents,branchesCount,dataThrough:quality.dataThrough,branches:branches.items,branchesNextCursor:branches.nextCursor};});
 }
 async subjects(actor:Actor,id:string,page:{limit?:number;cursor?:string;branchId?:string}={}){
  await this.detail(actor,id);const limit=page.limit??100;if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('INVALID_REQUEST');
  if(page.branchId){identifier(page.branchId);const [branch]=await this.store.query(this.store.database.db,sql`SELECT id FROM analytics_branches WHERE id=${page.branchId} AND company_id=${id} AND environment=${actor.environment}`);if(!branch)throw new Error('NOT_FOUND');}
  const rows=await this.store.query(this.store.database.db,sql`SELECT id,canonical_id,branch_id,status,coverage_from,deleted_at FROM analytics_subjects WHERE company_id=${id} AND environment=${actor.environment} AND id>${page.cursor??''} AND (${page.branchId??null}::text IS NULL OR branch_id=${page.branchId??null}) ORDER BY id LIMIT ${limit+1}`);
  return {items:rows.slice(0,limit).map(row=>({id:String(row.canonical_id),sourceId:String(row.id),branchId:String(row.branch_id),status:String(row.status),eligibleFrom:day(iso(row.coverage_from)),eligibleTo:row.deleted_at?day(iso(row.deleted_at)):null})),nextCursor:rows.length>limit?String(rows[limit-1]?.id):null};
 }
 async dataStatus(actor:Actor,page:{limit?:number;cursor?:string}={}){const limit=this.page(page);return this.read(async tx=>{const state=await this.inspectSource(tx,actor),quality=this.quality(state),companies=[...state.companies].sort(),selected=companies.filter(id=>id>(page.cursor??'')),sources=selected.slice(0,limit).map(companyId=>{const current=this.quality(state,companyId);return {companyId,complete:current.status!=='partial',blockers:current.warnings,coverageFrom:current.coverageFrom,dataThrough:current.dataThrough,checkpoint:state.manifest?.barrier_version??'unknown',intervals:[]};});return {status:quality.status,complete:quality.status!=='partial',blockers:quality.warnings,sources,total:state.manifest?companies.length:null,nextCursor:selected.length>limit?selected[limit-1]??null:null};});}
 async getBasis(tx:ProductExecutor,companyId:string,from:string,to:string,environment:Environment,purpose:'active'|'fixed'='active'):Promise<SchoolBasis>{
  identifier(companyId);businessDate(from);businessDate(to);if(from>=to)throw new Error('INVALID_REQUEST');
  await this.store.lock(tx,companyId,environment);
  const blockers:string[]=[];
  const [school]=await this.store.query(tx,sql`SELECT status,is_demo,deleted_at FROM analytics_schools WHERE id=${companyId} AND environment=${environment}`);if(!school)blockers.push('SCHOOL_NOT_FOUND');else if(school.deleted_at||school.is_demo)blockers.push('SCHOOL_NOT_ELIGIBLE');
  const [barrier]=await this.store.query(tx,sql`SELECT manifest,as_of,cutover_at,content_hash FROM analytics_barriers WHERE source=${this.options.trustedSource??'crm'} AND environment=${environment} ORDER BY version DESC LIMIT 1`);
  if(!barrier)return {complete:false,blockers:[...blockers,'SOURCE_BARRIER_MISSING'],coverageFrom:null,dataThrough:null,checkpoint:'unknown',intervals:[]};
  const manifest=barrier.manifest as Snapshot,coverageFrom=iso(barrier.cutover_at),dataThrough=iso(barrier.as_of);
  if(Date.parse(dataThrough)<Date.now()-15*60*1000)blockers.push('SOURCE_BARRIER_STALE');
  if(purpose==='active'&&Date.parse(coverageFrom)>Date.parse(from+'T00:00:00+05:00'))blockers.push('COVERAGE_UNKNOWN');
  if(purpose==='active'&&Date.parse(dataThrough)<Date.parse(to+'T00:00:00+05:00'))blockers.push('SOURCE_BARRIER_BEHIND');
  const pending=await this.store.query(tx,sql`SELECT blocker,state FROM analytics_inbox WHERE environment=${environment} AND source=${manifest.source} AND trust='trusted' AND state<>'applied' AND (payload->>'company_id'=${companyId} OR NOT(payload?'company_id')) LIMIT 100`);
  for(const row of pending)blockers.push(String(row.blocker??'SOURCE_PENDING'));
  const facts=await this.store.query(tx,sql`SELECT aggregate_type,aggregate_id,version::text,effective_at,properties FROM analytics_fact_versions WHERE source=${manifest.source} AND environment=${environment} AND company_id=${companyId} ORDER BY effective_at,version`);
  const latest=new Map<string,Fact>();for(const fact of facts){const record=fact as unknown as Fact,key=record.aggregate_type+':'+record.aggregate_id,previous=latest.get(key);if(!previous||BigInt(record.version)>BigInt(previous.version))latest.set(key,record);}
  const actual:SourceRecord[]=[...latest.values()].filter(fact=>['company','branch','student'].includes(fact.aggregate_type)).map(fact=>({aggregate_type:fact.aggregate_type as SourceRecord['aggregate_type'],aggregate_id:fact.aggregate_id,aggregate_version:fact.version,company_id:companyId,properties:fact.properties}));
  const expected=manifest.records.filter(record=>record.company_id===companyId);
  if(!expected.some(record=>record.aggregate_type==='company'&&record.aggregate_id===companyId)||snapshotHash(actual)!==snapshotHash(expected))blockers.push('SOURCE_HEADS_MISMATCH');
  for(const record of actual)if(record.aggregate_type==='student'&&record.properties.billing_subject_id&&record.properties.billing_subject_id!==record.aggregate_id){
   const [proof]=await this.store.query(tx,sql`SELECT canonical_id FROM analytics_subject_aliases WHERE source=${manifest.source} AND environment=${environment} AND company_id=${companyId} AND subject_id=${record.aggregate_id} AND effective_at<=${dataThrough}::timestamptz AND (revoked_at IS NULL OR revoked_at>${dataThrough}::timestamptz) ORDER BY effective_at DESC LIMIT 1`);
   if(proof?.canonical_id!==record.properties.billing_subject_id)blockers.push('ALIAS_NOT_VERIFIED');
  }
  const intervals=this.intervals(facts as unknown as Fact[],companyId,from,to);
  const eligible=new Map<string,BasisInterval[]>();for(const interval of intervals)if(interval.status==='active'&&!interval.deleted&&!interval.demo){const list=eligible.get(interval.subjectId)??[];list.push(interval);eligible.set(interval.subjectId,list);}
  for(const group of eligible.values())for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const a=group[i]!,b=group[j]!;if(a.branchId!==b.branchId&&a.from<b.to&&b.from<a.to)blockers.push('CANONICAL_BRANCH_CONFLICT');}
  const checkpoint=contentHash({source:manifest.source,snapshotHash:manifest.snapshot_hash,baselineHash:manifest.baseline_hash,barrierVersion:manifest.barrier_version,asOf:manifest.as_of,heads:actual,intervals});
  return {complete:!blockers.length,blockers:[...new Set(blockers)],coverageFrom,dataThrough,checkpoint,intervals};
 }
 private intervals(facts:Fact[],company:string,from:string,to:string):BasisInterval[]{
  const result:BasisInterval[]=[],subjects=[...new Set(facts.filter(fact=>fact.aggregate_type==='student').map(fact=>fact.aggregate_id))],groups=new Map<string,Fact[]>();
  for(const fact of facts){const key=fact.aggregate_type+':'+fact.aggregate_id,list=groups.get(key)??[];list.push(fact);groups.set(key,list);}
  for(const list of groups.values())list.sort((a,b)=>Date.parse(iso(a.effective_at))-Date.parse(iso(b.effective_at))||(BigInt(a.version)<BigInt(b.version)?-1:BigInt(a.version)>BigInt(b.version)?1:0));
  const start=Date.parse(from+'T00:00:00+05:00'),end=Date.parse(to+'T00:00:00+05:00');
  const pick=(type:string,id:string,at:number)=>{const timeline=groups.get(type+':'+id)??[];let low=0,high=timeline.length;while(low<high){const middle=Math.floor((low+high)/2);if(Date.parse(iso(timeline[middle]!.effective_at))<=at)low=middle+1;else high=middle;}return timeline[low-1];};
  for(const subject of subjects){
   const studentHistory=groups.get('student:'+subject)??[],branches=[...new Set(studentHistory.map(fact=>String(fact.properties.branch_id)))],relevant=[...studentHistory,...(groups.get('company:'+company)??[]),...branches.flatMap(branch=>groups.get('branch:'+branch)??[])];
   const boundaries=[start,end,...relevant.map(fact=>Date.parse(iso(fact.effective_at))).filter(at=>at>start&&at<end)].sort((a,b)=>a-b);
   const unique=[...new Set(boundaries)];
   for(let i=0;i<unique.length-1;i++){
    const at=unique[i]!,until=unique[i+1]!,student=pick('student',subject,at);if(!student)continue;
    const school=pick('company',company,at),branchId=String(student.properties.branch_id),branch=pick('branch',branchId,at),a=day(new Date(at).toISOString()),b=day(new Date(until).toISOString());if(a>=b)continue;
    result.push({subjectId:String(student.properties.billing_subject_id??subject),branchId,from:a,to:b,status:String(student.properties.status),deleted:Boolean(student.properties.deleted_at)||!school||Boolean(school.properties.deleted_at)||!branch||Boolean(branch.properties.deleted_at),demo:school?.properties.is_demo===true});
   }
  }
  return result;
 }
}
