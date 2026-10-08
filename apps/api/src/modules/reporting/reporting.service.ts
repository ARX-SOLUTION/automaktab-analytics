import {createHash,randomUUID} from 'node:crypto';
import {sql,type SQL} from 'drizzle-orm';
import {exactKeys,identifier,object,type AnalyticsResult,type QueryScope,type ResponseMeta} from '@automaktab/contracts';
import {ProductStore,type Actor} from '../../db/product-store.js';
import {AccessError} from '../auth/session.js';
import {evaluateFunnel,type FunnelDefinition} from './funnel.js';
type Row=Record<string,unknown>;
const version='observed-events-v1';
function iso(value:unknown){return value instanceof Date?value.toISOString():String(value);}
function metric(key:string,label:string,value:unknown,unit='count'){return {key,label,value:value===null?null:String(value),unit,definitionVersion:version};}
function canonical(value:unknown):string{if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value as Row).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';return JSON.stringify(value)??'null';}
function digest(value:unknown){return createHash('sha256').update(canonical(value)).digest('hex');}
export class ReportingService {
 constructor(private readonly store:ProductStore,private readonly sourceQuality:(actor:Actor,scope?:{companyId?:string})=>Promise<Partial<ResponseMeta>>=async()=>({status:'partial',dataThrough:null,coverageFrom:null,warnings:['SOURCE_BARRIER_MISSING']}),private readonly trustedSource='crm'){}
 private conditions(actor:Actor,scope:QueryScope):SQL{
  if(actor.environment!==scope.environment)throw new AccessError('SCOPE_DENIED',403);
  return sql`e.environment=${actor.environment} AND e.occurred_at>=(${scope.from}::date::timestamp AT TIME ZONE ${scope.timezone}) AND e.occurred_at<(${scope.to}::date::timestamp AT TIME ZONE ${scope.timezone}) ${scope.companyId?sql`AND e.company_id=${scope.companyId}`:sql``} ${scope.branchId?sql`AND e.branch_id=${scope.branchId}`:sql``} ${scope.surface?sql`AND coalesce(e.properties->>'surface',CASE WHEN e.name='usage.action' THEN 'tenant' WHEN e.name='learning.result' THEN CASE WHEN e.properties->>'practice'='true' THEN 'practice' ELSE 'learning' END WHEN e.name IN('lead.created','lead.school_linked') THEN 'marketing' END)=${scope.surface}`:sql``}`;
 }
 async quality(actor:Actor,scope?:QueryScope):Promise<Partial<ResponseMeta>>{
  const quality=await this.sourceQuality(actor,scope);
  if(scope&&quality.coverageFrom){const [row]=await this.store.query(this.store.database.db,sql`SELECT (${scope.from}::date::timestamp AT TIME ZONE ${scope.timezone})<${quality.coverageFrom}::timestamptz AS incomplete`);if(row?.incomplete)return {...quality,status:'partial',warnings:[...new Set([...(quality.warnings??[]),'COVERAGE_UNKNOWN'])]};}
  return quality;
 }
 async traffic(actor:Actor,scope:QueryScope):Promise<AnalyticsResult>{
  const condition=this.conditions(actor,scope);
  const [row]=await this.store.query(this.store.database.db,sql`SELECT count(*)::text AS views,count(DISTINCT anonymous_id)::text AS visitors,count(DISTINCT session_id)::text AS sessions FROM analytics_events e WHERE ${condition} AND name='page.view'`);
  const series=await this.store.query(this.store.database.db,sql`SELECT to_char(occurred_at AT TIME ZONE ${scope.timezone},'YYYY-MM-DD') AS date,count(*)::int AS value FROM analytics_events e WHERE ${condition} AND name='page.view' GROUP BY 1 ORDER BY 1`);
  const pages=await this.store.query(this.store.database.db,sql`SELECT properties->>'path' AS page,count(*)::text AS count FROM analytics_events e WHERE ${condition} AND name='page.view' GROUP BY 1 ORDER BY count(*) DESC,page LIMIT 100`);
  return {metrics:[metric('views','Kuzatilgan sahifa tashriflari',row?.views??'0'),metric('visitors','Identifikatorli tashrifchilar',row?.visitors??'0'),metric('sessions','Identifikatorli sessiyalar',row?.sessions??'0')],series:series as unknown as AnalyticsResult['series'],items:pages,definitionVersion:version};
 }
 async sources(actor:Actor,scope:QueryScope){return {items:await this.store.query(this.store.database.db,sql`SELECT coalesce(properties->>'utm_source','direct') AS source,coalesce(properties->>'utm_medium','none') AS medium,coalesce(properties->>'utm_campaign','none') AS campaign,count(*)::text AS count FROM analytics_events e WHERE ${this.conditions(actor,scope)} AND name='page.view' GROUP BY 1,2,3 ORDER BY count(*) DESC,1,2,3 LIMIT 100`),nextCursor:null};}
 async usage(actor:Actor,scope:QueryScope):Promise<AnalyticsResult>{
  const condition=this.conditions(actor,scope);const [row]=await this.store.query(this.store.database.db,sql`SELECT count(*)::text AS count,count(DISTINCT properties->>'actor_id')::text AS actors,count(DISTINCT company_id)::text AS companies FROM analytics_events e WHERE ${condition} AND source=${this.trustedSource} AND name='usage.action'`);
  const items=await this.store.query(this.store.database.db,sql`SELECT properties->>'action' AS action,properties->>'role' AS name,count(*)::text AS count FROM analytics_events e WHERE ${condition} AND source=${this.trustedSource} AND name='usage.action' GROUP BY 1,2 ORDER BY count(*) DESC LIMIT 100`);
  return {metrics:[metric('actions','Kuzatilgan CRM amallari',row?.count??'0'),metric('actors','Amali kuzatilgan CRM hisoblari',row?.actors??'0'),metric('companies','Amali kuzatilgan maktablar',row?.companies??'0')],series:[],items,definitionVersion:version};
 }
 async learning(actor:Actor,scope:QueryScope):Promise<AnalyticsResult>{
  const condition=this.conditions(actor,scope),practice=scope.surface==='practice',complete=(await this.quality(actor,scope)).status==='fresh';
  const [row]=await this.store.query(this.store.database.db,sql`SELECT count(*)::text AS attempts,count(*) FILTER(WHERE properties->>'outcome'='passed')::text AS passed FROM analytics_events e WHERE ${condition} AND source=${this.trustedSource} AND name='learning.result' AND properties->>'practice'=${String(practice)}`);
  const items=await this.store.query(this.store.database.db,sql`SELECT properties->>'outcome' AS status,count(*)::text AS count FROM analytics_events e WHERE ${condition} AND source=${this.trustedSource} AND name='learning.result' AND properties->>'practice'=${String(practice)} GROUP BY 1 ORDER BY 1`);
  return {metrics:[metric('attempts',practice?'Maktabga bog‘langan practice urinishlari':'Rasmiy yakunlangan urinishlar',complete?row?.attempts??'0':null),metric('passed','O‘tgan urinishlar',complete?row?.passed??'0':null)],series:[],items,definitionVersion:practice?'trusted-practice-v1':'trusted-official-learning-v1'};
 }
 async acquisition(actor:Actor,scope:QueryScope):Promise<AnalyticsResult>{
  const condition=this.conditions(actor,{...scope,companyId:undefined});
  if(scope.branchId)return {metrics:[metric('leads','Platforma murojaatlari',null),metric('linked','Tasdiqlangan lead–maktab bog‘lanishi',null)],series:[],items:[],steps:[{name:'Platforma murojaati',count:null,rate:null},{name:'Tasdiqlangan maktab bog‘lanishi',count:null,rate:null}],summary:'Platforma murojaati maktabga bog‘lanadi; tasdiqlangan filial bog‘lanishi mavjud emas. Filial bo‘yicha natija noma’lum.',definitionVersion:'verified-link-events-v1'};
  const [row]=await this.store.query(this.store.database.db,sql`SELECT count(DISTINCT e.properties->>'lead_id') FILTER(WHERE e.name='lead.created')::text AS leads FROM analytics_events e LEFT JOIN analytics_leads l ON l.id=e.properties->>'lead_id' AND l.environment=e.environment WHERE ${condition} AND e.source=${this.trustedSource} AND e.name='lead.created' ${scope.companyId?sql`AND l.company_id=${scope.companyId}`:sql``}`);
  const [verified]=await this.store.query(this.store.database.db,sql`SELECT count(*)::text AS count FROM analytics_leads l JOIN analytics_schools s ON s.id=l.company_id AND s.environment=l.environment WHERE l.environment=${actor.environment} AND ${scope.surface??'marketing'}='marketing' AND l.linked_at>=(${scope.from}::date::timestamp AT TIME ZONE ${scope.timezone}) AND l.linked_at<(${scope.to}::date::timestamp AT TIME ZONE ${scope.timezone}) ${scope.companyId?sql`AND l.company_id=${scope.companyId}`:sql``}`);
  return {metrics:[metric('leads','Platforma murojaatlari',row?.leads??'0'),metric('linked','Tasdiqlangan lead–maktab bog‘lanishi',verified?.count??'0')],series:[],items:[],steps:[{name:'Platforma murojaati',count:Number(row?.leads??0),rate:null},{name:'Tasdiqlangan maktab bog‘lanishi',count:Number(verified?.count??0),rate:null}],definitionVersion:'verified-link-events-v1'};
 }
 async journeys(actor:Actor,scope:QueryScope):Promise<AnalyticsResult>{
  const condition=this.conditions(actor,scope),[total]=await this.store.query(this.store.database.db,sql`SELECT count(*)::text AS count FROM analytics_events e WHERE ${condition}`);
  const days=await this.store.query(this.store.database.db,sql`WITH observed AS(SELECT (occurred_at AT TIME ZONE ${scope.timezone})::date AS day,count(*)::text AS count FROM analytics_events e WHERE ${condition} GROUP BY 1) SELECT d.day::date::text AS date,o.count FROM generate_series(${scope.from}::date::timestamp,(${scope.to}::date-1)::timestamp,interval '1 day') d(day) LEFT JOIN observed o ON o.day=d.day::date ORDER BY d.day`);
  return {metrics:[metric('events','Davrda kuzatilgan hodisalar',total?.count??'0')],series:days.map(row=>({date:String(row.date),value:row.count===null?null:Number(row.count)})),items:await this.store.query(this.store.database.db,sql`SELECT name AS event,source,company_id AS "companyId",occurred_at AS "occurredAt",properties->>'surface' AS surface FROM analytics_events e WHERE ${condition} ORDER BY occurred_at DESC,id DESC LIMIT 100`),summary:'Grafik tanlangan davrdagi kuzatilgan hodisalarni ko‘rsatadi. Ro‘yxatda oxirgi 100 ta hodisa bor; kuzatuvi yo‘q kunlar nol deb olinmaydi.',definitionVersion:version};
 }
 async funnels(actor:Actor){return {items:(await this.store.query(this.store.database.db,sql`SELECT id,name,revision AS version,steps,window_days AS "windowDays" FROM analytics_funnels WHERE environment=${actor.environment} ORDER BY name,id LIMIT 100`)),nextCursor:null};}
 private definition(input:unknown){const value=object(input);exactKeys(value,['name','steps','windowDays','expectedVersion']);if(typeof value.name!=='string'||!value.name.trim()||value.name.length>100||!Array.isArray(value.steps)||value.steps.length<2||value.steps.length>10||!Number.isInteger(value.windowDays)||Number(value.windowDays)<1||Number(value.windowDays)>90)throw new Error('INVALID_REQUEST');
  const steps=value.steps.map(item=>{const step=object(item);exactKeys(step,['event','name']);const event=identifier(step.event);if(!['page.view','feature.used','funnel.step','lead.created','lead.school_linked','company.updated','usage.action','learning.result'].includes(event)||typeof step.name!=='string'||!step.name.trim()||step.name.length>100)throw new Error('INVALID_REQUEST');return {event,name:step.name.trim()};});return {name:value.name.trim(),steps,windowDays:Number(value.windowDays),expectedVersion:value.expectedVersion};}
 async reviseFunnel(actor:Actor,input:unknown,key:string,id?:string):Promise<Row>{identifier(key);if(id)identifier(id);const request=this.definition(input),hash=digest({id:id??null,input:request});
  return this.store.transaction(async tx=>{await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'funnel-command:'+actor.environment+':'+actor.id+':'+key}))`);const [prior]=await this.store.query(tx,sql`SELECT request_hash,result FROM analytics_commands WHERE actor_id=${actor.id} AND environment=${actor.environment} AND intent_id=${key}`);if(prior){if(prior.request_hash!==hash)throw new AccessError('IDEMPOTENCY_CONFLICT',409);return {...prior.result as Row,replayed:true};}
   const funnelId=id??randomUUID();const [old]=await this.store.query(tx,sql`SELECT revision FROM analytics_funnels WHERE id=${funnelId} AND environment=${actor.environment} FOR UPDATE`);if(id&&!old)throw new AccessError('NOT_FOUND',404);if(old&&request.expectedVersion!==Number(old.revision))throw new AccessError('DEFINITION_STALE',409);if(!old&&request.expectedVersion!==undefined)throw new Error('INVALID_REQUEST');
   const revision=old?Number(old.revision)+1:1,result={id:funnelId,name:request.name,version:revision,steps:request.steps,windowDays:request.windowDays};
   await tx.execute(sql`INSERT INTO analytics_funnels(id,revision,name,environment,steps,window_days) VALUES(${funnelId},${revision},${request.name},${actor.environment},${JSON.stringify(request.steps)}::jsonb,${request.windowDays}) ON CONFLICT(id) DO UPDATE SET revision=EXCLUDED.revision,name=EXCLUDED.name,steps=EXCLUDED.steps,window_days=EXCLUDED.window_days`);
   await tx.execute(sql`INSERT INTO analytics_funnel_revisions(funnel_id,revision,definition) VALUES(${funnelId},${revision},${JSON.stringify(result)}::jsonb)`);
   await tx.execute(sql`INSERT INTO analytics_commands(actor_id,environment,intent_id,request_hash,result) VALUES(${actor.id},${actor.environment},${key},${hash},${JSON.stringify(result)}::jsonb)`);
   await tx.execute(sql`INSERT INTO analytics_audit(actor_id,environment,operation,record_id,details) VALUES(${actor.id},${actor.environment},'funnel.revised',${funnelId},${JSON.stringify({revision})}::jsonb)`);return {...result,replayed:false};});
 }
 async funnelResults(actor:Actor,scope:QueryScope,id:string,revision?:number){identifier(id);const [row]=await this.store.query(this.store.database.db,sql`SELECT r.definition FROM analytics_funnel_revisions r JOIN analytics_funnels f ON f.id=r.funnel_id WHERE f.id=${id} AND f.environment=${actor.environment} AND r.revision=${revision??sql`f.revision`}`);if(!row)throw new AccessError('NOT_FOUND',404);const definition=row.definition as Row&FunnelDefinition;
  const events=await this.store.query(this.store.database.db,sql`SELECT coalesce(e.anonymous_id,e.session_id,CASE WHEN e.name='usage.action' THEN e.company_id||':'||(e.properties->>'actor_id') END) AS identity,e.name AS event,e.occurred_at AS "occurredAt" FROM analytics_events e WHERE ${this.conditions(actor,scope)} AND e.name IN (${sql.join(definition.steps.map(step=>sql`${step.event}`),sql`,`)}) ORDER BY e.occurred_at,e.id LIMIT 100001`);if(events.length>100000)throw new AccessError('QUERY_LIMIT_EXCEEDED',422);const result=evaluateFunnel(events.map(event=>({identity:event.identity?String(event.identity):null,event:String(event.event),occurredAt:iso(event.occurredAt)})),definition);return {metrics:[],series:[],items:[],...result,definitionVersion:'ordered-funnel-v1:'+String(definition.version)};
 }
 async live(actor:Actor,scope:QueryScope,cursor?:string){if(cursor!==undefined&&!/^\d{1,20}$/.test(cursor))throw new Error('INVALID_REQUEST');const items=await this.store.query(this.store.database.db,sql`SELECT id::text AS id,id::text AS sequence,name,source,occurred_at AS "occurredAt",company_id AS "companyId" FROM analytics_events e WHERE ${this.conditions(actor,scope)} ${cursor?sql`AND id>${cursor}::bigint`:sql``} ORDER BY id ${cursor?sql`ASC`:sql`DESC`} LIMIT 51`);return {items:items.slice(0,50).map(item=>({id:String(item.id),sequence:String(item.sequence),name:String(item.name),source:String(item.source),companyId:item.companyId?String(item.companyId):null,occurredAt:iso(item.occurredAt)})),cursor:items.length?String(items[cursor?Math.min(items.length,50)-1:0]!.id):cursor??'0',reset:items.length>50&&Boolean(cursor)};}
 async ledger(actor:Actor,scope:QueryScope){
  this.conditions(actor,scope);
  const labels=[['billed','Davr bo‘yicha hisoblangan'],['collected','Davrdagi amaldagi tushum qaydlari'],['debt','Joriy platforma qarzi'],['credit','Joriy avans va kredit']];
  if(scope.branchId||scope.surface)return labels.map(([key,label])=>({...metric(key!,label!,null,'UZS'),definitionVersion:'platform-ledger-v1'}));
  const [row]=await this.store.query(this.store.database.db,sql`WITH invoices AS(
   SELECT i.*,i.total_minor+coalesce((SELECT sum(c.delta_minor) FROM billing_corrections c WHERE c.invoice_id=i.id),0) AS corrected,
    coalesce((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.invoice_id=i.id),0)+coalesce((SELECT sum(a.amount_minor) FROM billing_school_credit_allocations a WHERE a.invoice_id=i.id),0) AS allocated
   FROM billing_invoices i WHERE i.environment=${actor.environment} ${scope.companyId?sql`AND i.company_id=${scope.companyId}`:sql``}
  ),receipts AS(
   SELECT r.*,coalesce((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.payment_id=r.id),0) AS allocated
   FROM billing_receipts r WHERE r.environment=${actor.environment} ${scope.companyId?sql`AND r.company_id=${scope.companyId}`:sql``}
    AND NOT EXISTS(SELECT 1 FROM billing_reversals v WHERE v.payment_id=r.id)
  ),credits AS(
   SELECT c.*,coalesce((SELECT sum(a.amount_minor) FROM billing_school_credit_allocations a WHERE a.credit_id=c.id),0) AS allocated
   FROM billing_school_credit_entries c WHERE c.environment=${actor.environment} ${scope.companyId?sql`AND c.company_id=${scope.companyId}`:sql``}
  )SELECT (SELECT coalesce(sum(corrected),0)::text FROM invoices WHERE kind='subscription' AND period_start>=${scope.from}::date AND period_start<${scope.to}::date) AS billed,
   (SELECT coalesce(sum(amount_minor),0)::text FROM receipts WHERE received_at>=(${scope.from}::date::timestamp AT TIME ZONE ${scope.timezone}) AND received_at<(${scope.to}::date::timestamp AT TIME ZONE ${scope.timezone})) AS collected,
   (SELECT coalesce(sum(greatest(corrected-allocated,0)),0)::text FROM invoices) AS debt,
   ((SELECT coalesce(sum(greatest(amount_minor-allocated,0)),0) FROM receipts)+(SELECT coalesce(sum(greatest(amount_minor-allocated,0)),0) FROM credits))::text AS credit`);
  return labels.map(([key,label])=>({...metric(key!,label!,row?.[key!]??'0','UZS'),definitionVersion:'platform-ledger-v1'}));
 }
 async audit(actor:Actor,scope:QueryScope){this.conditions(actor,scope);return {items:await this.store.query(this.store.database.db,sql`SELECT * FROM(
  SELECT 'analytics:'||id::text AS id,actor_id AS "actorId",operation AS action,company_id AS "companyId",created_at AS "createdAt" FROM analytics_audit WHERE environment=${actor.environment}
  UNION ALL SELECT 'billing:'||id::text AS id,actor_id AS "actorId",operation AS action,company_id AS "companyId",created_at AS "createdAt" FROM billing_audit WHERE environment=${actor.environment}
 )a WHERE "createdAt">=(${scope.from}::date::timestamp AT TIME ZONE ${scope.timezone}) AND "createdAt"<(${scope.to}::date::timestamp AT TIME ZONE ${scope.timezone}) ${scope.companyId?sql`AND "companyId"=${scope.companyId}`:sql``} ORDER BY "createdAt" DESC,id DESC LIMIT 100`),nextCursor:null};}
}
