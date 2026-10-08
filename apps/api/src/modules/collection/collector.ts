import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {exactKeys,identifier,instant,object,parseEventEnvelope,type Environment,type EventEnvelope} from '@automaktab/contracts';
import {ProductStore,type ProductExecutor} from '../../db/product-store.js';

export function canonicalJson(value:unknown):string {
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson((value as Record<string,unknown>)[key])).join(',')+'}';
 return JSON.stringify(value);
}
export function contentHash(value:unknown):string{return createHash('sha256').update(canonicalJson(value)).digest('hex');}
export interface CollectionOptions {environment:Environment;trustedToken?:string;trustedSource?:string;publicSources?:string[];}
export interface AdmissionEvent {eventId:string;status:'accepted'|'duplicate'|'rejected';code?:string;}
export interface AdmissionReceipt {receiptId:string;events:AdmissionEvent[];results:AdmissionEvent[];accepted_event_ids:string[];}
const routeSegments=new Set(['',':id','pricing','about','contact','login','register','dashboard','schools','companies','branches','students','groups','attendance','payments','expenses','reports','settings','users','invoices','contracts','learning','lessons','tests','results','practice','quiz','blog','uz','ru','en','features','fleet','schedule','profile','leads','analytics','overview','traffic','acquisition','usage','funnels','courses','teachers','operators','vehicles','questions','training-programs','training-enrollments','driving-sessions','my-settlements','audit','fleet-map']);
export class CollectorService {
 constructor(readonly store:ProductStore,readonly options:CollectionOptions){}
 async acceptSnapshot(body:unknown,authorization?:string){const {SchoolService}=await import('../schools/schools.service.js');return new SchoolService(this.store,this.options).acceptSnapshot(body,authorization);}
 authorize(authorization:string|undefined,source:string,environment:string):void {
  const expected=this.options.trustedToken;
  if(!expected||source!==(this.options.trustedSource??'crm')||environment!==this.options.environment||!authorization?.startsWith('Bearer '))throw new Error('SOURCE_UNAUTHORIZED');
  const actual=createHash('sha256').update(authorization.slice(7)).digest();
  if(!timingSafeEqual(actual,createHash('sha256').update(expected).digest()))throw new Error('SOURCE_UNAUTHORIZED');
 }
 async admit(body:unknown,trust:'public'|'trusted',authorization?:string):Promise<AdmissionReceipt> {
  const batch=object(body);exactKeys(batch,['events']);
  if(!Array.isArray(batch.events)||!batch.events.length||batch.events.length>100||Buffer.byteLength(JSON.stringify(batch))>1048576)throw new Error('BATCH_LIMIT');
  if(trust==='trusted'){
   this.authorize(authorization,this.options.trustedSource??'crm',this.options.environment);
   for(const raw of batch.events){const event=object(raw);this.authorize(authorization,String(event.source),String(event.environment));}
  }
  const requestHash=contentHash(batch),results:AdmissionEvent[]=[];
  return this.store.transaction(async tx=>{
   for(const raw of batch.events as unknown[]){
    let parsed:EventEnvelope;
    try{
     parsed=parseEventEnvelope(raw,trust);
     if(trust==='public'&&typeof parsed.properties.path==='string'&&(parsed.properties.path.split('/').length>10||parsed.properties.path.split('/').some(segment=>!routeSegments.has(segment))))throw new Error('INVALID_EVENT');
     if(Date.parse(parsed.occurred_at)>Date.now()+300000||trust==='public'&&Date.parse(parsed.occurred_at)<Date.now()-7*86400000)throw new Error('INVALID_EVENT');
     for(const key of ['created_at','deleted_at'])if(parsed.properties[key]!==undefined&&parsed.properties[key]!==null)instant(parsed.properties[key]);
     for(const key of ['company_id','branch_id','subject_id','billing_subject_id','lead_id','actor_id'])if(parsed.properties[key]!==undefined&&parsed.properties[key]!==null)identifier(parsed.properties[key]);
     if(parsed.environment!==this.options.environment)throw new Error('ENVIRONMENT_MISMATCH');
     if(trust==='public'&&!(this.options.publicSources??['marketing','app','admin','crm-browser','automaktab-web','autodrive-frontend']).includes(parsed.source))throw new Error('SOURCE_UNAUTHORIZED');
    }catch(error){
     const item=typeof raw==='object'&&raw!==null&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
     let id='invalid';try{id=identifier(item.event_id);}catch{/* Invalid private payload is never retained. */}
     const code=error instanceof Error&&['ENVIRONMENT_MISMATCH','SOURCE_UNAUTHORIZED'].includes(error.message)?error.message:'INVALID_EVENT';
     if(trust==='trusted')await this.quarantine(tx,item,id,item.schema_version!==1?'UNKNOWN_SCHEMA':'INVALID_TRUSTED_EVENT');
     results.push({eventId:id,status:'rejected',code});continue;
    }
    const hash=contentHash(parsed);
    const inserted=await this.store.query(tx,sql`INSERT INTO analytics_inbox(event_id,source,environment,payload,content_hash,trust) VALUES (${parsed.event_id},${parsed.source},${parsed.environment},${JSON.stringify(parsed)}::jsonb,${hash},${trust}) ON CONFLICT(source,environment,event_id) DO NOTHING RETURNING id`);
    if(inserted.length){results.push({eventId:parsed.event_id,status:'accepted'});continue;}
    const [existing]=await this.store.query(tx,sql`SELECT content_hash FROM analytics_inbox WHERE source=${parsed.source} AND environment=${parsed.environment} AND event_id=${parsed.event_id} FOR UPDATE`);
    if(existing?.content_hash===hash)results.push({eventId:parsed.event_id,status:'duplicate'});
    else {
     if(trust==='trusted')await tx.execute(sql`UPDATE analytics_inbox SET state='quarantined',blocker='EVENT_ID_CONFLICT' WHERE source=${parsed.source} AND environment=${parsed.environment} AND event_id=${parsed.event_id}`);
     results.push({eventId:parsed.event_id,status:'rejected',code:'EVENT_ID_CONFLICT'});
    }
   }
   const receiptId=randomUUID();const result:AdmissionReceipt={receiptId,events:results,results,accepted_event_ids:results.filter(event=>event.status!=='rejected').map(event=>event.eventId)};
   const [receipt]=await this.store.query(tx,sql`INSERT INTO analytics_admission_receipts(id,source,environment,trust,request_hash,result) VALUES (${receiptId},${trust==='trusted'?this.options.trustedSource??'crm':'public'},${this.options.environment},${trust},${requestHash},${JSON.stringify(result)}::jsonb) ON CONFLICT(environment,trust,request_hash) DO UPDATE SET request_hash=EXCLUDED.request_hash RETURNING id`);
   result.receiptId=String(receipt?.id??receiptId);return result;
  });
 }
 private async quarantine(tx:ProductExecutor,item:Record<string,unknown>,id:string,blocker:string):Promise<void>{
  const minimal:Record<string,unknown>={event_id:id,name:'unknown',source:this.options.trustedSource??'crm',environment:this.options.environment};
  for(const key of ['aggregate_id','aggregate_type','aggregate_version','company_id'])try{minimal[key]=identifier(item[key]);}catch{/* Retain only safe opaque metadata. */}
  const quarantineId=id==='invalid'?randomUUID():id;
  await tx.execute(sql`INSERT INTO analytics_inbox(event_id,source,environment,payload,content_hash,trust,state,blocker) VALUES (${quarantineId},${this.options.trustedSource??'crm'},${this.options.environment},${JSON.stringify(minimal)}::jsonb,${contentHash(item)},'trusted','quarantined',${blocker}) ON CONFLICT(source,environment,event_id) DO UPDATE SET state='quarantined',blocker=EXCLUDED.blocker`);
 }
}
