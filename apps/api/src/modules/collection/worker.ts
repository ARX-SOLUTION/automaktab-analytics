import {sql} from 'drizzle-orm';
import {parseEventEnvelope,type Environment} from '@automaktab/contracts';
import {ProductStore,type ProductExecutor} from '../../db/product-store.js';
import {SchoolProjector} from '../schools/projector.js';
import {SchoolService} from '../schools/schools.service.js';
import type {Database} from '../../db/index.js';
import type {CollectionOptions} from './collector.js';
import {CollectorService} from './collector.js';

export interface DispatchResult {processed:number;applied:number;deferred:number;quarantined:number;}
export class WorkerDispatcher {
 constructor(readonly store:ProductStore,readonly environment:Environment,readonly projector=new SchoolProjector(store)){}
 async checkpoint(source:string,type:string,id:string){const [head]=await this.store.query(this.store.database.db,sql`SELECT version::text,company_id,effective_at FROM analytics_heads WHERE source=${source} AND environment=${this.environment} AND aggregate_type=${type} AND aggregate_id=${id}`);return head?{version:String(head.version),companyId:head.company_id===null?null:String(head.company_id),effectiveAt:new Date(String(head.effective_at)).toISOString()}:null;}
 async processBatch(limit=100):Promise<DispatchResult>{
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('BATCH_LIMIT');
  for(let attempt=0;;attempt++)try{return await this.dispatch(limit);}catch(error){
   const code=(error as {code?:string}).code;
   if(attempt>=3||!['40001','40P01'].includes(code??''))throw error;
  }
 }
 dispatchBatch(limit=100){return this.processBatch(limit);}
 private dispatch(limit:number):Promise<DispatchResult>{
  return this.store.transaction(async tx=>{
   const rows=await this.store.query(tx,sql`SELECT id,payload,trust FROM analytics_inbox WHERE environment=${this.environment} AND state='pending' ORDER BY (blocker IS NOT NULL),id LIMIT ${limit} FOR UPDATE SKIP LOCKED`);
   const companies=[...new Set(rows.map(row=>(row.payload as {company_id?:string}).company_id).filter((id):id is string=>Boolean(id)))].sort();
   for(const company of companies)await this.store.lock(tx,company,this.environment);
   const result:DispatchResult={processed:rows.length,applied:0,deferred:0,quarantined:0};
   for(const row of rows){
    let event;
    try{event=parseEventEnvelope(row.payload,row.trust==='trusted'?'trusted':'public');}catch{await this.quarantine(tx,row.id,'INVALID_STORED_EVENT');result.quarantined++;continue;}
    if(row.trust==='trusted'){
     const applied=await this.projector.apply(tx,event);
     if(['PARENT_NOT_READY','SOURCE_BASELINE_MISSING','ALIAS_NOT_VERIFIED','VERSION_GAP'].includes(applied)){
      await tx.execute(sql`UPDATE analytics_inbox SET blocker=${applied} WHERE id=${String(row.id)}::bigint`);result.deferred++;continue;
     }
     if(applied!=='applied'&&applied!=='duplicate'){await this.quarantine(tx,row.id,applied);result.quarantined++;continue;}
     if(applied==='duplicate'){await tx.execute(sql`UPDATE analytics_inbox SET state='applied',blocker=NULL,applied_at=now() WHERE id=${String(row.id)}::bigint`);result.applied++;continue;}
    }
    await tx.execute(sql`INSERT INTO analytics_events(source,environment,event_id,name,company_id,branch_id,anonymous_id,session_id,occurred_at,properties) VALUES (${event.source},${event.environment},${event.event_id},${event.name},${row.trust==='trusted'?event.company_id??null:null},${row.trust==='trusted'&&typeof event.properties.branch_id==='string'?event.properties.branch_id:null},${event.anonymous_id??null},${event.session_id??null},${event.occurred_at}::timestamptz,${JSON.stringify(event.properties)}::jsonb) ON CONFLICT(source,environment,event_id) DO NOTHING`);
    await tx.execute(sql`UPDATE analytics_inbox SET state='applied',blocker=NULL,applied_at=now() WHERE id=${String(row.id)}::bigint`);result.applied++;
   }
   return result;
  });
 }
 private async quarantine(tx:ProductExecutor,id:unknown,blocker:string){await tx.execute(sql`UPDATE analytics_inbox SET state='quarantined',blocker=${blocker},attempts=attempts+1 WHERE id=${String(id)}::bigint`);}
}
export function createCollectionRuntime(database:Database|ProductStore,options:CollectionOptions){
 const store=database instanceof ProductStore?database:new ProductStore(database);
 const collector=new CollectorService(store,options),projector=new SchoolProjector(store),schools=new SchoolService(store,options),worker=new WorkerDispatcher(store,options.environment,projector);
 return {collector,projector,schools,worker,processBatch:(limit?:number)=>worker.processBatch(limit)};
}
