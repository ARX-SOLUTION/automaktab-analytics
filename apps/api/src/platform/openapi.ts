import {RequestMethod} from '@nestjs/common';
import {HTTP_CODE_METADATA,METHOD_METADATA,PATH_METADATA} from '@nestjs/common/constants.js';
import {openApiInput,openApiSchemas} from '@automaktab/contracts';
type Row=Record<string,unknown>;
type ControllerType={name:string;prototype:object;};
export const API_DOCUMENT=Symbol('API_DOCUMENT');
/** Route inventory comes from actual Nest metadata; unmapped write contracts fail generation. */
export function buildOpenApi(controllers:ControllerType[]){
 const paths:Record<string,Row>={};
 for(const controller of controllers){
  const prefixes=Reflect.getMetadata(PATH_METADATA,controller) as string|string[]|undefined;if(prefixes===undefined)continue;
  for(const name of Object.getOwnPropertyNames(controller.prototype)){
   const handler=(controller.prototype as Record<string,unknown>)[name];if(typeof handler!=='function')continue;
   const route=Reflect.getMetadata(PATH_METADATA,handler) as string|string[]|undefined,method=Reflect.getMetadata(METHOD_METADATA,handler) as RequestMethod|undefined;
   if(route===undefined||method===undefined)continue;
   for(const prefix of Array.isArray(prefixes)?prefixes:[prefixes])for(const item of Array.isArray(route)?route:[route]){
    const path=('/'+prefix+'/'+item).replace(/\/+/g,'/').replace(/\/$/,'').replace(/:([a-zA-Z][a-zA-Z0-9_]*)/g,'{$1}'),verb=RequestMethod[method].toLowerCase();
    const publicRoute=path.startsWith('/health/')||path.startsWith('/collect/')||path.startsWith('/internal/')||['/api/v1/auth/config','/api/v1/auth/session','/api/v1/auth/demo-session'].includes(path)&&verb==='post'||path==='/api/v1/auth/config';
    const parameters:Row[]=[...path.matchAll(/\{([^}]+)\}/g)].map(match=>({in:'path',name:match[1],required:true,schema:openApiSchemas.Identifier}));
    if(verb==='get'&&path.startsWith('/api/v1/')&&!path.startsWith('/api/v1/auth/')&&!path.endsWith('/openapi.json'))for(const [key,schema]of Object.entries((openApiSchemas.QueryScope!.properties as Row)))parameters.push({in:'query',name:key,required:false,schema});
    const input=verb==='post'?openApiInput(path):undefined;if(verb==='post'&&!input)throw new Error('OPENAPI_CONTRACT_MISSING');
    const mutatesOwner=verb!=='get'&&path.startsWith('/api/v1/')&&!path.startsWith('/api/v1/auth/');
    if(mutatesOwner||path==='/api/v1/auth/session'&&verb==='delete')parameters.push({in:'header',name:'X-CSRF-Token',required:true,schema:{type:'string'}},{in:'header',name:'Origin',required:true,schema:{type:'string',format:'uri'}});
    if(path.startsWith('/api/v1/auth/')&&verb==='post')parameters.push({in:'header',name:'Origin',required:true,schema:{type:'string',format:'uri'}});
    if(path.includes('/billing/')&&verb==='post'&&!path.endsWith('previews')||path.startsWith('/api/v1/funnels')&&verb==='post'||path.startsWith('/api/v1/reminders/')&&verb==='post')parameters.push({in:'header',name:'Idempotency-Key',required:true,schema:openApiSchemas.Identifier});
    const status=Reflect.getMetadata(HTTP_CODE_METADATA,handler)??(verb==='post'?201:200),contentType=path==='/api/v1/live/stream'?'text/event-stream':'application/json';
    const successSchema=contentType==='text/event-stream'?{type:'string',description:'SSE sequence IDs, bounded replay, reset and session-expired events.'}:path.startsWith('/health/')?{type:'object',required:['status','environment','schemaVersion']}:path.startsWith('/internal/')||path.startsWith('/collect/')?{type:'object'}:path.endsWith('/openapi.json')?{type:'object',required:['openapi','info','paths','components']}:{$ref:'#/components/schemas/Envelope'};
    paths[path]??={};paths[path]![verb]={operationId:controller.name+'_'+name+'_'+verb+'_'+path.replace(/[^a-zA-Z0-9]/g,'_'),tags:[controller.name.replace('Controller','')],parameters,security:path.startsWith('/internal/')?[{sourceBearer:[]}]:publicRoute?[]:[{founderCookie:[]}],...(input?{requestBody:{required:true,content:{'application/json':{schema:input}}}}:{}),responses:{[String(status)]:{description:'Successful response',content:{[contentType]:{schema:successSchema}}},...Object.fromEntries([400,401,403,404,409,422,429,503].map(code=>[String(code),{description:'Request rejected or unavailable',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}}]))},...(path.includes('/billing/')?{'x-money-currency':'UZS','x-money-scale':0,'x-business-timezone':'Asia/Tashkent'}:{})};
   }
  }
 }
 return {openapi:'3.1.0',info:{title:'AutoMaktab Analytics',version:'1.0.0',description:'Founder-only monitoring and reviewed platform billing. Browser telemetry is untrusted; source completeness and financial intent proofs are checked separately.'},paths,components:{schemas:openApiSchemas,securitySchemes:{founderCookie:{type:'apiKey',in:'cookie',name:'analytics_session'},sourceBearer:{type:'http',scheme:'bearer'}}}};
}
