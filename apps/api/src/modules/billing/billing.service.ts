import {createHash,randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import type {Contract,Environment,Money,Page,PlanType,QueryScope,Reminder} from '@automaktab/contracts';
import {ProductStore,type Actor,type ProductExecutor} from '../../db/product-store.js';
import {calculateBilling,dayNumber,type BillingInput,type BillingInterval,type BillingLine} from './domain/calculate.js';
import {annualPeriod,monthlyPeriod} from './domain/period.js';

export class BillingError extends Error {
 constructor(readonly code:string,readonly status=409){super(code);}
}
export interface BillingBasis {complete:boolean;blockers:string[];coverageFrom:string|null;dataThrough:string|null;checkpoint:string;intervals:BillingInterval[];}
export type BillingBasisProvider=(tx:ProductExecutor,companyId:string,from:string,to:string,environment:Environment,purpose?:'active'|'fixed')=>Promise<BillingBasis>;
export type BillingSchoolProvider=(tx:ProductExecutor,companyId:string,environment:Environment)=>Promise<boolean>;
interface RateRevision {effectiveFrom:string;planType:PlanType;amountMinor:string;}
export interface BillingContract extends Contract,Record<string,unknown> {anchorDate:string;rates:RateRevision[];}
export interface FinancialPreview extends Record<string,unknown> {
 previewId:string;previewHash:string;ledgerRevision:string;expiresAt:string;canCommit:boolean;blockers:string[];input:Record<string,unknown>;consequences:Record<string,unknown>;
}
export interface BillingInvoice extends Row {id:string;companyId:string;contractId:string|null;periodStart:string;periodEnd:string;totalMinor:string;correctedTotalMinor:string;outstandingMinor:string;dueDate:string;closedAt:string;lines:BillingLine[];}
export interface BillingAllocation {invoiceId:string;amountMinor:string;}
export interface BillingPayment extends Row {id:string;companyId:string;amount:Money;receivedAt:string;method:string;reference:string|null;allocatedMinor:string;unallocatedMinor:string;reversed:boolean;allocations:BillingAllocation[];}
export type BillingReadScope=Partial<QueryScope>&{cursor?:string;limit?:number};
export interface BillingCredit {companyId:string;unallocatedMinor:string;receiptCreditMinor:string;nonCashCreditMinor:string;currency:'UZS';}
export interface BillingSchoolCredit extends Row {id:string;companyId:string;invoiceId:string;contractId:string;contractRevision:number;amountMinor:string;currency:'UZS';allocatedMinor:string;unallocatedMinor:string;reason:string;createdAt:string;allocations:BillingAllocation[];}
interface ReadPage {companyId?:string;from?:string;to?:string;timezone:string;offset:number;limit:number;}
interface StoredPreview {id:string;companyId:string;operation:string;targetId:string;request:Record<string,unknown>;result:Record<string,unknown>;ledgerRevision:string;}
type Row=Record<string,unknown>;
const policy={version:'uzs-calendar-v1',currency:'UZS',scale:0,businessTimezone:'Asia/Tashkent',dayInterval:'startInclusiveStopExclusive',suspendedExcluded:true,monthlyPeriod:'calendarMonth',annualAnchor:'contractAnniversary',february29:'february28InNonLeapYear',firstFixedMonth:'calendarDayProration',newRate:'nextPeriod',rounding:'schoolTotalHalfUp',residual:'largestRemainderSubjectBranchOrder',invoiceTiming:{fixed:'advance',activeStudent:'arrears'},dueCalendarDays:7,cancellationCredit:'originalRoundedMinusCorrectedRounded',correction:'appendOnly',receiptReversal:'fullOnly',excess:'schoolCredit'} as const;
const proofKeys=['previewId','expectedPreviewHash','expectedLedgerRevision'];
function record(value:unknown):Row{if(typeof value!=='object'||value===null||Array.isArray(value))throw new BillingError('INVALID_REQUEST',400);return value as Row;}
function exactKeys(value:Row,keys:string[]){if(Object.keys(value).some(key=>!keys.includes(key)))throw new BillingError('INVALID_REQUEST',400);}
function text(value:unknown,max=160):string{if(typeof value!=='string'||!value.trim()||value.length>max)throw new BillingError('INVALID_REQUEST',400);return value.trim();}
function identifier(value:unknown):string{const result=text(value);if(!/^[a-zA-Z0-9_.:-]+$/.test(result))throw new BillingError('INVALID_REQUEST',400);return result;}
function uuid(value:unknown):string{const result=text(value);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))throw new BillingError('INVALID_REQUEST',400);return result;}
function money(value:unknown,positive=false):string{if(typeof value!=='string'||!/^(0|[1-9][0-9]{0,29})$/.test(value)||(positive&&value==='0'))throw new BillingError('INVALID_REQUEST',400);return value;}
function date(value:unknown):string{if(typeof value!=='string')throw new BillingError('INVALID_REQUEST',400);try{dayNumber(value);}catch{throw new BillingError('INVALID_REQUEST',400);}return value;}
function parseAmount(value:unknown,positive=true):Money{const amount=record(value);exactKeys(amount,['currency','minor']);if(amount.currency!=='UZS')throw new BillingError('INVALID_REQUEST',400);return {currency:'UZS',minor:money(amount.minor,positive)};}
function allocations(value:unknown):BillingAllocation[]{if(!Array.isArray(value)||value.length>100)throw new BillingError('INVALID_REQUEST',400);const seen=new Set<string>();return value.map(item=>{const allocation=record(item);exactKeys(allocation,['invoiceId','amountMinor']);const invoiceId=uuid(allocation.invoiceId);if(seen.has(invoiceId))throw new BillingError('ALLOCATION_CONFLICT');seen.add(invoiceId);return {invoiceId,amountMinor:money(allocation.amountMinor,true)};});}
function canonical(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value as Row).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
function hash(value:unknown):string{return createHash('sha256').update(canonical(value)).digest('hex');}
function iso(value:unknown):string{return value instanceof Date?value.toISOString():new Date(String(value)).toISOString();}
function addDays(value:string,days:number):string{return new Date((dayNumber(value)+days)*86400000).toISOString().slice(0,10);}
function databaseCode(error:unknown):string|undefined{let current=error;for(let depth=0;depth<4&&current&&typeof current==='object';depth++){const item=current as Row;if(typeof item.code==='string')return item.code;current=item.cause;}return undefined;}
function publicFields(value:Row):Row{
 const visible=(item:unknown):unknown=>Array.isArray(item)?item.map(visible):item&&typeof item==='object'?publicFields(item as Row):item;
 const result=Object.fromEntries(Object.entries(value).filter(([key])=>!key.startsWith('_')).map(([key,item])=>[key,visible(item)]));
 if(Array.isArray(result.lines)){result.lineCount=result.lines.length;result.linesTruncated=result.lines.length>100;result.lines=result.lines.slice(0,100);}
 return result;
}

