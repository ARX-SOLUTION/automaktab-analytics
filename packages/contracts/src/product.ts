export type Environment='synthetic'|'development'|'production';
export type DataStatus='fresh'|'stale'|'partial';
export type PlanType='fixed_monthly'|'fixed_annual'|'active_student';
export interface Money {currency:'UZS';minor:string;}
export interface QueryScope {from:string;to:string;timezone:string;companyId?:string;branchId?:string;surface?:string;environment:Environment;}
export interface ResponseMeta {requestId:string;apiVersion:1;replayed?:boolean;dataThrough?:string|null;coverageFrom?:string|null;status?:DataStatus;warnings?:string[];}
export interface ApiResult<T> {data:T;meta:ResponseMeta;}
export interface Session {actorId:string;displayName:string;csrfToken:string;environment:Environment;}
export interface Metric {key:string;label:string;value:string|null;unit:string;definitionVersion:string;}
export interface School {id:string;name:string;status:string;activeStudents:number|null;branchesCount:number;planType?:PlanType;outstandingMinor?:string;dataThrough?:string|null;}
export interface Branch {id:string;name:string;status:string;}
export interface BillingSubject {id:string;status:string;branchId:string;eligibleFrom:string;eligibleTo?:string|null;}
export interface SchoolDetail extends School {branches:Branch[];branchesNextCursor?:string|null;}
export interface SchoolCredit {id:string;companyId:string;invoiceId:string;contractId:string;contractRevision:number;amountMinor:string;currency:'UZS';allocatedMinor:string;unallocatedMinor:string;reason:string;createdAt:string;allocations:Array<{invoiceId:string;amountMinor:string}>;}
export interface Page<T> {items:T[];nextCursor?:string|null;}
export interface Overview {metrics:Metric[];schools:School[];schoolsTotal?:number|null;schoolsNextCursor?:string|null;attention:Array<{id:string;type:string;message:string;companyId?:string}>;}
export interface AnalyticsResult {metrics:Metric[];series:Array<{date:string;value:number|null}>;items:Array<Record<string,unknown>>;steps?:Array<{name:string;count:number|null;rate?:number|null}>;summary?:string;definitionVersion:string;}
export interface EventEnvelope {
 event_id:string;schema_version:1;name:string;occurred_at:string;source:string;environment:Environment;properties:Record<string,unknown>;
 anonymous_id?:string;session_id?:string;effective_at?:string;aggregate_type?:string;aggregate_id?:string;aggregate_version?:string;company_id?:string;
}
export interface SourceRecord {aggregate_type:'company'|'branch'|'student';aggregate_id:string;aggregate_version:string;company_id:string;properties:Record<string,unknown>;}
export interface SourceSignalHead {aggregate_type:'lead'|'usage'|'learning';aggregate_id:string;aggregate_version:string;}
export interface SourceSnapshot {schema_version:1;source:string;environment:Environment;cutover_at:string;as_of:string;barrier_version:string;snapshot_hash:string;records:SourceRecord[];heads:unknown;signal_heads:SourceSignalHead[];baseline_records:SourceRecord[];baseline_hash:string;}
export interface Contract {id:string;companyId:string;planType:PlanType;amountMinor:string;currency:'UZS';businessTimezone:'Asia/Tashkent';effectiveFrom:string;effectiveTo:string|null;revision:number;status:'draft'|'active'|'cancelled';policyRevisionId:string;scheduledRates?:Array<{effectiveFrom:string;planType:PlanType;amountMinor:string}>;}
export interface InvoiceLine {subjectId?:string;branchId?:string;days:number;amountMinor:string;basis:string;}
export interface InvoicePreview {contractId:string;companyId:string;periodStart:string;periodEnd:string;currency:'UZS';totalMinor:string|null;lines:InvoiceLine[];previewHash:string;canClose:boolean;blockers:string[];contractRevision:number;policyRevisionId:string;sourceCheckpoint:string;}
export type Invoice=Omit<InvoicePreview,'contractId'|'contractRevision'>&{totalMinor:string;id:string;dueDate:string;closedAt:string;outstandingMinor:string;correctedTotalMinor:string;}&({kind:'subscription';contractId:string;contractRevision:number;}|{kind:'opening';contractId:null;contractRevision:null;});
export interface Payment {id:string;companyId:string;amount:Money;receivedAt:string;method:string;reference:string|null;allocatedMinor:string;unallocatedMinor:string;reversed:boolean;allocations:Array<{invoiceId:string;amountMinor:string}>;}
export interface Reminder {id:string;companyId:string;invoiceId:string;amountMinor:string;dueDate:string;overdueDays:number;acknowledged:boolean;}

