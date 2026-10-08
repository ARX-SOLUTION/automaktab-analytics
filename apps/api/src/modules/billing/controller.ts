import {Body,Controller,Get,Headers,Inject,Param,Post,Query,Req} from '@nestjs/common';
import {identifier,object,parseQueryScope} from '@automaktab/contracts';
import {AuthService,AccessError} from '../auth/session.js';
import {cookie,envelope,header,type HttpRequest} from '../auth/controller.js';
import {CommandRegistry} from '../commands/registry.js';
import {BillingService} from './billing.service.js';
type Row=Record<string,unknown>;
interface Request extends HttpRequest{path:string;}
@Controller('api/v1')
export class BillingController {
 constructor(@Inject(AuthService)private readonly auth:AuthService,@Inject(BillingService)private readonly billing:BillingService,@Inject(CommandRegistry)private readonly commands:CommandRegistry){}
 private actor(request:HttpRequest,mutation=false){return this.auth.authenticate(cookie(request,'analytics_session'),mutation?{origin:header(request,'origin'),csrf:header(request,'x-csrf-token')}:undefined);}
 private company(query:unknown,environment:string){const value=object(query);if(value.environment!==undefined&&value.environment!==environment)throw new AccessError('SCOPE_DENIED',403);if(value.branchId||value.surface)throw new AccessError('SCHOOL_FINANCE_SCOPE_REQUIRED',400);return value.companyId?identifier(value.companyId):undefined;}
 private scope(query:unknown,environment:string){const value=object(query),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit'}).formatToParts(new Date()),year=Number(parts.find(part=>part.type==='year')!.value),month=Number(parts.find(part=>part.type==='month')!.value);return {...parseQueryScope({...value,from:value.from??`${year}-${String(month).padStart(2,'0')}-01`,to:value.to??new Date(Date.UTC(year,month,1)).toISOString().slice(0,10),environment:value.environment??environment}),cursor:value.cursor?identifier(value.cursor):undefined,limit:value.limit===undefined?100:Number(value.limit)};}
 @Get(['billing/policy-status','billing/contracts','billing/invoices','billing/payments','billing/credits','billing/school-credits','reminders','commands'])
 async read(@Req()request:Request,@Query()query:unknown){const actor=await this.actor(request),company=this.company(query,actor.environment),path=request.path.slice('/api/v1/'.length);let data:unknown;
  if(path==='billing/policy-status')data=await this.billing.policyStatus(actor);else if(path==='commands')data=await this.commands.discover(actor);else{const scope=this.scope(query,actor.environment);data=path==='billing/contracts'?await this.billing.listContractsPage(actor,company,scope):path==='billing/invoices'?await this.billing.listInvoicesPage(actor,company,scope):path==='billing/credits'?await this.billing.listCreditsPage(actor,company,scope):path==='billing/school-credits'?await this.billing.listSchoolCreditsPage(actor,company,scope):path==='reminders'?await this.billing.listRemindersPage(actor,company,scope):await this.billing.listPaymentsPage(actor,company,scope);}return envelope(data);
 }
 @Get('billing/contracts/:id') async contract(@Req()request:Request,@Param('id')id:string){return envelope(await this.billing.getContract(await this.actor(request),id));}
 @Get('billing/invoices/:id') async invoice(@Req()request:Request,@Param('id')id:string){return envelope(await this.billing.getInvoice(await this.actor(request),id));}
 @Get('billing/invoices/:id/lines') async lines(@Req()request:Request,@Param('id')id:string,@Query()query:unknown){const value=object(query);return envelope(await this.billing.getInvoiceLines(await this.actor(request),id,{cursor:value.cursor?String(value.cursor):undefined,limit:value.limit===undefined?100:Number(value.limit)}));}
 @Get('billing/invoice-previews/:id/lines') async previewLines(@Req()request:Request,@Param('id')id:string,@Query()query:unknown){const value=object(query);return envelope(await this.billing.getInvoicePreviewLines(await this.actor(request),id,{cursor:value.cursor?String(value.cursor):undefined,limit:value.limit===undefined?100:Number(value.limit)}));}
 @Get('billing/payments/:id') async payment(@Req()request:Request,@Param('id')id:string){return envelope(await this.billing.getPayment(await this.actor(request),id));}
 @Get('billing/school-credits/:id') async schoolCredit(@Req()request:Request,@Param('id')id:string){return envelope(await this.billing.getSchoolCredit(await this.actor(request),id));}
 @Get('commands/:id') async command(@Req()request:Request,@Param('id')id:string){return envelope(await this.commands.status(await this.actor(request),id));}
 @Post('commands/:id/acknowledgments') async acknowledge(@Req()request:Request,@Param('id')id:string){return envelope(await this.commands.acknowledge(await this.actor(request,true),id));}
 @Post(['billing/contract-previews','billing/payment-previews','billing/opening-balance-previews'])
 async preview(@Req()request:Request,@Body()body:unknown){const actor=await this.actor(request,true),input=object(body);return envelope(request.path.endsWith('/contract-previews')?await this.billing.previewContract(actor,input):request.path.endsWith('/opening-balance-previews')?await this.billing.previewOpeningBalance(actor,input):await this.billing.previewPayment(actor,input));}
 @Post('billing/contracts/:id/previews') async invoicePreview(@Req()request:Request,@Param('id')id:string,@Body()body:unknown){return envelope(await this.billing.previewInvoice(await this.actor(request,true),id,object(body)));}
 @Post('billing/payments/:id/allocation-previews') async allocations(@Req()request:Request,@Param('id')id:string,@Body()body:unknown){return envelope(await this.billing.previewAllocations(await this.actor(request,true),id,object(body)));}
 @Post('billing/school-credits/:id/allocation-previews') async creditAllocations(@Req()request:Request,@Param('id')id:string,@Body()body:unknown){return envelope(await this.billing.previewSchoolCreditAllocation(await this.actor(request,true),id,object(body)));}
 @Post('billing/payments/:id/reversal-previews') async reversal(@Req()request:Request,@Param('id')id:string,@Body()body:unknown){return envelope(await this.billing.previewReversal(await this.actor(request,true),id,object(body)));}
 @Post('billing/invoices/:id/correction-previews') async correction(@Req()request:Request,@Param('id')id:string,@Body()body:unknown){return envelope(await this.billing.previewCorrection(await this.actor(request,true),id,object(body)));}
 @Post('reminders/:id/acknowledgments') async seen(@Req()request:Request,@Param('id')id:string,@Body()body:unknown,@Headers('idempotency-key')key:string){return envelope(await this.billing.acknowledgeReminder(await this.actor(request,true),id,object(body),key));}
 @Post(['billing/policy-confirmations','billing/contracts','billing/payments','billing/opening-balances','billing/contracts/:id/confirm','billing/contracts/:id/revisions','billing/contracts/:id/cancel','billing/contracts/:id/closes','billing/payments/:id/allocations','billing/payments/:id/reversals','billing/school-credits/:id/allocations','billing/invoices/:id/corrections'])
 async commit(@Req()request:Request,@Param('id')id:string|undefined,@Body()body:unknown,@Headers('idempotency-key')key:string){
  const actor=await this.actor(request,true),path=request.path.slice('/api/v1'.length);const result=await this.commands.run(actor,key,path,body,async()=>{const input=object(body),calls:Record<string,()=>Promise<Row>>={
   '/billing/policy-confirmations':()=>this.billing.confirmPolicy(actor,input,key),'/billing/contracts':()=>this.billing.createContract(actor,input,key),'/billing/payments':()=>this.billing.recordPayment(actor,input,key),'/billing/opening-balances':()=>this.billing.recordOpeningBalance(actor,input,key),
   [`/billing/contracts/${id}/revisions`]:()=>this.billing.reviseContract(actor,id!,input,key),[`/billing/contracts/${id}/cancel`]:()=>this.billing.cancelContract(actor,id!,input,key),
   [`/billing/contracts/${id}/confirm`]:()=>this.billing.confirmContract(actor,id!,input,key),[`/billing/contracts/${id}/closes`]:()=>this.billing.closeInvoice(actor,id!,input,key),
   [`/billing/payments/${id}/allocations`]:()=>this.billing.allocatePayment(actor,id!,input,key),[`/billing/payments/${id}/reversals`]:()=>this.billing.reversePayment(actor,id!,input,key),[`/billing/school-credits/${id}/allocations`]:()=>this.billing.allocateSchoolCredit(actor,id!,input,key),[`/billing/invoices/${id}/corrections`]:()=>this.billing.correctInvoice(actor,id!,input,key)};
  const work=calls[path];if(!work)throw new AccessError('NOT_FOUND',404);return work();});return {...envelope(result),meta:{...envelope(null).meta,replayed:result.replayed===true}};
 }
}
