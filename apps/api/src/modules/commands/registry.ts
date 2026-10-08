import {sql} from 'drizzle-orm';
import {exactKeys,identifier,integerMoney,object,parseMoney} from '@automaktab/contracts';
import {ProductStore,type Actor} from '../../db/product-store.js';
import {AccessError} from '../auth/session.js';
import {contentHash} from '../collection/collector.js';
import {BillingService} from '../billing/billing.service.js';
type Row=Record<string,unknown>;
const fields=new Set(['action','companyId','planType','amountMinor','currency','businessTimezone','effectiveFrom','effectiveTo','cancelAt','policyRevisionId','contractId','expectedRevision','periodStart','periodEnd','amount','receivedAt','method','reference','allocations','paymentId','creditId','reason','invoiceId','type','correctedTotalMinor','asOf','dueDate','confirmed','expectedPolicyHash','previewId','expectedPreviewHash','expectedLedgerRevision']);
export class CommandRegistry {
 constructor(private readonly store:ProductStore,private readonly billing:BillingService){}
 async register(actor:Actor,key:string,path:string,input:unknown){
  identifier(key);const hash=contentHash({path,body:input});let body:Row;
  try{body=object(input);if(!path.startsWith('/billing/')||Object.keys(body).some(field=>!fields.has(field))||Buffer.byteLength(JSON.stringify(body))>32768)throw new Error('INVALID_REQUEST');
   for(const [field,value] of Object.entries(body)){
   if(field==='amount')parseMoney(value);
   else if(field==='allocations'){if(!Array.isArray(value)||value.length>100)throw new Error('INVALID_REQUEST');for(const item of value){const allocation=object(item);exactKeys(allocation,['invoiceId','amountMinor']);identifier(allocation.invoiceId);integerMoney(allocation.amountMinor);}}
   else if(field==='confirmed'){if(typeof value!=='boolean')throw new Error('INVALID_REQUEST');}
   else if(field==='expectedRevision'){if(!Number.isSafeInteger(value)||Number(value)<1)throw new Error('INVALID_REQUEST');}
   else if(value===null){if(!['reference','effectiveTo'].includes(field))throw new Error('INVALID_REQUEST');}
   else if(typeof value!=='string'||value.length>(field==='reason'?512:256)||[...value].some(character=>character.charCodeAt(0)<32))throw new Error('INVALID_REQUEST');
   }
  }catch{await this.rejectInvalid(actor,key,path,hash);throw new AccessError('INVALID_REQUEST',400);}
  const blocked=await this.store.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'http-intent-actor:'+actor.environment+':'+actor.id}))`);
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'billing-intent:'+actor.environment+':'+actor.id+':'+key}))`);
   const [prior]=await this.store.query(tx,sql`SELECT request_hash,terminal_error FROM billing_http_intents WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);
   if(prior){if(prior.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);if(prior.terminal_error){const error=prior.terminal_error as Row;throw new AccessError(String(error.code),Number(error.status));}return false;}
   const [unknown]=await this.store.query(tx,sql`SELECT i.intent_id FROM billing_http_intents i LEFT JOIN billing_commands c ON c.actor_id=i.actor_id AND c.environment=i.environment AND c.intent_id=i.intent_id WHERE i.actor_id=${actor.id} AND i.environment=${actor.environment} AND i.resolved_at IS NULL AND i.terminal_error IS NULL AND c.intent_id IS NULL LIMIT 1`);
   await tx.execute(sql`INSERT INTO billing_http_intents(actor_id,environment,intent_id,path,request_hash,body,terminal_error) VALUES(${actor.id},${actor.environment},${key},${path},${hash},${JSON.stringify(body)}::jsonb,${unknown?JSON.stringify({code:'UNKNOWN_COMMAND',status:409}):null}::jsonb)`);
   return Boolean(unknown);
  });
  if(blocked)throw new AccessError('UNKNOWN_COMMAND',409);
 }
 private async rejectInvalid(actor:Actor,key:string,path:string,hash:string){
  // Preserve a recoverable rejection without retaining any unvalidated private fields.
  await this.store.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'http-intent-actor:'+actor.environment+':'+actor.id}))`);
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'billing-intent:'+actor.environment+':'+actor.id+':'+key}))`);
   const [prior]=await this.store.query(tx,sql`SELECT request_hash FROM billing_http_intents WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);
   if(prior){if(prior.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);return;}
   await tx.execute(sql`INSERT INTO billing_http_intents(actor_id,environment,intent_id,path,request_hash,body,terminal_error) VALUES(${actor.id},${actor.environment},${key},${path},${hash},'{}'::jsonb,'{"code":"INVALID_REQUEST","status":400}'::jsonb)`);
  });
 }
 async run<T>(actor:Actor,key:string,path:string,body:unknown,work:()=>Promise<T>):Promise<T>{
  await this.register(actor,key,path,body);try{return await work();}catch(error){
   if(error instanceof Error&&'status'in error&&'code'in error&&typeof error.status==='number'&&error.status>=400&&error.status<500&&typeof error.code==='string'){
    await this.store.transaction(async tx=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'billing-intent:'+actor.environment+':'+actor.id+':'+key}))`);const [command]=await this.store.query(tx,sql`SELECT result FROM billing_commands WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);if(!command)await tx.execute(sql`UPDATE billing_http_intents SET terminal_error=${JSON.stringify({code:error.code,status:error.status})}::jsonb WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key} AND terminal_error IS NULL`);});
   }throw error;
  }
 }
 async status(actor:Actor,key:string){const result=await this.billing.commandStatus(actor,key);if(result.state!=='unknown')return result;const [row]=await this.store.query(this.store.database.db,sql`SELECT terminal_error FROM billing_http_intents WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${identifier(key)}`);return row?.terminal_error?{state:'notCommitted',...row.terminal_error as Row}:result;}
 async discover(actor:Actor){const rows=await this.store.query(this.store.database.db,sql`SELECT actor_id AS "actorId",intent_id AS key,path,body,created_at AS "createdAt" FROM billing_http_intents WHERE actor_id=${actor.id} AND environment=${actor.environment} AND resolved_at IS NULL ORDER BY created_at,intent_id LIMIT 20`);return {items:rows,nextCursor:null};}
 async acknowledge(actor:Actor,key:string){const state=await this.status(actor,key);if(!['committed','notCommitted'].includes(String(state.state)))throw new AccessError('UNKNOWN_COMMAND',409);await this.store.database.db.execute(sql`UPDATE billing_http_intents SET resolved_at=coalesce(resolved_at,now()) WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${identifier(key)}`);return {resolved:true,state:state.state};}
}