export function object(value:unknown):Record<string,unknown>{if(typeof value!=='object'||value===null||Array.isArray(value))throw new Error('INVALID_REQUEST');return value as Record<string,unknown>;}
export function exactKeys(value:Record<string,unknown>,allowed:readonly string[]){if(Object.keys(value).some(key=>!allowed.includes(key)))throw new Error('INVALID_REQUEST');}
export function identifier(value:unknown):string{if(typeof value!=='string'||!value.length||value.length>160||! /^[a-zA-Z0-9_.:-]+$/.test(value))throw new Error('INVALID_REQUEST');return value;}
export function integerMoney(value:unknown):string{if(typeof value!=='string'||! /^(0|[1-9][0-9]{0,29})$/.test(value))throw new Error('INVALID_REQUEST');return value;}
export function businessDate(value:unknown):string{if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('INVALID_REQUEST');const timestamp=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==value)throw new Error('INVALID_REQUEST');return value;}
export function instant(value:unknown):string{if(typeof value!=='string'||! /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||!Number.isFinite(Date.parse(value)))throw new Error('INVALID_REQUEST');businessDate(value.slice(0,10));return value;}
export function environment(value:unknown):Environment{if(!['synthetic','development','production'].includes(String(value)))throw new Error('INVALID_REQUEST');return value as Environment;}
export function parseMoney(value:unknown):Money{const item=object(value);exactKeys(item,['currency','minor']);if(item.currency!=='UZS')throw new Error('INVALID_REQUEST');return {currency:'UZS',minor:integerMoney(item.minor)};}
export function parseQueryScope(value:unknown):QueryScope{
 const item=object(value);exactKeys(item,['from','to','timezone','companyId','branchId','surface','environment','cursor','limit']);
 const from=businessDate(item.from),to=businessDate(item.to);if(from>=to||Date.parse(to)-Date.parse(from)>366*86400000)throw new Error('INVALID_REQUEST');
 const timezone=typeof item.timezone==='string'?item.timezone:'Asia/Tashkent';try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{throw new Error('INVALID_REQUEST');}
 return {from,to,timezone,environment:environment(item.environment??'synthetic'),...(item.companyId?{companyId:identifier(item.companyId)}:{}),...(item.branchId?{branchId:identifier(item.branchId)}:{}),...(item.surface?{surface:identifier(item.surface)}:{})};
}
const publicNames=['page.view','feature.used','funnel.step','client.error'];
const publicProperties=['path','surface','referrer','utm_source','utm_medium','utm_campaign','feature','goal','step','error_code'];
const trustedProperties:Record<string,readonly string[]>={
 'company.updated':['name','slug','status','is_demo','created_at','deleted_at'],
 'branch.updated':['name','company_id','is_active','created_at','deleted_at'],
 'student.updated':['company_id','branch_id','status','created_at','deleted_at','billing_subject_id'],
 'lead.created':['lead_id','anonymous_id','utm_source','utm_medium','utm_campaign','first_touch','last_touch'],
 'lead.school_linked':['lead_id','company_id'],
 'usage.action':['action','branch_id','actor_id','role'],
 'learning.result':['branch_id','subject_id','outcome','score','practice']
};
const trustedKinds:Record<string,string>={'company.updated':'company','branch.updated':'branch','student.updated':'student','lead.created':'lead','lead.school_linked':'lead','usage.action':'usage','learning.result':'learning'};
const trustedRequired:Record<string,string[]>={company:['name','slug','status','is_demo'],branch:['name','company_id','is_active'],student:['company_id','branch_id','status'],lead:['lead_id'],usage:['action','actor_id','role'],learning:['branch_id','subject_id','outcome','practice']};
export const eventAdmissionDefinitions={publicNames,publicProperties,trustedProperties,trustedKinds,trustedRequired} as const;
function trustedFact(name:string,kind:unknown,properties:Record<string,unknown>){
 if(kind!==trustedKinds[name])throw new Error('INVALID_REQUEST');
 for(const [key,value] of Object.entries(properties)){
  if(['created_at','deleted_at'].includes(key)){if(value!==null)instant(value);}
  else if(['is_active','is_demo','practice'].includes(key)){if(typeof value!=='boolean')throw new Error('INVALID_REQUEST');}
  else if(key==='score'){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)||value<0))throw new Error('INVALID_REQUEST');}
  else if(key.endsWith('_id')){if(value!==null||key!=='branch_id')identifier(value);}
  else if(typeof value!=='string'||value.length>256||[...value].some(character=>character.charCodeAt(0)<32))throw new Error('INVALID_REQUEST');
 }
 if(trustedRequired[String(kind)]!.some(key=>properties[key]===undefined||properties[key]===null))throw new Error('INVALID_REQUEST');
 if(name==='lead.school_linked')identifier(properties.company_id);
 if(name==='learning.result'&&!['passed','failed'].includes(String(properties.outcome)))throw new Error('INVALID_REQUEST');
 if(name==='usage.action'){identifier(properties.action);identifier(properties.role);}
}
export function parseEventEnvelope(value:unknown,trust:'public'|'trusted'):EventEnvelope{
 const item=object(value);exactKeys(item,['event_id','schema_version','name','occurred_at','source','environment','properties','anonymous_id','session_id','effective_at','aggregate_type','aggregate_id','aggregate_version','company_id']);
 if(item.schema_version!==1||typeof item.name!=='string'||(trust==='public'?!publicNames.includes(item.name):!trustedProperties[item.name]))throw new Error('INVALID_REQUEST');
 const properties=object(item.properties);exactKeys(properties,trust==='public'?publicProperties:trustedProperties[item.name]!);
 if(JSON.stringify(properties).length>8192)throw new Error('INVALID_REQUEST');
 if(trust==='public')for(const [key,val] of Object.entries(properties)){if(typeof val!=='string'||val.length>256||/[?#@]/.test(val)||key==='path'&&(!val.startsWith('/')||/[0-9]{4,}/.test(val)))throw new Error('INVALID_REQUEST');}
 if(item.name==='student.updated'&&!['active','completed','dropped','suspended'].includes(String(properties.status)))throw new Error('INVALID_REQUEST');
 if(item.name==='company.updated'&&!['pending','active','suspended'].includes(String(properties.status)))throw new Error('INVALID_REQUEST');
 const base:EventEnvelope={event_id:identifier(item.event_id),schema_version:1,name:item.name,occurred_at:instant(item.occurred_at),source:identifier(item.source),environment:environment(item.environment),properties};
 if(item.anonymous_id!==undefined)base.anonymous_id=identifier(item.anonymous_id);if(item.session_id!==undefined)base.session_id=identifier(item.session_id);
 if(trust==='trusted'){
  trustedFact(item.name,item.aggregate_type,properties);
  base.effective_at=instant(item.effective_at);base.aggregate_type=identifier(item.aggregate_type);base.aggregate_id=identifier(item.aggregate_id);base.aggregate_version=integerMoney(item.aggregate_version);
  if(item.name!=='lead.created'||item.company_id!==undefined)base.company_id=identifier(item.company_id);
  if(base.aggregate_version==='0'||properties.company_id!==undefined&&properties.company_id!==base.company_id)throw new Error('INVALID_REQUEST');
 }else if(item.aggregate_id!==undefined||item.company_id!==undefined||item.effective_at!==undefined||item.aggregate_version!==undefined||item.aggregate_type!==undefined)throw new Error('INVALID_REQUEST');
 return base;
}
