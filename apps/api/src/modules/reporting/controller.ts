import {Body,Controller,Get,Headers,Inject,Param,Post,Query,Req,Res} from '@nestjs/common';
import {sql} from 'drizzle-orm';
import {randomUUID} from 'node:crypto';
import {identifier,object,parseQueryScope,type QueryScope} from '@automaktab/contracts';
import {ProductStore,type Actor} from '../../db/product-store.js';
import {AuthService,AccessError} from '../auth/session.js';
import {cookie,header,type HttpRequest} from '../auth/controller.js';
import {SchoolService} from '../schools/schools.service.js';
import {ReportingService} from './reporting.service.js';
import {SOURCE_SYNC,type SourceSync} from '../../application/source-sync.js';
import {exactKeys} from '@automaktab/contracts';
interface Request extends HttpRequest{path:string;on(name:string,handler:()=>void):void;}
interface StreamResponse{setHeader(name:string,value:string):void;flushHeaders():void;write(value:string):boolean;end():void;}
@Controller('api/v1')
export class ReportingController {
 private readonly streams=new Map<string,number>();
 constructor(@Inject(AuthService)private readonly auth:AuthService,@Inject(SchoolService)private readonly schools:SchoolService,@Inject(ReportingService)private readonly reports:ReportingService,@Inject(ProductStore)private readonly store:ProductStore,@Inject(SOURCE_SYNC)private readonly sourceSync:SourceSync){}
 private actor(request:HttpRequest,mutation=false){return this.auth.authenticate(cookie(request,'analytics_session'),mutation?{origin:header(request,'origin'),csrf:header(request,'x-csrf-token')}:undefined);}
 private scope(query:unknown,actor:Actor):QueryScope{
  const value=object(query),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit'}).formatToParts(new Date()),year=Number(parts.find(part=>part.type==='year')!.value),month=Number(parts.find(part=>part.type==='month')!.value);
  const scope=parseQueryScope({...Object.fromEntries(Object.entries(value).filter(([key])=>!['search','revision'].includes(key))),from:value.from??`${year}-${String(month).padStart(2,'0')}-01`,to:value.to??new Date(Date.UTC(year,month,1)).toISOString().slice(0,10),environment:value.environment??actor.environment});
  if(scope.environment!==actor.environment)throw new AccessError('SCOPE_DENIED',403);if(scope.branchId&&!scope.companyId)throw new Error('INVALID_REQUEST');return scope;
 }
 private async wrap<T>(actor:Actor,data:T,scope?:QueryScope){return {data,meta:{requestId:randomUUID(),apiVersion:1,...await this.reports.quality(actor,scope)}};}
 private async checkedScope(query:unknown,actor:Actor,schoolId?:string){
  const scope=this.scope(query,actor);if(schoolId&&scope.companyId&&scope.companyId!==schoolId)throw new AccessError('SCHOOL_SCOPE_MISMATCH',400);
  if(scope.branchId){const [branch]=await this.store.query(this.store.database.db,sql`SELECT id FROM analytics_branches WHERE id=${scope.branchId} AND environment=${actor.environment} AND company_id=${schoolId??scope.companyId!}`);if(!branch)throw new AccessError('BRANCH_SCOPE_MISMATCH',400);}
  return scope;
 }
 private page(query:unknown){const value=object(query);return {limit:value.limit===undefined?100:Number(value.limit),cursor:value.cursor?identifier(value.cursor):undefined,q:value.search===undefined?undefined:String(value.search)};}
 private async finance<T extends {id:string}&Record<string,unknown>>(actor:Actor,items:T[]){
  const rows=await this.store.query(this.store.database.db,sql`SELECT i.company_id,coalesce(sum(greatest(i.total_minor+coalesce((SELECT sum(c.delta_minor) FROM billing_corrections c WHERE c.invoice_id=i.id),0)-coalesce((SELECT sum(a.amount_minor) FROM billing_allocations a WHERE a.invoice_id=i.id),0)-coalesce((SELECT sum(a.amount_minor) FROM billing_school_credit_allocations a WHERE a.invoice_id=i.id),0),0)),0)::text AS outstanding FROM billing_invoices i WHERE i.environment=${actor.environment} GROUP BY i.company_id`);
  const contracts=await this.store.query(this.store.database.db,sql`SELECT c.company_id,r.data->>'planType' AS plan FROM billing_contracts c JOIN billing_contract_revisions r ON r.contract_id=c.id AND r.revision=c.current_revision WHERE c.environment=${actor.environment} AND r.data->>'status'='active' ORDER BY c.id`);
  return items.map(item=>({...item,outstandingMinor:String(rows.find(row=>row.company_id===item.id)?.outstanding??'0'),planType:contracts.find(row=>row.company_id===item.id)?.plan}));
 }
 @Get(['overview','schools','traffic/summary','traffic/sources','usage/summary','learning/summary','acquisition/funnel','journeys','funnels','system/data-status','audit','live/snapshot'])
 async read(@Req()request:Request,@Query()query:unknown){
  const actor=await this.actor(request),scope=await this.checkedScope(query,actor),path=request.path.slice('/api/v1/'.length);let data:unknown;
  const queries:Record<string,()=>Promise<unknown>>={'traffic/summary':()=>this.reports.traffic(actor,scope),'traffic/sources':()=>this.reports.sources(actor,scope),'usage/summary':()=>this.reports.usage(actor,scope),'learning/summary':()=>this.reports.learning(actor,scope),'acquisition/funnel':()=>this.reports.acquisition(actor,scope),journeys:()=>this.reports.journeys(actor,scope),funnels:()=>this.reports.funnels(actor),audit:()=>this.reports.audit(actor,scope),'live/snapshot':()=>this.reports.live(actor,scope)};
  if(queries[path])data=await queries[path]!();
  else if(path==='system/data-status'){const status=await this.schools.dataStatus(actor,this.page(query));data={...status,sources:status.sources.map(source=>({...source,intervals:undefined}))};}
  else {const page=await this.schools.list(actor,{...this.page(query),companyId:scope.companyId});const schools=await this.finance(actor,page.items);
   if(path==='schools')data={...page,items:schools};
   else{const summary=await this.schools.summary(actor,scope);data={metrics:[{key:'schools',label:'Ulangan maktablar',value:summary.schools===null?null:String(summary.schools),unit:'count',definitionVersion:'crm-source-v1'},{key:'branches',label:'Ulangan filiallar',value:summary.branches===null?null:String(summary.branches),unit:'count',definitionVersion:'crm-source-v1'},{key:'students',label:'CRM’da faol o‘quvchilar',value:summary.activeStudents===null?null:String(summary.activeStudents),unit:'count',definitionVersion:'crm-source-v1'},...await this.reports.ledger(actor,scope)],schools,schoolsTotal:summary.schools,schoolsNextCursor:page.nextCursor,attention:summary.warnings.map(code=>({id:code,type:'source',message:code}))};}
  }
  return this.wrap(actor,data,scope);
 }
 @Get('schools/:id') async detail(@Req()request:Request,@Query()query:unknown,@Param('id')id:string){const actor=await this.actor(request),scope=await this.checkedScope(query,actor,id);return this.wrap(actor,(await this.finance(actor,[await this.schools.detail(actor,id)]))[0],scope);}
 @Get('schools/:id/billing-subjects') async subjects(@Req()request:Request,@Query()query:unknown,@Param('id')id:string){const actor=await this.actor(request),scope=await this.checkedScope(query,actor,id);return this.wrap(actor,await this.schools.subjects(actor,id,{...this.page(query),branchId:scope.branchId}),scope);}
 @Get('schools/:id/branches') async branches(@Req()request:Request,@Query()query:unknown,@Param('id')id:string){const actor=await this.actor(request),scope=await this.checkedScope(query,actor,id);return this.wrap(actor,await this.schools.branches(actor,id,this.page(query)),scope);}
 @Post('funnels') async createFunnel(@Req()request:Request,@Body()body:unknown,@Headers('idempotency-key')key:string){const actor=await this.actor(request,true);return this.wrap(actor,await this.reports.reviseFunnel(actor,body,key));}
 @Post('funnels/:id/revisions') async reviseFunnel(@Req()request:Request,@Param('id')id:string,@Body()body:unknown,@Headers('idempotency-key')key:string){const actor=await this.actor(request,true);return this.wrap(actor,await this.reports.reviseFunnel(actor,body,key,id));}
 @Get('funnels/:id/results') async funnel(@Req()request:Request,@Param('id')id:string,@Query()query:unknown){const actor=await this.actor(request),revision=object(query).revision,value=revision===undefined?undefined:Number(revision),scope=await this.checkedScope(query,actor);if(value!==undefined&&(!Number.isSafeInteger(value)||value<1))throw new Error('INVALID_REQUEST');return this.wrap(actor,await this.reports.funnelResults(actor,scope,id,value),scope);}
 @Post('system/source-sync') async sync(@Req()request:Request,@Body()body:unknown){const actor=await this.actor(request,true),value=object(body);exactKeys(value,['activate']);if(value.activate!==undefined&&typeof value.activate!=='boolean')throw new Error('INVALID_REQUEST');if(!this.sourceSync.configured)throw new AccessError('SOURCE_NOT_CONFIGURED',503);const result=await this.sourceSync.sync(value.activate===true);await this.store.database.db.execute(sql`INSERT INTO analytics_audit(actor_id,environment,operation,record_id,details) VALUES(${actor.id},${actor.environment},${value.activate===true?'source.activate':'source.sync'},'crm','{}'::jsonb)`);return this.wrap(actor,result);}
 @Get('live/stream') async stream(@Req()request:Request,@Res()response:StreamResponse,@Query()query:unknown){
  const actor=await this.actor(request),scope=await this.checkedScope(query,actor),key=actor.environment+':'+actor.id,count=this.streams.get(key)??0;if(count>=2)throw new AccessError('RATE_LIMITED',429);let cursor=header(request,'last-event-id')??String(object(query).cursor??'0');if(!/^\d{1,20}$/.test(cursor))throw new Error('INVALID_REQUEST');
  this.streams.set(key,count+1);response.setHeader('Content-Type','text/event-stream');response.setHeader('Cache-Control','no-store');response.setHeader('X-Accel-Buffering','no');response.flushHeaders();let busy=false,closed=false;let timer:ReturnType<typeof setInterval>;
  const finish=()=>{if(closed)return;closed=true;clearInterval(timer);this.streams.set(key,Math.max((this.streams.get(key)??1)-1,0));response.end();};
  const tick=async()=>{if(busy||closed)return;busy=true;try{await this.actor(request);const data=await this.reports.live(actor,scope,cursor);if(data.reset){response.write('event: reset\ndata: {}\n\n');finish();return;}for(const item of data.items)if(!response.write(`id: ${item.sequence}\ndata: ${JSON.stringify(item)}\n\n`)){finish();return;}cursor=data.cursor;response.write(': heartbeat\n\n');}catch(error){response.write('event: '+(error instanceof AccessError&&error.status===401?'session-expired':'reset')+'\ndata: {}\n\n');finish();}finally{busy=false;}};
  timer=setInterval(()=>{void tick();},1000);request.on('close',finish);void tick();
 }
}
