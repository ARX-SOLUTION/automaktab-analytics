import {eventAdmissionDefinitions} from './product.js';
type Schema=Record<string,unknown>;
const string=(maxLength=160):Schema=>({type:'string',minLength:1,maxLength});
const id:Schema={...string(),pattern:'^[a-zA-Z0-9_.:-]+$'},uuid:Schema={type:'string',format:'uuid'};
const day:Schema={type:'string',format:'date'},time:Schema={type:'string',format:'date-time'};
const minor:Schema={type:'string',pattern:'^(0|[1-9][0-9]{0,29})$'};
const environment:Schema={type:'string',enum:['synthetic','development','production']};
const reason:Schema=string(512),revision:Schema={type:'integer',minimum:1};
function object(properties:Record<string,Schema>,required=Object.keys(properties)):Schema{return {type:'object',properties,required,additionalProperties:false};}
const money=object({currency:{const:'UZS'},minor});
const allocation=object({invoiceId:uuid,amountMinor:minor});
const allocations:Schema={type:'array',maxItems:100,items:allocation};
const proof={previewId:uuid,expectedPreviewHash:{type:'string',pattern:'^[a-f0-9]{64}$'},expectedLedgerRevision:minor};
const contractCreate=object({action:{const:'create'},companyId:id,planType:{enum:['fixed_monthly','fixed_annual','active_student']},amountMinor:minor,currency:{const:'UZS'},businessTimezone:{const:'Asia/Tashkent'},effectiveFrom:day,effectiveTo:{anyOf:[day,{type:'null'}]},policyRevisionId:uuid},['action','companyId','planType','amountMinor','currency','businessTimezone','effectiveFrom','policyRevisionId']);
const contractConfirm=object({action:{const:'confirm'},contractId:uuid,expectedRevision:revision});
const contractRevise=object({action:{const:'revise'},contractId:uuid,expectedRevision:revision,amountMinor:minor,effectiveFrom:day});
const contractCancel=object({action:{const:'cancel'},contractId:uuid,expectedRevision:revision,cancelAt:day,reason});
const payment=object({companyId:id,amount:money,receivedAt:time,method:{enum:['cash','bank_transfer','other']},reference:{anyOf:[string(160),{type:'null'}]},allocations},['companyId','amount','receivedAt','method']);
const opening=object({companyId:id,amount:money,asOf:day,dueDate:day,reason});
const invoice=object({contractId:uuid,periodStart:day,periodEnd:day},['periodStart','periodEnd']);
const paymentAllocation=object({paymentId:uuid,allocations},['allocations']);
const creditAllocation=object({creditId:uuid,allocations},['allocations']);
const reversal=object({paymentId:uuid,reason},['reason']);
const correction:Schema={oneOf:[object({invoiceId:uuid,type:{enum:['adjustment','credit']},correctedTotalMinor:minor,reason},['type','correctedTotalMinor','reason']),object({invoiceId:uuid,type:{const:'void'},correctedTotalMinor:{const:'0'},reason},['type','reason'])]};
function reviewed(schema:Schema,requiredIds:string[]=[]):Schema{if(schema.oneOf)return {oneOf:(schema.oneOf as Schema[]).map(part=>reviewed(part,requiredIds))};return object({...schema.properties as Record<string,Schema>,...proof},[...new Set([...schema.required as string[],...requiredIds,...Object.keys(proof)])]);}
const funnel=object({name:string(100),steps:{type:'array',minItems:2,maxItems:10,items:object({event:id,name:string(100)})},windowDays:{type:'integer',minimum:1,maximum:90},expectedVersion:revision},['name','steps','windowDays']);
const eventBase={event_id:id,schema_version:{const:1},name:string(),occurred_at:time,source:id,environment,anonymous_id:id,session_id:id,properties:{type:'object',maxProperties:9}};
const publicEvent=object({...eventBase,name:{enum:eventAdmissionDefinitions.publicNames},properties:object(Object.fromEntries(eventAdmissionDefinitions.publicProperties.map(key=>[key,{type:'string',maxLength:256}])),[])},['event_id','schema_version','name','occurred_at','source','environment','properties']);
const trustedEvents=Object.entries(eventAdmissionDefinitions.trustedProperties).map(([name,keys])=>object({...eventBase,name:{const:name},effective_at:time,aggregate_type:{const:eventAdmissionDefinitions.trustedKinds[name]},aggregate_id:id,aggregate_version:{...minor,pattern:'^[1-9][0-9]{0,29}$'},company_id:id,properties:object(Object.fromEntries(keys.map(key=>[key,['is_demo','is_active','practice'].includes(key)?{type:'boolean'}:key==='score'?{type:['number','null'],minimum:0}:['created_at','deleted_at'].includes(key)||key==='branch_id'&&name==='usage.action'?{anyOf:[key.endsWith('_id')?id:time,{type:'null'}]}:key.endsWith('_id')?id:{type:'string',maxLength:256}])),[...eventAdmissionDefinitions.trustedRequired[eventAdmissionDefinitions.trustedKinds[name]!]!,...(name==='lead.school_linked'?['company_id']:[])])},['event_id','schema_version','name','occurred_at','source','environment','properties','effective_at','aggregate_type','aggregate_id','aggregate_version',...(name==='lead.created'?[]:['company_id'])]));
const eventBatch=(trusted:boolean)=>object({events:{type:'array',minItems:1,maxItems:100,items:trusted?{oneOf:trustedEvents}:publicEvent}});
export const openApiSchemas:Record<string,Schema>={Money:money,Identifier:id,WholeSom:minor,QueryScope:object({from:day,to:day,timezone:{type:'string',default:'Asia/Tashkent'},companyId:id,branchId:id,surface:{enum:['marketing','tenant','learning','practice']},environment,cursor:{type:'string',pattern:'^(0|[1-9][0-9]{0,6})$'},limit:{type:'integer',minimum:1,maximum:100}},[]),FinancialProof:object(proof),Error:object({error:object({code:string(),message:string(512),retryable:{type:'boolean'}}),meta:object({apiVersion:{const:1},requestId:uuid})}),Envelope:{type:'object',required:['data','meta'],properties:{data:{},meta:{type:'object',required:['apiVersion','requestId'],properties:{apiVersion:{const:1},requestId:uuid,replayed:{type:'boolean'},status:{enum:['fresh','stale','partial']},dataThrough:{anyOf:[time,{type:'null'}]},coverageFrom:{anyOf:[time,{type:'null'}]},warnings:{type:'array',items:string()}}}}}};
/** Generated route documentation uses the same transport units and reviewed intent shapes as clients. */
export function openApiInput(path:string):Schema|undefined{
 if(path==='/collect/v1/events'||path==='/internal/v1/events')return eventBatch(path.startsWith('/internal/'));
 if(path==='/internal/v1/snapshots')return object({schema_version:{const:1},source:id,environment,cutover_at:time,as_of:time,barrier_version:minor,snapshot_hash:string(64),records:{type:'array',maxItems:100000,items:{type:'object'}},heads:{type:'array',items:{type:'object'}},signal_heads:{type:'array',items:object({aggregate_type:{enum:['lead','usage','learning']},aggregate_id:id,aggregate_version:minor})},baseline_records:{type:'array',maxItems:100000,items:{type:'object'}},baseline_hash:string(64)});
 if(path==='/internal/v1/subject-aliases')return object({source:id,environment,companyId:id,subjectId:id,canonicalId:id,effectiveAt:time,proofId:id});
 if(path==='/internal/v1/subject-aliases/revoke')return object({source:id,environment,companyId:id,proofId:id,revokedAt:time});
 if(path==='/api/v1/auth/session')return object({exchangeCode:id,state:id});
 if(path==='/api/v1/auth/demo-session'||/^\/api\/v1\/commands\/\{id\}\/acknowledgments$/.test(path))return object({});
 if(path==='/api/v1/system/source-sync')return object({activate:{type:'boolean',default:false}},[]);
 if(path==='/api/v1/funnels')return funnel;
 if(path==='/api/v1/funnels/{id}/revisions')return {...funnel,required:['name','steps','windowDays','expectedVersion']};
 if(path==='/api/v1/reminders/{id}/acknowledgments')return object({noticeId:id},[]);
 const route=path.replace('/api/v1','');
 const plain:Record<string,Schema>={'/billing/policy-confirmations':object({confirmed:{const:true},expectedPolicyHash:string(64)}),'/billing/contract-previews':{oneOf:[contractCreate,contractConfirm,contractRevise,contractCancel]},'/billing/payment-previews':payment,'/billing/opening-balance-previews':opening,'/billing/contracts/{id}/previews':invoice,'/billing/payments/{id}/allocation-previews':paymentAllocation,'/billing/school-credits/{id}/allocation-previews':creditAllocation,'/billing/payments/{id}/reversal-previews':reversal,'/billing/invoices/{id}/correction-previews':correction};
 const commits:Record<string,Schema>={'/billing/contracts':reviewed(contractCreate),'/billing/contracts/{id}/confirm':reviewed(contractConfirm),'/billing/contracts/{id}/revisions':reviewed(contractRevise),'/billing/contracts/{id}/cancel':reviewed(contractCancel),'/billing/contracts/{id}/closes':reviewed(invoice,['contractId']),'/billing/payments':reviewed(payment,['allocations']),'/billing/opening-balances':reviewed(opening),'/billing/payments/{id}/allocations':reviewed(paymentAllocation,['paymentId']),'/billing/school-credits/{id}/allocations':reviewed(creditAllocation,['creditId']),'/billing/payments/{id}/reversals':reviewed(reversal,['paymentId']),'/billing/invoices/{id}/corrections':reviewed(correction,['invoiceId','correctedTotalMinor'])};
 return plain[route]??commits[route];
}