export class BillingService {
 constructor(private readonly store:ProductStore,private readonly basis:BillingBasisProvider,private readonly clock:()=>Date=()=>new Date(),private readonly knownSchool?:BillingSchoolProvider){}
 private today():string{const values=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(this.clock()).map(part=>[part.type,part.value]));return values.year+'-'+values.month+'-'+values.day;}
 private readScope(actor:Actor,companyId:string|undefined,scope:BillingReadScope={}):ReadPage{
  if(scope.environment!==undefined&&scope.environment!==actor.environment)throw new BillingError('ENVIRONMENT_SCOPE_MISMATCH',403);
  if(scope.branchId||scope.surface)throw new BillingError('FINANCIAL_SCHOOL_SCOPE_ONLY',400);
  if(companyId&&scope.companyId&&companyId!==scope.companyId)throw new BillingError('SCHOOL_SCOPE_MISMATCH',400);
  const company=companyId||scope.companyId,from=scope.from===undefined?undefined:date(scope.from),to=scope.to===undefined?undefined:date(scope.to),timezone=scope.timezone??'Asia/Tashkent',cursor=scope.cursor??'0',limit=scope.limit??100;
  if(from&&to&&from>=to||!/^(0|[1-9][0-9]{0,6})$/.test(cursor)||!Number.isSafeInteger(limit)||limit<1||limit>100)throw new BillingError('INVALID_REQUEST',400);
  try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format(this.clock());}catch{throw new BillingError('INVALID_TIMEZONE',400);}
  return {companyId:company?identifier(company):undefined,from,to,timezone,offset:Number(cursor),limit};
 }
 private page<T>(items:T[],read:ReadPage):Page<T>{return {items:items.slice(0,read.limit),nextCursor:items.length>read.limit?String(read.offset+read.limit):null};}
 private async rows(tx:ProductExecutor,query:Parameters<ProductStore['query']>[1]):Promise<Row[]>{return this.store.query<Row>(tx,query);}
 private async lockLedger(tx:ProductExecutor,actor:Actor,companyId:string):Promise<string>{
  await this.store.lock(tx,companyId,actor.environment);
  await tx.execute(sql`INSERT INTO billing_company_ledgers(environment,company_id,revision) VALUES(${actor.environment},${companyId},0) ON CONFLICT DO NOTHING`);
  const [ledger]=await this.rows(tx,sql`SELECT revision::text FROM billing_company_ledgers WHERE environment=${actor.environment} AND company_id=${companyId} FOR UPDATE`);
  return String(ledger!.revision);
 }
 private async currentContract(tx:ProductExecutor,actor:Actor,id:string):Promise<BillingContract>{
  const [row]=await this.rows(tx,sql`SELECT r.data FROM billing_contracts c JOIN billing_contract_revisions r ON r.contract_id=c.id AND r.revision=c.current_revision WHERE c.id=${uuid(id)} AND c.environment=${actor.environment}`);
  if(!row)throw new BillingError('NOT_FOUND',404);return this.contractView(row.data as BillingContract);
 }
 private contractView(contract:BillingContract):BillingContract{const current=[...contract.rates].reverse().find(rate=>rate.effectiveFrom<=this.today())??contract.rates[0]!;return {...contract,amountMinor:current.amountMinor,scheduledRates:contract.rates.filter(rate=>rate.effectiveFrom>this.today())};}
 private async command<T extends Row>(actor:Actor,key:string,operation:string,input:Row,company:(tx:ProductExecutor)=>Promise<string>,work:(tx:ProductExecutor,companyId:string,revision:string)=>Promise<T>):Promise<T&{replayed:boolean}>{
  identifier(key);record(input);const requestHash=hash({operation,input});
  for(let attempt=0;;attempt++){
   try{
    const outcome=await this.store.transaction(async tx=>{
     await tx.execute(sql`SELECT pg_advisory_xact_lock(991104,hashtext(${'billing-intent:'+actor.environment+':'+actor.id+':'+key}))`);
     const [prior]=await this.rows(tx,sql`SELECT operation,request_hash,result FROM billing_commands WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);
     if(prior){
      if(prior.operation!==operation||prior.request_hash!==requestHash)throw new BillingError('IDEMPOTENCY_CONFLICT');
      const stored=prior.result as Row;
      if(stored.__commandState==='notCommitted')return {error:new BillingError(String(stored.code),Number(stored.status))};
      return {result:stored as T,replayed:true};
     }
     await tx.execute(sql`SAVEPOINT billing_command_work`);
     let companyId='unknown';
     try{
      companyId=await company(tx);const revision=await this.lockLedger(tx,actor,companyId);
      const result=await work(tx,companyId,revision);
      await tx.execute(sql`UPDATE billing_company_ledgers SET revision=revision+1 WHERE environment=${actor.environment} AND company_id=${companyId}`);
      await this.persistCommand(tx,actor,key,companyId,operation,requestHash,result);
      await tx.execute(sql`RELEASE SAVEPOINT billing_command_work`);
      return {result,replayed:false};
     }catch(error){
      if(!(error instanceof BillingError))throw error;
      await tx.execute(sql`ROLLBACK TO SAVEPOINT billing_command_work`);
      await this.persistCommand(tx,actor,key,companyId,operation,requestHash,{__commandState:'notCommitted',code:error.code,status:error.status});
      await tx.execute(sql`RELEASE SAVEPOINT billing_command_work`);
      return {error};
     }
    });
    if('error' in outcome)throw outcome.error;
    return {...outcome.result,replayed:outcome.replayed};
   }catch(error){
    if(attempt<2&&['40001','40P01'].includes(databaseCode(error)??'')){await new Promise(resolve=>setTimeout(resolve,10*(attempt+1)));continue;}
    throw error;
   }
  }
 }
 private async persistCommand(tx:ProductExecutor,actor:Actor,key:string,companyId:string,operation:string,requestHash:string,result:Row){
  await tx.execute(sql`INSERT INTO billing_commands(actor_id,environment,intent_id,company_id,operation,request_hash,result) VALUES(${actor.id},${actor.environment},${key},${companyId},${operation},${requestHash},${JSON.stringify(result)}::jsonb)`);
  const event=result.__commandState==='notCommitted'?{state:'notCommitted',code:result.code}:{state:'committed',result};
  await tx.execute(sql`INSERT INTO billing_audit(id,actor_id,environment,company_id,operation,intent_id,data) VALUES(${randomUUID()},${actor.id},${actor.environment},${companyId},${operation},${key},${JSON.stringify(event)}::jsonb)`);
  await tx.execute(sql`INSERT INTO billing_outbox(id,environment,company_id,event_type,data) VALUES(${randomUUID()},${actor.environment},${companyId},${operation},${JSON.stringify(event)}::jsonb)`);
 }
 async commandStatus(actor:Actor,key:string):Promise<Row>{
  identifier(key);const [row]=await this.rows(this.store.database.db,sql`SELECT operation,result FROM billing_commands WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);
  if(!row)return {state:'unknown'};
  const result=row.result as Row;return result.__commandState==='notCommitted'?{state:'notCommitted',code:result.code,status:result.status}:{state:'committed',operation:row.operation,result};
 }
 async policyStatus(actor:Actor){
  const [row]=await this.rows(this.store.database.db,sql`SELECT id,policy FROM billing_policies WHERE environment=${actor.environment} ORDER BY confirmed_at DESC,id DESC LIMIT 1`);
  return {status:row?'confirmed':'unconfirmed',revisionId:row?String(row.id):null,policy:row?row.policy:policy,policyHash:hash(row?row.policy:policy)};
 }
 async confirmPolicy(actor:Actor,input:Row,key:string){
  return this.command(actor,key,'policy.confirm',input,async()=> 'platform',async tx=>{
   exactKeys(input,['confirmed','expectedPolicyHash']);
   if(input.confirmed!==true||input.expectedPolicyHash!==hash(policy))throw new BillingError('BILLING_POLICY_UNCONFIRMED');
   const [existing]=await this.rows(tx,sql`SELECT id,policy FROM billing_policies WHERE environment=${actor.environment} ORDER BY confirmed_at DESC,id DESC LIMIT 1`);
   if(existing){if(hash(existing.policy)!==hash(policy))throw new BillingError('POLICY_REVISION_CONFLICT');return {revisionId:String(existing.id),policyHash:hash(policy),status:'confirmed'};}
   const id=randomUUID();await tx.execute(sql`INSERT INTO billing_policies(id,environment,policy,confirmed_by) VALUES(${id},${actor.environment},${JSON.stringify(policy)}::jsonb,${actor.id})`);
   return {revisionId:id,policyHash:hash(policy),status:'confirmed'};
  });
 }
 private async requirePolicy(tx:ProductExecutor,actor:Actor,id:string){const [row]=await this.rows(tx,sql`SELECT policy FROM billing_policies WHERE id=${uuid(id)} AND environment=${actor.environment}`);if(!row||hash(row.policy)!==hash(policy))throw new BillingError('BILLING_POLICY_UNCONFIRMED');}
 private async savePreview(tx:ProductExecutor,actor:Actor,companyId:string,operation:string,targetId:string,input:Row,result:Row,revision:string,blockers:string[]=[]):Promise<FinancialPreview>{
  const eligibility={canCommit:blockers.length===0,blockers:[...new Set(blockers)]},storedResult={...result,_reviewEligibility:eligibility};
  const id=randomUUID(),expiresAt=new Date(this.clock().getTime()+15*60000).toISOString(),previewHash=hash({actorId:actor.id,environment:actor.environment,companyId,operation,targetId,input,result:storedResult,ledgerRevision:revision,version:2});
  await tx.execute(sql`INSERT INTO billing_previews(id,actor_id,environment,company_id,operation,target_id,request,preview_hash,ledger_revision,expires_at,result) VALUES(${id},${actor.id},${actor.environment},${companyId},${operation},${targetId},${JSON.stringify(input)}::jsonb,${previewHash},${revision},${expiresAt},${JSON.stringify(storedResult)}::jsonb)`);
  const visible=publicFields(result);
  return {...visible,previewId:id,previewHash,ledgerRevision:revision,expiresAt,canCommit:blockers.length===0,blockers,input,consequences:visible};
 }
 private async storedPreview(tx:ProductExecutor,actor:Actor,input:Row,operation:string,revision?:string):Promise<StoredPreview>{
  const [row]=await this.rows(tx,sql`SELECT * FROM billing_previews WHERE id=${uuid(input.previewId)} AND actor_id=${actor.id} AND environment=${actor.environment} AND operation=${operation}`);
  if(!row)throw new BillingError('PREVIEW_NOT_FOUND',404);
  const staleCode=operation==='payment.reverse'?'REVERSAL_PREVIEW_STALE':operation==='payment.allocate'||operation==='schoolCredit.allocate'?'ALLOCATION_CONFLICT':operation==='invoice.correct'?'CORRECTION_PREVIEW_STALE':'PREVIEW_STALE';
  if(input.expectedPreviewHash!==row.preview_hash||String(input.expectedLedgerRevision)!==String(row.ledger_revision)||(revision!==undefined&&revision!==String(row.ledger_revision))||new Date(iso(row.expires_at)).getTime()<=this.clock().getTime())throw new BillingError(staleCode);
  const supplied=Object.fromEntries(Object.entries(input).filter(([key])=>!proofKeys.includes(key)));
  if(hash(supplied)!==hash(row.request))throw new BillingError(staleCode);
  const storedResult=row.result as Row,eligibility=storedResult._reviewEligibility as Row|undefined;
  if(!eligibility||typeof eligibility.canCommit!=='boolean'||!Array.isArray(eligibility.blockers)||eligibility.blockers.some(blocker=>typeof blocker!=='string')||eligibility.canCommit!==(eligibility.blockers.length===0))throw new BillingError(staleCode);
  if(hash({actorId:actor.id,environment:actor.environment,companyId:String(row.company_id),operation,targetId:String(row.target_id),input:row.request,result:storedResult,ledgerRevision:String(row.ledger_revision),version:2})!==row.preview_hash)throw new BillingError(staleCode);
  if(revision!==undefined&&!eligibility.canCommit)throw new BillingError(eligibility.blockers[0] as string??'PREVIEW_BLOCKED');
  const result=Object.fromEntries(Object.entries(storedResult).filter(([name])=>name!=='_reviewEligibility'));
  return {id:String(row.id),companyId:String(row.company_id),operation:String(row.operation),targetId:String(row.target_id),request:row.request as Row,result,ledgerRevision:String(row.ledger_revision)};
 }
 private async reviewed<T extends Row>(actor:Actor,key:string,operation:string,input:Row,work:(tx:ProductExecutor,preview:StoredPreview)=>Promise<T>):Promise<T&{replayed:boolean}>{
  return this.command(actor,key,operation,input,async tx=>(await this.storedPreview(tx,actor,input,operation)).companyId,async(tx,_companyId,revision)=>work(tx,await this.storedPreview(tx,actor,input,operation,revision)));
 }
 async previewContract(actor:Actor,input:Row):Promise<FinancialPreview>{
  if(input.action==='revise'||input.action==='cancel'){
   exactKeys(input,input.action==='revise'?['action','contractId','expectedRevision','amountMinor','effectiveFrom']:['action','contractId','expectedRevision','cancelAt','reason']);
   const id=uuid(input.contractId);if(!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<1)throw new BillingError('INVALID_REQUEST',400);
   const request=input.action==='revise'?{action:'revise',contractId:id,expectedRevision:Number(input.expectedRevision),amountMinor:money(input.amountMinor),effectiveFrom:date(input.effectiveFrom)}:{action:'cancel',contractId:id,expectedRevision:Number(input.expectedRevision),cancelAt:date(input.cancelAt),reason:text(input.reason,512)};
   return this.store.transaction(async tx=>{const initial=await this.currentContract(tx,actor,id),revision=await this.lockLedger(tx,actor,initial.companyId),result=await this.contractChangeConsequences(tx,actor,id,request);return this.savePreview(tx,actor,initial.companyId,'contract.'+String(request.action),id,request,result,revision,result.blockers as string[]);});
  }
  if(input.action==='confirm'){
   exactKeys(input,['action','contractId','expectedRevision']);const id=uuid(input.contractId);
   if(!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<1)throw new BillingError('INVALID_REQUEST',400);
   return this.store.transaction(async tx=>{
    const initial=await this.currentContract(tx,actor,id),revision=await this.lockLedger(tx,actor,initial.companyId),current=await this.currentContract(tx,actor,id);
    if(current.revision!==input.expectedRevision)throw new BillingError('CONTRACT_REVISION_CONFLICT');
    if(current.status!=='draft')throw new BillingError('CONTRACT_STATE_CONFLICT');
    await this.requirePolicy(tx,actor,current.policyRevisionId);await this.requireSchool(tx,actor,current.companyId);
    await this.requireNoOverlap(tx,actor,current);
    const contract={...current,status:'active' as const,revision:current.revision+1};
    return this.savePreview(tx,actor,current.companyId,'contract.confirm',id,{action:'confirm',contractId:id,expectedRevision:current.revision},{contract},revision);
   });
  }
  exactKeys(input,['action','companyId','planType','amountMinor','currency','businessTimezone','effectiveFrom','effectiveTo','policyRevisionId']);
  if(input.action!=='create'||!['fixed_monthly','fixed_annual','active_student'].includes(String(input.planType))||input.currency!=='UZS'||input.businessTimezone!=='Asia/Tashkent')throw new BillingError('INVALID_REQUEST',400);
  const companyId=identifier(input.companyId),effectiveFrom=date(input.effectiveFrom),effectiveTo=input.effectiveTo===undefined||input.effectiveTo===null?null:date(input.effectiveTo);
  if(effectiveTo!==null&&effectiveTo<=effectiveFrom)throw new BillingError('CONTRACT_PERIOD_CONFLICT');
  const request={action:'create',companyId,planType:input.planType as PlanType,amountMinor:money(input.amountMinor),currency:'UZS',businessTimezone:'Asia/Tashkent',effectiveFrom,effectiveTo,policyRevisionId:uuid(input.policyRevisionId)};
  return this.store.transaction(async tx=>{
   const revision=await this.lockLedger(tx,actor,companyId);await this.requirePolicy(tx,actor,request.policyRevisionId);
   const source=await this.basis(tx,companyId,this.today(),addDays(this.today(),1),actor.environment,'fixed');
   if(!source.complete)throw new BillingError('SOURCE_NOT_READY');
   const id=randomUUID(),contract:BillingContract={...request,id,revision:1,status:'draft',currency:'UZS',businessTimezone:'Asia/Tashkent',anchorDate:effectiveFrom,rates:[{effectiveFrom,planType:request.planType,amountMinor:request.amountMinor}]};
   return this.savePreview(tx,actor,companyId,'contract.create',id,request,{contract},revision);
  });
 }
 async createContract(actor:Actor,input:Row,key:string){
  return this.reviewed(actor,key,'contract.create',input,async(tx,preview)=>{
   const contract=preview.result.contract as BillingContract;await this.requirePolicy(tx,actor,contract.policyRevisionId);
   await tx.execute(sql`INSERT INTO billing_contracts(id,environment,company_id,current_revision) VALUES(${contract.id},${actor.environment},${contract.companyId},1)`);
   await this.appendContract(tx,actor,contract);return contract;
  });
 }
 private async appendContract(tx:ProductExecutor,actor:Actor,contract:BillingContract){await tx.execute(sql`INSERT INTO billing_contract_revisions(contract_id,revision,data,created_by) VALUES(${contract.id},${contract.revision},${JSON.stringify(contract)}::jsonb,${actor.id})`);}
 private async requireSchool(tx:ProductExecutor,actor:Actor,companyId:string){const source=await this.basis(tx,companyId,this.today(),addDays(this.today(),1),actor.environment,'fixed');if(!source.complete)throw new BillingError('SOURCE_NOT_READY');}
 private async requireKnownSchool(tx:ProductExecutor,actor:Actor,companyId:string){
  if(this.knownSchool){if(!await this.knownSchool(tx,companyId,actor.environment))throw new BillingError('SCHOOL_NOT_FOUND',404);return;}
  const [existing]=await this.rows(tx,sql`SELECT id FROM billing_invoices WHERE environment=${actor.environment} AND company_id=${companyId} LIMIT 1`);if(existing)return;
  const source=await this.basis(tx,companyId,this.today(),addDays(this.today(),1),actor.environment,'fixed');if(!source.complete)throw new BillingError('SCHOOL_NOT_FOUND',404);
 }
 private async requireNoOverlap(tx:ProductExecutor,actor:Actor,contract:BillingContract){
  const rows=await this.rows(tx,sql`SELECT r.data FROM billing_contracts c JOIN billing_contract_revisions r ON r.contract_id=c.id AND r.revision=c.current_revision WHERE c.environment=${actor.environment} AND c.company_id=${contract.companyId} AND c.id<>${contract.id}`);
  for(const row of rows){const other=row.data as BillingContract;if(other.status!=='draft'&&contract.effectiveFrom<(other.effectiveTo??'9999-12-31')&&other.effectiveFrom<(contract.effectiveTo??'9999-12-31'))throw new BillingError('CONTRACT_OVERLAP');}
 }
 async confirmContract(actor:Actor,id:string,input:Row,key:string){
  if(input.contractId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'contract.confirm',input,async(tx,preview)=>{
   const current=await this.currentContract(tx,actor,id),next=preview.result.contract as BillingContract;
   if(current.revision!==preview.request.expectedRevision||current.status!=='draft')throw new BillingError('CONTRACT_REVISION_CONFLICT');
   await this.requirePolicy(tx,actor,current.policyRevisionId);await this.requireSchool(tx,actor,current.companyId);await this.requireNoOverlap(tx,actor,next);
   await this.appendContract(tx,actor,next);await tx.execute(sql`UPDATE billing_contracts SET current_revision=${next.revision} WHERE id=${id} AND current_revision=${current.revision}`);return next;
  });
 }
 private async contractChangeConsequences(tx:ProductExecutor,actor:Actor,id:string,input:Row):Promise<Row>{
  const current=await this.currentContract(tx,actor,id);if(current.revision!==input.expectedRevision)throw new BillingError('CONTRACT_REVISION_CONFLICT');if(current.status!=='active')throw new BillingError('CONTRACT_STATE_CONFLICT');await this.requirePolicy(tx,actor,current.policyRevisionId);
  if(input.action==='revise'){
   const reference=this.today()>current.effectiveFrom?this.today():current.effectiveFrom,nextPeriod=current.planType==='fixed_annual'?annualPeriod(current.anchorDate,reference):monthlyPeriod(reference),effectiveFrom=String(input.effectiveFrom);
   if(effectiveFrom!==nextPeriod.periodEnd||current.effectiveTo&&effectiveFrom>=current.effectiveTo)throw new BillingError('RATE_EFFECTIVE_DATE_INVALID');
   const rate={effectiveFrom,planType:current.planType,amountMinor:String(input.amountMinor)},rates=[...current.rates.filter(item=>item.effectiveFrom<effectiveFrom),rate],contract=this.contractView({...current,rates,revision:current.revision+1});
   return {contract,scheduledRates:[rate],blockers:[]};
  }
  const cancelAt=String(input.cancelAt);if(cancelAt<current.effectiveFrom||current.effectiveTo&&cancelAt>current.effectiveTo)throw new BillingError('CANCELLATION_DATE_INVALID');
  const contract=this.contractView({...current,status:'cancelled',effectiveTo:cancelAt,revision:current.revision+1,cancellationReason:input.reason}),blockers:string[]=[],corrections:Row[]=[];
  const affected=await this.rows(tx,sql`SELECT id FROM billing_invoices WHERE environment=${actor.environment} AND contract_id=${id} AND period_end>${cancelAt}::date ORDER BY period_start,id LIMIT 101`);
  if(affected.length>100)blockers.push('CANCELLATION_REVIEW_LIMIT');
  for(const item of affected.slice(0,100)){
   const invoiceId=String(item.id),[row]=await this.invoiceRows(tx,actor,undefined,invoiceId),invoice=this.invoiceView(row!);
   const frozen=(row!.snapshot as Row)._calculationInput as BillingInput|undefined;if(!frozen){blockers.push('INVOICE_BASIS_NOT_RECONCILABLE');continue;}
   const shortened=calculateBilling({...frozen,contractTo:frozen.contractTo&&frozen.contractTo<cancelAt?frozen.contractTo:cancelAt}),unused=BigInt(invoice.totalMinor)-BigInt(shortened.totalMinor);
   if(unused<0n)throw new BillingError('LEDGER_INVARIANT_FAILED',500);if(unused===0n)continue;
   const before=BigInt(invoice.correctedTotalMinor),applied=unused<before?unused:before,excess=unused-applied;
   const correctionInput={invoiceId,type:'credit',correctedTotalMinor:(before-applied).toString(),reason:String(input.reason)},consequences=await this.correctionConsequences(tx,actor,invoiceId,correctionInput,true);
   corrections.push({...consequences,invoiceId,originalRoundedMinor:invoice.totalMinor,shortenedRoundedMinor:shortened.totalMinor,unusedCreditMinor:unused.toString(),creditDeltaMinor:unused.toString(),appliedCreditMinor:applied.toString(),excessCreditMinor:excess.toString(),nonCashCreditIncreaseMinor:(BigInt(String(consequences.nonCashCreditIncreaseMinor))+excess).toString(),creditIncreaseMinor:(BigInt(String(consequences.creditIncreaseMinor))+excess).toString(),_input:correctionInput});
  }
  return {contract,cancelAt,reason:input.reason,corrections,creditDeltaMinor:corrections.reduce((sum,item)=>sum+BigInt(String(item.creditDeltaMinor)),0n).toString(),creditIncreaseMinor:corrections.reduce((sum,item)=>sum+BigInt(String(item.creditIncreaseMinor)),0n).toString(),blockers:[...new Set(blockers)]};
 }
 private async changeContract(actor:Actor,id:string,input:Row,key:string,operation:'revise'|'cancel'):Promise<BillingContract&{replayed:boolean}>{
  if(input.contractId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'contract.'+operation,input,async(tx,preview)=>{
   const result=await this.contractChangeConsequences(tx,actor,id,preview.request);if((result.blockers as string[]).length)throw new BillingError((result.blockers as string[])[0]!);if(hash(result)!==hash(preview.result))throw new BillingError('PREVIEW_STALE');
   const next=result.contract as BillingContract,correctionIds:string[]=[],schoolCreditIds:string[]=[];
   for(const correction of (result.corrections??[]) as Row[])correctionIds.push(await this.appendCorrection(tx,actor,preview.companyId,String(correction.invoiceId),correction._input as Row,correction,preview.ledgerRevision));
   await this.appendContract(tx,actor,next);await tx.execute(sql`UPDATE billing_contracts SET current_revision=${next.revision} WHERE id=${id} AND current_revision=${Number(preview.request.expectedRevision)}`);
   for(const correction of (result.corrections??[]) as Row[]){if(correction.excessCreditMinor==='0')continue;const creditId=randomUUID();await tx.execute(sql`INSERT INTO billing_school_credit_entries(id,environment,company_id,invoice_id,contract_id,contract_revision,amount_minor,reason) VALUES(${creditId},${actor.environment},${preview.companyId},${String(correction.invoiceId)},${id},${next.revision},${String(correction.excessCreditMinor)},${String(preview.request.reason)})`);schoolCreditIds.push(creditId);}
   return {...next,...(operation==='cancel'?{correctionIds,schoolCreditIds,creditDeltaMinor:result.creditDeltaMinor,creditIncreaseMinor:result.creditIncreaseMinor}:{scheduledRates:result.scheduledRates as RateRevision[]})};
  });
 }
 reviseContract(actor:Actor,id:string,input:Row,key:string){return this.changeContract(actor,id,input,key,'revise');}
 cancelContract(actor:Actor,id:string,input:Row,key:string){return this.changeContract(actor,id,input,key,'cancel');}
 private async invoiceRows(tx:ProductExecutor,actor:Actor,companyId?:string,id?:string,summary=false,oldest=false,overdue=false,scope:BillingReadScope={},extra=false):Promise<Row[]>{
  const read=this.readScope(actor,companyId,scope);
  return this.rows(tx,sql`SELECT i.id,i.company_id,i.contract_id,to_char(i.period_start,'YYYY-MM-DD') AS period_start,to_char(i.period_end,'YYYY-MM-DD') AS period_end,i.total_minor::text,to_char(i.due_date,'YYYY-MM-DD') AS due_date,i.closed_at,i.kind,${summary?sql`i.snapshot-'_calculationInput'-'lines'`:sql`i.snapshot`} AS snapshot,jsonb_array_length(i.snapshot->'lines') AS line_count,COALESCE((SELECT sum(c.delta_minor) FROM billing_corrections c WHERE c.invoice_id=i.id),0)::text AS correction_minor,(COALESCE((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.invoice_id=i.id),0)+COALESCE((SELECT sum(g.amount_minor) FROM billing_school_credit_allocations g WHERE g.invoice_id=i.id),0))::text AS allocated_minor,COALESCE((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.invoice_id=i.id),0)::text AS receipt_allocated_minor,COALESCE((SELECT sum(g.amount_minor) FROM billing_school_credit_allocations g WHERE g.invoice_id=i.id),0)::text AS credit_allocated_minor FROM billing_invoices i WHERE i.environment=${actor.environment} ${read.companyId?sql`AND i.company_id=${read.companyId}`:sql``} ${read.from?sql`AND i.period_start>=${read.from}::date`:sql``} ${read.to?sql`AND i.period_start<${read.to}::date`:sql``} ${id?sql`AND i.id=${uuid(id)}`:sql``} ${overdue?sql`AND i.due_date<${this.today()}::date AND i.total_minor+COALESCE((SELECT sum(c.delta_minor) FROM billing_corrections c WHERE c.invoice_id=i.id),0)-COALESCE((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.invoice_id=i.id),0)-COALESCE((SELECT sum(g.amount_minor) FROM billing_school_credit_allocations g WHERE g.invoice_id=i.id),0)>0`:sql``} ORDER BY ${oldest?sql`i.due_date ASC,i.period_start ASC,i.closed_at ASC,i.id ASC`:sql`i.closed_at DESC,i.id DESC`} LIMIT ${read.limit+(extra?1:0)} OFFSET ${read.offset}`);
 }
 private invoiceView(row:Row):BillingInvoice{
  const total=BigInt(String(row.total_minor)),corrected=total+BigInt(String(row.correction_minor)),allocated=BigInt(String(row.allocated_minor));
  const snapshot=publicFields(row.snapshot as Row),lines=(snapshot.lines??[]) as BillingLine[];
  return {...snapshot,id:String(row.id),companyId:String(row.company_id),contractId:row.contract_id===null?null:String(row.contract_id),periodStart:String(row.period_start),periodEnd:String(row.period_end),currency:'UZS',totalMinor:total.toString(),correctedTotalMinor:corrected.toString(),outstandingMinor:(corrected>allocated?corrected-allocated:0n).toString(),allocatedMinor:allocated.toString(),receiptAllocatedMinor:String(row.receipt_allocated_minor),creditAllocatedMinor:String(row.credit_allocated_minor),dueDate:String(row.due_date),closedAt:iso(row.closed_at),kind:String(row.kind),lineCount:Number(row.line_count??lines.length),lines};
 }
 async listInvoices(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<BillingInvoice[]>{return (await this.invoiceRows(this.store.database.db,actor,companyId,undefined,true,false,false,scope)).map(row=>this.invoiceView(row));}
 async listInvoicesPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<BillingInvoice>>{const read=this.readScope(actor,companyId,scope),rows=await this.invoiceRows(this.store.database.db,actor,companyId,undefined,true,false,false,scope,true);return this.page(rows.map(row=>this.invoiceView(row)),read);}
 async getInvoice(actor:Actor,id:string):Promise<BillingInvoice>{const [row]=await this.invoiceRows(this.store.database.db,actor,undefined,id);if(!row)throw new BillingError('NOT_FOUND',404);return this.invoiceView(row);}
 async getInvoiceLines(actor:Actor,id:string,input:{cursor?:string;limit?:number}={}){
  const read=this.readScope(actor,undefined,input),[row]=await this.rows(this.store.database.db,sql`SELECT COALESCE(jsonb_array_length(i.snapshot->'lines'),0) AS total,COALESCE((SELECT jsonb_agg(entry.value ORDER BY entry.ordinality) FROM jsonb_array_elements(i.snapshot->'lines') WITH ORDINALITY entry(value,ordinality) WHERE entry.ordinality>${read.offset} AND entry.ordinality<=${read.offset+read.limit}),'[]'::jsonb) AS lines FROM billing_invoices i WHERE i.id=${uuid(id)} AND i.environment=${actor.environment}`);
  if(!row)throw new BillingError('NOT_FOUND',404);return {items:row.lines as BillingLine[],nextCursor:read.offset+read.limit<Number(row.total)?String(read.offset+read.limit):null,total:Number(row.total)};
 }
 async getInvoicePreviewLines(actor:Actor,id:string,input:{cursor?:string;limit?:number}={}){
  const read=this.readScope(actor,undefined,input),[row]=await this.rows(this.store.database.db,sql`SELECT COALESCE(jsonb_array_length(p.result->'lines'),0) AS total,COALESCE((SELECT jsonb_agg(entry.value ORDER BY entry.ordinality) FROM jsonb_array_elements(p.result->'lines') WITH ORDINALITY entry(value,ordinality) WHERE entry.ordinality>${read.offset} AND entry.ordinality<=${read.offset+read.limit}),'[]'::jsonb) AS lines FROM billing_previews p WHERE p.id=${uuid(id)} AND p.actor_id=${actor.id} AND p.environment=${actor.environment} AND p.operation='invoice.close'`);
  if(!row)throw new BillingError('NOT_FOUND',404);return {items:row.lines as BillingLine[],nextCursor:read.offset+read.limit<Number(row.total)?String(read.offset+read.limit):null,total:Number(row.total)};
 }
 private async invoiceBasis(tx:ProductExecutor,actor:Actor,id:string,input:Row):Promise<Row>{
  const contract=await this.currentContract(tx,actor,id),periodStart=date(input.periodStart),periodEnd=date(input.periodEnd);
  const rate=[...contract.rates].reverse().find(item=>item.effectiveFrom<=periodStart)??contract.rates[0]!;
  let period;try{period=rate.planType==='fixed_annual'?annualPeriod(contract.anchorDate,periodStart):monthlyPeriod(periodStart);}catch{throw new BillingError('INVALID_BILLING_PERIOD',400);}
  if(period.periodStart!==periodStart||period.periodEnd!==periodEnd)throw new BillingError('INVALID_BILLING_PERIOD',400);
  const start=periodStart>contract.effectiveFrom?periodStart:contract.effectiveFrom,end=contract.effectiveTo&&contract.effectiveTo<periodEnd?contract.effectiveTo:periodEnd;
  const blockers:string[]=[];if(contract.status==='draft')blockers.push('CONTRACT_NOT_ACTIVE');if(start>=end)blockers.push('PERIOD_OUTSIDE_CONTRACT');
  if(rate.planType==='active_student'?periodEnd>this.today():start>this.today())blockers.push(rate.planType==='active_student'?'PERIOD_NOT_FINISHED':'PERIOD_NOT_STARTED');
  await this.requirePolicy(tx,actor,contract.policyRevisionId);
  const source=await this.basis(tx,contract.companyId,start,end,actor.environment,rate.planType==='active_student'?'active':'fixed');
  if(!source.complete)blockers.push('SOURCE_NOT_READY',...source.blockers);
  const [closed]=await this.rows(tx,sql`SELECT id FROM billing_invoices WHERE environment=${actor.environment} AND contract_id=${id} AND period_start=${periodStart} AND period_end=${periodEnd}`);
  if(closed)blockers.push('PERIOD_ALREADY_CLOSED');
  const calculationInput:BillingInput={planType:rate.planType,amountMinor:rate.amountMinor,contractFrom:contract.effectiveFrom,contractTo:contract.effectiveTo,periodStart,periodEnd,intervals:source.intervals};
  let calculation;try{calculation=calculateBilling(calculationInput);}catch(error){throw new BillingError(error instanceof Error?error.message:'BILLING_BASIS_CONFLICT',400);}
  const representable=calculation.totalMinor.length<=30;if(source.complete&&!representable)blockers.push('BILLING_AMOUNT_OVERFLOW');
  return {contractId:id,companyId:contract.companyId,periodStart,periodEnd,currency:'UZS',totalMinor:source.complete&&representable?calculation.totalMinor:null,lines:source.complete?calculation.lines:[],contractRevision:contract.revision,policyRevisionId:contract.policyRevisionId,sourceCheckpoint:source.checkpoint,coverageFrom:source.coverageFrom,dataThrough:source.dataThrough,canClose:blockers.length===0,blockers:[...new Set(blockers)],...(closed?{existingInvoiceId:String(closed.id)}:{}),_calculationInput:calculationInput};
 }
 async previewInvoice(actor:Actor,id:string,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['contractId','periodStart','periodEnd']);if(input.contractId!==undefined&&input.contractId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.store.transaction(async tx=>{const contract=await this.currentContract(tx,actor,id),revision=await this.lockLedger(tx,actor,contract.companyId),result=await this.invoiceBasis(tx,actor,id,input);return this.savePreview(tx,actor,contract.companyId,'invoice.close',id,{contractId:id,periodStart:date(input.periodStart),periodEnd:date(input.periodEnd)},result,revision,result.blockers as string[]);});
 }
 async closeInvoice(actor:Actor,id:string,input:Row,key:string){
  if(input.contractId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'invoice.close',input,async(tx,preview)=>{
   const result=await this.invoiceBasis(tx,actor,id,preview.request);
   if(!result.canClose)throw new BillingError((result.blockers as string[])[0]??'SOURCE_NOT_READY');
   if(hash(result)!==hash(preview.result))throw new BillingError('PREVIEW_STALE');
   const invoiceId=randomUUID(),dueDate=addDays(this.today(),7),closedAt=this.clock().toISOString(),snapshot={...result,previewHash:input.expectedPreviewHash,dueDate,closedAt};
   await tx.execute(sql`INSERT INTO billing_invoices(id,environment,company_id,contract_id,period_start,period_end,total_minor,due_date,closed_at,snapshot) VALUES(${invoiceId},${actor.environment},${preview.companyId},${id},${String(result.periodStart)},${String(result.periodEnd)},${String(result.totalMinor)},${dueDate},${closedAt},${JSON.stringify(snapshot)}::jsonb)`);
   const [row]=await this.invoiceRows(tx,actor,undefined,invoiceId);return this.invoiceView(row!);
  });
 }
 private async openingConsequences(tx:ProductExecutor,actor:Actor,input:Row,id:string):Promise<Row>{
  const companyId=String(input.companyId),amount=input.amount as Money;
  const [existing]=await this.rows(tx,sql`SELECT id FROM billing_invoices WHERE environment=${actor.environment} AND company_id=${companyId} AND kind='opening'`);
  const [policyRow]=await this.rows(tx,sql`SELECT id FROM billing_policies WHERE environment=${actor.environment} ORDER BY confirmed_at DESC,id DESC LIMIT 1`);
  if(!policyRow)throw new BillingError('BILLING_POLICY_UNCONFIRMED');await this.requirePolicy(tx,actor,String(policyRow.id));
  return {invoice:{id,companyId,contractId:null,kind:'opening',periodStart:input.asOf,periodEnd:addDays(String(input.asOf),1),totalMinor:amount.minor,correctedTotalMinor:amount.minor,outstandingMinor:amount.minor,dueDate:input.dueDate,lines:[],currency:'UZS'},asOf:input.asOf,reason:input.reason,confirmedBy:actor.id,policyRevisionId:String(policyRow.id),blockers:existing?['OPENING_BALANCE_ALREADY_RECORDED']:[],...(existing?{existingInvoiceId:String(existing.id)}:{})};
 }
 async previewOpeningBalance(actor:Actor,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['companyId','amount','asOf','dueDate','reason']);
  const request={companyId:identifier(input.companyId),amount:parseAmount(input.amount,false),asOf:date(input.asOf),dueDate:date(input.dueDate),reason:text(input.reason,512)};
  if(request.asOf>this.today())throw new BillingError('OPENING_BALANCE_DATE_INVALID',400);
  return this.store.transaction(async tx=>{const revision=await this.lockLedger(tx,actor,request.companyId);await this.requireKnownSchool(tx,actor,request.companyId);const id=randomUUID(),result=await this.openingConsequences(tx,actor,request,id);return this.savePreview(tx,actor,request.companyId,'opening.record',id,request,result,revision,result.blockers as string[]);});
 }
 async recordOpeningBalance(actor:Actor,input:Row,key:string){
  return this.reviewed(actor,key,'opening.record',input,async(tx,preview)=>{
   await this.requireKnownSchool(tx,actor,preview.companyId);
   const result=await this.openingConsequences(tx,actor,preview.request,preview.targetId);if((result.blockers as string[]).length)throw new BillingError('OPENING_BALANCE_ALREADY_RECORDED');if(hash(result)!==hash(preview.result))throw new BillingError('PREVIEW_STALE');
   const invoice=result.invoice as Row,closedAt=this.clock().toISOString(),snapshot={...invoice,...result,lines:[],closedAt,opening:true,contractRevision:null,sourceCheckpoint:'ownerConfirmedOpening',coverageFrom:null,dataThrough:null,canClose:false,previewHash:input.expectedPreviewHash};
   await tx.execute(sql`INSERT INTO billing_invoices(id,environment,company_id,contract_id,period_start,period_end,total_minor,due_date,closed_at,snapshot,kind) VALUES(${preview.targetId},${actor.environment},${preview.companyId},NULL,${String(invoice.periodStart)},${String(invoice.periodEnd)},${String(invoice.totalMinor)},${String(invoice.dueDate)},${closedAt},${JSON.stringify(snapshot)}::jsonb,'opening')`);
   const [row]=await this.invoiceRows(tx,actor,undefined,preview.targetId);return this.invoiceView(row!);
  });
 }
 private async paymentRows(tx:ProductExecutor,actor:Actor,companyId?:string,id?:string,scope:BillingReadScope={},extra=false):Promise<Row[]>{
  const read=this.readScope(actor,companyId,scope);
  return this.rows(tx,sql`SELECT p.id,p.company_id,p.amount_minor::text,p.received_at,p.method,p.reference,EXISTS(SELECT 1 FROM billing_reversals r WHERE r.payment_id=p.id) AS reversed,COALESCE((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.payment_id=p.id),0)::text AS allocated_minor,COALESCE((SELECT jsonb_agg(jsonb_build_object('invoiceId',active.invoice_id,'amountMinor',active.amount_minor::text) ORDER BY active.invoice_id) FROM (SELECT a.invoice_id,sum(a.amount_minor) AS amount_minor FROM billing_allocations a WHERE a.payment_id=p.id GROUP BY a.invoice_id HAVING sum(a.amount_minor)>0) active),'[]'::jsonb) AS allocations FROM billing_receipts p WHERE p.environment=${actor.environment} ${read.companyId?sql`AND p.company_id=${read.companyId}`:sql``} ${read.from?sql`AND (p.received_at AT TIME ZONE ${read.timezone})::date>=${read.from}::date`:sql``} ${read.to?sql`AND (p.received_at AT TIME ZONE ${read.timezone})::date<${read.to}::date`:sql``} ${id?sql`AND p.id=${uuid(id)}`:sql``} ORDER BY p.received_at DESC,p.id DESC LIMIT ${read.limit+(extra?1:0)} OFFSET ${read.offset}`);
 }
 private paymentView(row:Row):BillingPayment{
  const amount=BigInt(String(row.amount_minor)),allocated=BigInt(String(row.allocated_minor)),reversed=row.reversed===true;
  if(allocated<0n||allocated>amount)throw new BillingError('LEDGER_INVARIANT_FAILED',500);
  return {id:String(row.id),companyId:String(row.company_id),amount:{currency:'UZS',minor:amount.toString()},receivedAt:iso(row.received_at),method:String(row.method),reference:row.reference===null?null:String(row.reference),allocatedMinor:allocated.toString(),unallocatedMinor:reversed?'0':(amount-allocated).toString(),reversed,allocations:row.allocations as BillingAllocation[]};
 }
 async listPayments(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<BillingPayment[]>{return (await this.paymentRows(this.store.database.db,actor,companyId,undefined,scope)).map(row=>this.paymentView(row));}
 async listPaymentsPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<BillingPayment>>{const read=this.readScope(actor,companyId,scope),rows=await this.paymentRows(this.store.database.db,actor,companyId,undefined,scope,true);return this.page(rows.map(row=>this.paymentView(row)),read);}
 private async creditRows(actor:Actor,companyId:string|undefined,scope:BillingReadScope={},extra=false):Promise<BillingCredit[]>{
  const read=this.readScope(actor,companyId,scope),rows=await this.rows(this.store.database.db,sql`WITH balances AS (
   SELECT p.company_id,'receipt' AS kind,p.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.payment_id=p.id),0) AS remaining FROM billing_receipts p WHERE p.environment=${actor.environment} ${read.companyId?sql`AND p.company_id=${read.companyId}`:sql``} AND NOT EXISTS(SELECT 1 FROM billing_reversals r WHERE r.payment_id=p.id)
   UNION ALL SELECT g.company_id,'grant' AS kind,g.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM billing_school_credit_allocations a WHERE a.credit_id=g.id),0) AS remaining FROM billing_school_credit_entries g WHERE g.environment=${actor.environment} ${read.companyId?sql`AND g.company_id=${read.companyId}`:sql``}
  ) SELECT company_id AS "companyId",sum(remaining)::text AS "unallocatedMinor",COALESCE(sum(remaining) FILTER(WHERE kind='receipt'),0)::text AS "receiptCreditMinor",COALESCE(sum(remaining) FILTER(WHERE kind='grant'),0)::text AS "nonCashCreditMinor" FROM balances GROUP BY company_id HAVING sum(remaining)>0 ORDER BY company_id LIMIT ${read.limit+(extra?1:0)} OFFSET ${read.offset}`);
  return rows.map(row=>({companyId:String(row.companyId),unallocatedMinor:String(row.unallocatedMinor),receiptCreditMinor:String(row.receiptCreditMinor),nonCashCreditMinor:String(row.nonCashCreditMinor),currency:'UZS'}));
 }
 listCredits(actor:Actor,companyId?:string,scope:BillingReadScope={}){return this.creditRows(actor,companyId,scope);}
 async listCreditsPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<BillingCredit>>{return this.page(await this.creditRows(actor,companyId,scope,true),this.readScope(actor,companyId,scope));}
 private async schoolCreditRows(tx:ProductExecutor,actor:Actor,companyId?:string,id?:string,scope:BillingReadScope={},extra=false):Promise<Row[]>{
  const read=this.readScope(actor,companyId,scope);return this.rows(tx,sql`SELECT g.id,g.company_id,g.invoice_id,g.contract_id,g.contract_revision,g.amount_minor::text,g.reason,g.created_at,COALESCE((SELECT sum(a.amount_minor) FROM billing_school_credit_allocations a WHERE a.credit_id=g.id),0)::text AS allocated_minor,COALESCE((SELECT jsonb_agg(jsonb_build_object('invoiceId',active.invoice_id,'amountMinor',active.amount_minor::text) ORDER BY active.invoice_id) FROM (SELECT a.invoice_id,sum(a.amount_minor) AS amount_minor FROM billing_school_credit_allocations a WHERE a.credit_id=g.id GROUP BY a.invoice_id HAVING sum(a.amount_minor)>0) active),'[]'::jsonb) AS allocations FROM billing_school_credit_entries g WHERE g.environment=${actor.environment} ${read.companyId?sql`AND g.company_id=${read.companyId}`:sql``} ${id?sql`AND g.id=${uuid(id)}`:sql``} ORDER BY g.created_at DESC,g.id DESC LIMIT ${read.limit+(extra?1:0)} OFFSET ${read.offset}`);
 }
 private schoolCreditView(row:Row):BillingSchoolCredit{
  const amount=BigInt(String(row.amount_minor)),allocated=BigInt(String(row.allocated_minor));if(allocated<0n||allocated>amount)throw new BillingError('LEDGER_INVARIANT_FAILED',500);
  return {id:String(row.id),companyId:String(row.company_id),invoiceId:String(row.invoice_id),contractId:String(row.contract_id),contractRevision:Number(row.contract_revision),amountMinor:amount.toString(),currency:'UZS',allocatedMinor:allocated.toString(),unallocatedMinor:(amount-allocated).toString(),reason:String(row.reason),createdAt:iso(row.created_at),allocations:row.allocations as BillingAllocation[]};
 }
 async listSchoolCreditsPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<BillingSchoolCredit>>{const read=this.readScope(actor,companyId,scope),rows=await this.schoolCreditRows(this.store.database.db,actor,companyId,undefined,scope,true);return this.page(rows.map(row=>this.schoolCreditView(row)),read);}
 private async currentSchoolCredit(tx:ProductExecutor,actor:Actor,id:string):Promise<BillingSchoolCredit>{const [row]=await this.schoolCreditRows(tx,actor,undefined,id);if(!row)throw new BillingError('NOT_FOUND',404);return this.schoolCreditView(row);}
 getSchoolCredit(actor:Actor,id:string){return this.currentSchoolCredit(this.store.database.db,actor,id);}
 private async schoolCreditAllocationConsequences(tx:ProductExecutor,actor:Actor,id:string,input:Row):Promise<Row>{
  const credit=await this.currentSchoolCredit(tx,actor,id),additions=allocations(input.allocations),total=additions.reduce((sum,item)=>sum+BigInt(item.amountMinor),0n);
  if(total>BigInt(credit.unallocatedMinor))throw new BillingError('ALLOCATION_CONFLICT');const affectedInvoiceBalances:Array<{invoiceId:string;beforeMinor:string;afterMinor:string}>=[];
  for(const allocation of additions){const [row]=await this.invoiceRows(tx,actor,credit.companyId,allocation.invoiceId,true);if(!row)throw new BillingError('ALLOCATION_CONFLICT');const invoice=this.invoiceView(row),outstanding=BigInt(invoice.outstandingMinor),amount=BigInt(allocation.amountMinor);if(amount>outstanding)throw new BillingError('ALLOCATION_CONFLICT');affectedInvoiceBalances.push({invoiceId:invoice.id,beforeMinor:outstanding.toString(),afterMinor:(outstanding-amount).toString()});}
  const merged=new Map(credit.allocations.map(item=>[item.invoiceId,BigInt(item.amountMinor)]));for(const allocation of additions)merged.set(allocation.invoiceId,(merged.get(allocation.invoiceId)??0n)+BigInt(allocation.amountMinor));
  const next={...credit,allocatedMinor:(BigInt(credit.allocatedMinor)+total).toString(),unallocatedMinor:(BigInt(credit.unallocatedMinor)-total).toString(),allocations:[...merged].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([invoiceId,amount])=>({invoiceId,amountMinor:amount.toString()}))};
  return {credit:next,affectedInvoiceBalances,unallocatedMinor:next.unallocatedMinor};
 }
 async previewSchoolCreditAllocation(actor:Actor,id:string,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['creditId','allocations']);if(input.creditId!==undefined&&input.creditId!==id)throw new BillingError('INVALID_REQUEST',400);const request={creditId:uuid(id),allocations:allocations(input.allocations)};
  return this.store.transaction(async tx=>{const credit=await this.currentSchoolCredit(tx,actor,id),revision=await this.lockLedger(tx,actor,credit.companyId),result=await this.schoolCreditAllocationConsequences(tx,actor,id,request);return this.savePreview(tx,actor,credit.companyId,'schoolCredit.allocate',id,request,result,revision);});
 }
 private async appendSchoolCreditAllocations(tx:ProductExecutor,actor:Actor,companyId:string,creditId:string,items:BillingAllocation[],entryType:'allocate'|'correction_release'){for(const allocation of items)await tx.execute(sql`INSERT INTO billing_school_credit_allocations(id,environment,company_id,credit_id,invoice_id,amount_minor,entry_type) VALUES(${randomUUID()},${actor.environment},${companyId},${creditId},${allocation.invoiceId},${allocation.amountMinor},${entryType})`);}
 async allocateSchoolCredit(actor:Actor,id:string,input:Row,key:string){
  if(input.creditId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'schoolCredit.allocate',input,async(tx,preview)=>{const current=await this.schoolCreditAllocationConsequences(tx,actor,id,preview.request);if(hash(current)!==hash(preview.result))throw new BillingError('ALLOCATION_CONFLICT');await this.appendSchoolCreditAllocations(tx,actor,preview.companyId,id,allocations(preview.request.allocations),'allocate');return {...await this.currentSchoolCredit(tx,actor,id),affectedInvoiceBalances:current.affectedInvoiceBalances};});
 }
 async getPayment(actor:Actor,id:string):Promise<BillingPayment>{const [row]=await this.paymentRows(this.store.database.db,actor,undefined,id);if(!row)throw new BillingError('NOT_FOUND',404);return this.paymentView(row);}
 private normalizePayment(input:Row):Row{
  exactKeys(input,['companyId','amount','receivedAt','method','reference','allocations']);
  const receivedAt=text(input.receivedAt,80);
  if(!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(receivedAt)||!Number.isFinite(Date.parse(receivedAt))||Date.parse(receivedAt)>this.clock().getTime()+300000||!['bank_transfer','cash','other'].includes(String(input.method)))throw new BillingError('INVALID_REQUEST',400);
  date(receivedAt.slice(0,10));
  return {companyId:identifier(input.companyId),amount:parseAmount(input.amount),receivedAt:new Date(receivedAt).toISOString(),method:String(input.method),reference:input.reference===undefined||input.reference===null?null:text(input.reference),...(input.allocations!==undefined?{allocations:allocations(input.allocations)}:{})};
 }
 private async paymentConsequences(tx:ProductExecutor,actor:Actor,input:Row,id:string):Promise<{request:Row;result:Row;blockers:string[]}>{
  const request={...input},companyId=String(input.companyId),amount=input.amount as Money,chosen:BillingAllocation[]=[],balances:Array<{invoiceId:string;beforeMinor:string;afterMinor:string}>=[],blockers:string[]=[];
  if(input.allocations===undefined){
   let available=BigInt(amount.minor);const candidates=await this.invoiceRows(tx,actor,companyId,undefined,true,true);
   for(const candidate of candidates){const invoice=this.invoiceView(candidate),outstanding=BigInt(invoice.outstandingMinor);if(available===0n)break;if(outstanding===0n)continue;const allocated=available<outstanding?available:outstanding;chosen.push({invoiceId:invoice.id,amountMinor:allocated.toString()});available-=allocated;}
   if(available>0n&&candidates.length===100){const [count]=await this.rows(tx,sql`SELECT count(*)::text FROM billing_invoices WHERE environment=${actor.environment} AND company_id=${companyId}`);if(Number(count!.count)>100)blockers.push('ALLOCATION_LIMIT_REACHED');}
  }else chosen.push(...allocations(input.allocations));
  let total=0n;
  for(const allocation of chosen){
   const [row]=await this.invoiceRows(tx,actor,companyId,allocation.invoiceId,true);if(!row)throw new BillingError('ALLOCATION_CONFLICT');
   const invoice=this.invoiceView(row),value=BigInt(allocation.amountMinor),outstanding=BigInt(invoice.outstandingMinor);
   if(value>outstanding)throw new BillingError('ALLOCATION_CONFLICT');total+=value;balances.push({invoiceId:invoice.id,beforeMinor:outstanding.toString(),afterMinor:(outstanding-value).toString()});
  }
  if(total>BigInt(amount.minor))throw new BillingError('ALLOCATION_CONFLICT');request.allocations=chosen;
  const payment:BillingPayment={id,companyId,amount,receivedAt:String(input.receivedAt),method:String(input.method),reference:input.reference as string|null,allocatedMinor:total.toString(),unallocatedMinor:(BigInt(amount.minor)-total).toString(),reversed:false,allocations:chosen};
  const duplicates=input.reference===null?[]:await this.rows(tx,sql`SELECT id FROM billing_receipts WHERE environment=${actor.environment} AND company_id=${companyId} AND amount_minor=${amount.minor} AND reference=${String(input.reference)} AND received_at=${String(input.receivedAt)} ORDER BY id LIMIT 5`);
  return {request,result:{payment,affectedInvoiceBalances:balances,unallocatedMinor:payment.unallocatedMinor,duplicateCandidates:duplicates.map(row=>String(row.id)),warnings:duplicates.length?['POSSIBLE_DUPLICATE_RECEIPT']:[],_allocationMode:input.allocations===undefined?'automatic':'manual'},blockers};
 }
 async previewPayment(actor:Actor,input:Row):Promise<FinancialPreview>{
  const normalized=this.normalizePayment(input),companyId=String(normalized.companyId);
  return this.store.transaction(async tx=>{const revision=await this.lockLedger(tx,actor,companyId);await this.requireKnownSchool(tx,actor,companyId);const id=randomUUID(),review=await this.paymentConsequences(tx,actor,normalized,id);return this.savePreview(tx,actor,companyId,'payment.record',id,review.request,review.result,revision,review.blockers);});
 }
 private async appendAllocations(tx:ProductExecutor,actor:Actor,companyId:string,paymentId:string,items:BillingAllocation[],entryType:string){for(const allocation of items)await tx.execute(sql`INSERT INTO billing_allocations(id,environment,company_id,payment_id,invoice_id,amount_minor,entry_type) VALUES(${randomUUID()},${actor.environment},${companyId},${paymentId},${allocation.invoiceId},${allocation.amountMinor},${entryType})`);}
 async recordPayment(actor:Actor,input:Row,key:string){
  return this.reviewed(actor,key,'payment.record',input,async(tx,preview)=>{
   await this.requireKnownSchool(tx,actor,preview.companyId);
   const request=preview.result._allocationMode==='automatic'?Object.fromEntries(Object.entries(preview.request).filter(([name])=>name!=='allocations')):preview.request;
   const current=await this.paymentConsequences(tx,actor,request,preview.targetId);if(current.blockers.length)throw new BillingError(current.blockers[0]!);if(hash(current.result)!==hash(preview.result))throw new BillingError('PREVIEW_STALE');
   const payment=current.result.payment as BillingPayment;
   await tx.execute(sql`INSERT INTO billing_receipts(id,environment,company_id,amount_minor,received_at,method,reference) VALUES(${payment.id},${actor.environment},${preview.companyId},${payment.amount.minor},${payment.receivedAt},${payment.method},${payment.reference})`);
   await this.appendAllocations(tx,actor,preview.companyId,payment.id,payment.allocations,'allocation');
   const [row]=await this.paymentRows(tx,actor,undefined,payment.id);return {...this.paymentView(row!),affectedInvoiceBalances:current.result.affectedInvoiceBalances};
  });
 }
 private async currentPayment(tx:ProductExecutor,actor:Actor,id:string):Promise<BillingPayment>{const [row]=await this.paymentRows(tx,actor,undefined,id);if(!row)throw new BillingError('NOT_FOUND',404);return this.paymentView(row);}
 private async allocationConsequences(tx:ProductExecutor,actor:Actor,id:string,input:Row):Promise<Row>{
  const payment=await this.currentPayment(tx,actor,id);if(payment.reversed)throw new BillingError('PAYMENT_ALREADY_REVERSED');
  const additions=allocations(input.allocations),total=additions.reduce((sum,item)=>sum+BigInt(item.amountMinor),0n);
  if(total>BigInt(payment.unallocatedMinor))throw new BillingError('ALLOCATION_CONFLICT');
  const affectedInvoiceBalances:Array<{invoiceId:string;beforeMinor:string;afterMinor:string}>=[];
  for(const allocation of additions){const [row]=await this.invoiceRows(tx,actor,payment.companyId,allocation.invoiceId,true);if(!row)throw new BillingError('ALLOCATION_CONFLICT');const invoice=this.invoiceView(row),outstanding=BigInt(invoice.outstandingMinor),amount=BigInt(allocation.amountMinor);if(amount>outstanding)throw new BillingError('ALLOCATION_CONFLICT');affectedInvoiceBalances.push({invoiceId:invoice.id,beforeMinor:outstanding.toString(),afterMinor:(outstanding-amount).toString()});}
  const merged=new Map(payment.allocations.map(item=>[item.invoiceId,BigInt(item.amountMinor)]));for(const allocation of additions)merged.set(allocation.invoiceId,(merged.get(allocation.invoiceId)??0n)+BigInt(allocation.amountMinor));
  const next={...payment,allocatedMinor:(BigInt(payment.allocatedMinor)+total).toString(),unallocatedMinor:(BigInt(payment.unallocatedMinor)-total).toString(),allocations:[...merged].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([invoiceId,amount])=>({invoiceId,amountMinor:amount.toString()}))};
  return {payment:next,affectedInvoiceBalances,unallocatedMinor:next.unallocatedMinor};
 }
 async previewAllocations(actor:Actor,id:string,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['paymentId','allocations']);if(input.paymentId!==undefined&&input.paymentId!==id)throw new BillingError('INVALID_REQUEST',400);
  const request={paymentId:uuid(id),allocations:allocations(input.allocations)};
  return this.store.transaction(async tx=>{const payment=await this.currentPayment(tx,actor,id),revision=await this.lockLedger(tx,actor,payment.companyId),result=await this.allocationConsequences(tx,actor,id,request);return this.savePreview(tx,actor,payment.companyId,'payment.allocate',id,request,result,revision);});
 }
 async allocatePayment(actor:Actor,id:string,input:Row,key:string){
  if(input.paymentId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'payment.allocate',input,async(tx,preview)=>{
   const current=await this.allocationConsequences(tx,actor,id,preview.request);if(hash(current)!==hash(preview.result))throw new BillingError('ALLOCATION_CONFLICT');
   await this.appendAllocations(tx,actor,preview.companyId,id,allocations(preview.request.allocations),'allocation');return {...await this.currentPayment(tx,actor,id),affectedInvoiceBalances:current.affectedInvoiceBalances};
  });
 }
 private async reversalConsequences(tx:ProductExecutor,actor:Actor,id:string):Promise<Row>{
  const payment=await this.currentPayment(tx,actor,id),affectedInvoiceBalances:Array<{invoiceId:string;beforeMinor:string;afterMinor:string}>=[];
  for(const allocation of payment.allocations){const [row]=await this.invoiceRows(tx,actor,payment.companyId,allocation.invoiceId,true);if(!row)throw new BillingError('LEDGER_INVARIANT_FAILED',500);const invoice=this.invoiceView(row);affectedInvoiceBalances.push({invoiceId:invoice.id,beforeMinor:invoice.outstandingMinor,afterMinor:(BigInt(invoice.outstandingMinor)+BigInt(allocation.amountMinor)).toString()});}
  return {payment,allocationsToReverse:payment.allocations,affectedInvoiceBalances,creditRemovedMinor:payment.unallocatedMinor,canReverse:!payment.reversed};
 }
 async previewReversal(actor:Actor,id:string,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['paymentId','reason']);if(input.paymentId!==undefined&&input.paymentId!==id)throw new BillingError('INVALID_REQUEST',400);const request={paymentId:uuid(id),reason:text(input.reason,512)};
  return this.store.transaction(async tx=>{const payment=await this.currentPayment(tx,actor,id),revision=await this.lockLedger(tx,actor,payment.companyId),result=await this.reversalConsequences(tx,actor,id);return this.savePreview(tx,actor,payment.companyId,'payment.reverse',id,request,result,revision,payment.reversed?['PAYMENT_ALREADY_REVERSED']:[]);});
 }
 async reversePayment(actor:Actor,id:string,input:Row,key:string){
  if(input.paymentId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'payment.reverse',input,async(tx,preview)=>{
   const current=await this.reversalConsequences(tx,actor,id);if(!current.canReverse)throw new BillingError('PAYMENT_ALREADY_REVERSED');if(hash(current)!==hash(preview.result))throw new BillingError('REVERSAL_PREVIEW_STALE');
   const reversalId=randomUUID();await tx.execute(sql`INSERT INTO billing_reversals(id,payment_id,reason) VALUES(${reversalId},${id},${String(preview.request.reason)})`);
   await this.appendAllocations(tx,actor,preview.companyId,id,(current.allocationsToReverse as BillingAllocation[]).map(item=>({...item,amountMinor:(-BigInt(item.amountMinor)).toString()})),'reversal');
   return {...await this.currentPayment(tx,actor,id),reversalId,reason:preview.request.reason,affectedInvoiceBalances:current.affectedInvoiceBalances};
  });
 }
 private async correctionConsequences(tx:ProductExecutor,actor:Actor,id:string,input:Row,allowEmptyCancellationCredit=false):Promise<Row>{
  const [row]=await this.invoiceRows(tx,actor,undefined,id,true);if(!row)throw new BillingError('NOT_FOUND',404);
  const invoice=this.invoiceView(row),next=BigInt(money(input.correctedTotalMinor)),before=BigInt(invoice.correctedTotalMinor),allocated=BigInt(String(invoice.allocatedMinor));
  if(input.type==='credit'&&next>=before&&!(allowEmptyCancellationCredit&&next===0n&&before===0n))throw new BillingError('CORRECTION_INVALID');
  let release=allocated>next?allocated-next:0n;
  const releasedAllocations:Array<{paymentId:string;invoiceId:string;amountMinor:string}>=[];
  const releasedCreditAllocations:Array<{creditId:string;invoiceId:string;amountMinor:string}>=[];
  if(release>0n){
   const paid=await this.rows(tx,sql`SELECT source_id,source_type,amount_minor::text FROM (
    SELECT a.payment_id AS source_id,'receipt' AS source_type,sum(a.amount_minor) AS amount_minor,max(a.created_at) FILTER(WHERE a.amount_minor>0) AS allocated_at FROM billing_allocations a WHERE a.invoice_id=${id} GROUP BY a.payment_id HAVING sum(a.amount_minor)>0
    UNION ALL SELECT a.credit_id AS source_id,'grant' AS source_type,sum(a.amount_minor) AS amount_minor,max(a.created_at) FILTER(WHERE a.amount_minor>0) AS allocated_at FROM billing_school_credit_allocations a WHERE a.invoice_id=${id} GROUP BY a.credit_id HAVING sum(a.amount_minor)>0
   ) available ORDER BY allocated_at DESC,source_type ASC,source_id DESC LIMIT 1000`);
   for(const source of paid){if(release===0n)break;const available=BigInt(String(source.amount_minor)),value=available<release?available:release;if(source.source_type==='grant')releasedCreditAllocations.push({creditId:String(source.source_id),invoiceId:id,amountMinor:value.toString()});else releasedAllocations.push({paymentId:String(source.source_id),invoiceId:id,amountMinor:value.toString()});release-=value;}
   if(release>0n)throw new BillingError('CORRECTION_REVIEW_LIMIT');
  }
  const receiptIncrease=releasedAllocations.reduce((sum,item)=>sum+BigInt(item.amountMinor),0n),grantIncrease=releasedCreditAllocations.reduce((sum,item)=>sum+BigInt(item.amountMinor),0n),creditIncrease=receiptIncrease+grantIncrease,nextAllocated=allocated-creditIncrease;
  return {invoiceBefore:invoice,invoiceAfter:{...invoice,correctedTotalMinor:next.toString(),allocatedMinor:nextAllocated.toString(),receiptAllocatedMinor:(BigInt(String(invoice.receiptAllocatedMinor))-receiptIncrease).toString(),creditAllocatedMinor:(BigInt(String(invoice.creditAllocatedMinor))-grantIncrease).toString(),outstandingMinor:(next>nextAllocated?next-nextAllocated:0n).toString()},releasedAllocations,releasedCreditAllocations,receiptCreditIncreaseMinor:receiptIncrease.toString(),nonCashCreditIncreaseMinor:grantIncrease.toString(),creditIncreaseMinor:creditIncrease.toString(),deltaMinor:(next-before).toString()};
 }
 async previewCorrection(actor:Actor,id:string,input:Row):Promise<FinancialPreview>{
  exactKeys(input,['invoiceId','type','correctedTotalMinor','reason']);if(input.invoiceId!==undefined&&input.invoiceId!==id||!['adjustment','credit','void'].includes(String(input.type)))throw new BillingError('INVALID_REQUEST',400);
  const correctedTotalMinor=input.type==='void'?'0':money(input.correctedTotalMinor);
  if(input.type==='void'&&input.correctedTotalMinor!==undefined&&input.correctedTotalMinor!=='0')throw new BillingError('INVALID_REQUEST',400);
  const request={invoiceId:uuid(id),type:String(input.type),correctedTotalMinor,reason:text(input.reason,512)};
  return this.store.transaction(async tx=>{const [row]=await this.invoiceRows(tx,actor,undefined,id,true);if(!row)throw new BillingError('NOT_FOUND',404);const companyId=String(row.company_id),revision=await this.lockLedger(tx,actor,companyId),result=await this.correctionConsequences(tx,actor,id,request);return this.savePreview(tx,actor,companyId,'invoice.correct',id,request,result,revision);});
 }
 private async appendCorrection(tx:ProductExecutor,actor:Actor,companyId:string,id:string,input:Row,result:Row,ledgerRevision:string){
  const correctionId=randomUUID(),snapshot={...result,ledgerRevision:(BigInt(ledgerRevision)+1n).toString(),type:input.type,reason:input.reason};
  await tx.execute(sql`INSERT INTO billing_corrections(id,invoice_id,kind,delta_minor,new_total_minor,reason,snapshot) VALUES(${correctionId},${id},${String(input.type)},${String(result.deltaMinor)},${String(input.correctedTotalMinor)},${String(input.reason)},${JSON.stringify(snapshot)}::jsonb)`);
  for(const release of result.releasedAllocations as Array<{paymentId:string;invoiceId:string;amountMinor:string}>)await this.appendAllocations(tx,actor,companyId,release.paymentId,[{invoiceId:release.invoiceId,amountMinor:(-BigInt(release.amountMinor)).toString()}],'correction_release');
  for(const release of (result.releasedCreditAllocations??[]) as Array<{creditId:string;invoiceId:string;amountMinor:string}>)await this.appendSchoolCreditAllocations(tx,actor,companyId,release.creditId,[{invoiceId:release.invoiceId,amountMinor:(-BigInt(release.amountMinor)).toString()}],'correction_release');
  return correctionId;
 }
 async correctInvoice(actor:Actor,id:string,input:Row,key:string){
  if(input.invoiceId!==id)throw new BillingError('INVALID_REQUEST',400);
  return this.reviewed(actor,key,'invoice.correct',input,async(tx,preview)=>{
   const current=await this.correctionConsequences(tx,actor,id,preview.request);if(hash(current)!==hash(preview.result))throw new BillingError('CORRECTION_PREVIEW_STALE');
   const correctionId=await this.appendCorrection(tx,actor,preview.companyId,id,preview.request,current,preview.ledgerRevision),[row]=await this.invoiceRows(tx,actor,undefined,id);return {...this.invoiceView(row!),correctionId,creditIncreaseMinor:current.creditIncreaseMinor};
  });
 }
 private reminderState(actor:Actor,invoice:BillingInvoice):{id:string;stateHash:string}{const stateHash=hash({invoiceId:invoice.id,correctedTotalMinor:invoice.correctedTotalMinor,allocatedMinor:invoice.allocatedMinor,outstandingMinor:invoice.outstandingMinor,dueDate:invoice.dueDate});return {id:hash({environment:actor.environment,invoiceId:invoice.id,stateHash,noticeDate:this.today()}),stateHash};}
 async listRemindersPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<Reminder>>{
  const read=this.readScope(actor,companyId,scope),candidates=await this.invoiceRows(this.store.database.db,actor,companyId,undefined,true,true,true,{...scope,from:undefined,to:undefined},true),page=this.page(candidates,read),items:Reminder[]=[];
  for(const candidate of page.items){
   const notice=await this.store.transaction(async tx=>{
    await this.store.lock(tx,String(candidate.company_id),actor.environment);const [row]=await this.invoiceRows(tx,actor,undefined,String(candidate.id),true);if(!row)return null;
    const invoice=this.invoiceView(row);if(invoice.dueDate>=this.today()||invoice.outstandingMinor==='0')return null;
    const state=this.reminderState(actor,invoice);
    await tx.execute(sql`INSERT INTO billing_reminder_notices(id,environment,company_id,invoice_id,state_hash,notice_date,amount_minor,due_date) VALUES(${state.id},${actor.environment},${invoice.companyId},${invoice.id},${state.stateHash},${this.today()},${invoice.outstandingMinor},${invoice.dueDate}) ON CONFLICT DO NOTHING`);
    const [seen]=await this.rows(tx,sql`SELECT notice_id FROM billing_reminder_acknowledgments WHERE environment=${actor.environment} AND notice_id=${state.id} AND actor_id=${actor.id}`);
    return {id:state.id,companyId:invoice.companyId,invoiceId:invoice.id,amountMinor:invoice.outstandingMinor,dueDate:invoice.dueDate,overdueDays:dayNumber(this.today())-dayNumber(invoice.dueDate),acknowledged:!!seen};
   });if(notice)items.push(notice);
  }return {items,nextCursor:page.nextCursor};
 }
 async listReminders(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Reminder[]>{return (await this.listRemindersPage(actor,companyId,scope)).items;}
 async refreshReminders(actor:Actor,companyId?:string){let cursor:string|undefined,processed=0;do{const page=await this.listRemindersPage(actor,companyId,{cursor,limit:100});processed+=page.items.length;cursor=page.nextCursor??undefined;}while(cursor);return {processed};}
 async acknowledgeReminder(actor:Actor,id:string,input:Row,key:string){
  identifier(id);exactKeys(input,['noticeId']);if(input.noticeId!==undefined&&input.noticeId!==id)throw new BillingError('INVALID_REQUEST',400);
  const request={noticeId:id};
  return this.command(actor,key,'reminder.acknowledge',request,async tx=>{const [notice]=await this.rows(tx,sql`SELECT company_id FROM billing_reminder_notices WHERE id=${id} AND environment=${actor.environment}`);if(!notice)throw new BillingError('NOT_FOUND',404);return String(notice.company_id);},async tx=>{
   const [notice]=await this.rows(tx,sql`SELECT invoice_id,to_char(notice_date,'YYYY-MM-DD') AS notice_date FROM billing_reminder_notices WHERE id=${id} AND environment=${actor.environment}`);
   if(!notice)throw new BillingError('NOT_FOUND',404);const [row]=await this.invoiceRows(tx,actor,undefined,String(notice.invoice_id),true);if(!row)throw new BillingError('NOT_FOUND',404);
   const invoice=this.invoiceView(row);if(notice.notice_date!==this.today()||invoice.outstandingMinor==='0'||invoice.dueDate>=this.today()||this.reminderState(actor,invoice).id!==id)throw new BillingError('REMINDER_STATE_CHANGED');
   await tx.execute(sql`INSERT INTO billing_reminder_acknowledgments(environment,notice_id,invoice_id,actor_id,acknowledged_at) VALUES(${actor.environment},${id},${invoice.id},${actor.id},${this.clock().toISOString()}) ON CONFLICT DO NOTHING`);
   return {id,companyId:invoice.companyId,invoiceId:invoice.id,amountMinor:invoice.outstandingMinor,dueDate:invoice.dueDate,overdueDays:dayNumber(this.today())-dayNumber(invoice.dueDate),acknowledged:true};
  });
 }
 async listAudit(actor:Actor,companyId?:string){return this.rows(this.store.database.db,sql`SELECT id,company_id AS "companyId",actor_id AS "actorId",operation,intent_id AS "intentId",data,created_at AS "createdAt" FROM billing_audit WHERE environment=${actor.environment} ${companyId?sql`AND company_id=${identifier(companyId)}`:sql``} ORDER BY created_at DESC,id DESC LIMIT 100`);}
 private async contractRows(actor:Actor,companyId:string|undefined,scope:BillingReadScope={},extra=false){const read=this.readScope(actor,companyId,scope);return this.rows(this.store.database.db,sql`SELECT r.data FROM billing_contracts c JOIN billing_contract_revisions r ON r.contract_id=c.id AND r.revision=c.current_revision WHERE c.environment=${actor.environment} ${read.companyId?sql`AND c.company_id=${read.companyId}`:sql``} ${read.from?sql`AND (r.data->>'effectiveTo' IS NULL OR (r.data->>'effectiveTo')::date>${read.from}::date)`:sql``} ${read.to?sql`AND (r.data->>'effectiveFrom')::date<${read.to}::date`:sql``} ORDER BY c.id LIMIT ${read.limit+(extra?1:0)} OFFSET ${read.offset}`);}
 async listContracts(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<BillingContract[]>{return (await this.contractRows(actor,companyId,scope)).map(row=>this.contractView(row.data as BillingContract));}
 async listContractsPage(actor:Actor,companyId?:string,scope:BillingReadScope={}):Promise<Page<BillingContract>>{const read=this.readScope(actor,companyId,scope),rows=await this.contractRows(actor,companyId,scope,true);return this.page(rows.map(row=>this.contractView(row.data as BillingContract)),read);}
 getContract(actor:Actor,id:string){return this.currentContract(this.store.database.db,actor,id);}
}
