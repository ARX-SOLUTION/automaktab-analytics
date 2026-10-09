import {handleAsNodeRequest} from 'cloudflare:node';
import {createApiRuntime,createCollectionRuntime,createFoundationApplication,createSourceSync,loadConfig} from '@automaktab/api/application';
import {createCloudflareHandlers,createCloudflareRateLimiter} from './cloudflare-runtime.js';

interface Env {
 APP_ENV:string;
 PORT?:string;
 PUBLIC_ORIGIN?:string;
 FOUNDER_ID?:string;
 SSO_AUDIENCE?:string;
 CRM_SOURCE_URL?:string;
 CRM_AUTHORIZE_URL?:string;
 CRM_SOURCE_SERVICE_TOKEN?:string;
 INGEST_TOKEN?:string;
 PUBLIC_INGEST_ORIGINS?:string;
 HYPERDRIVE:Hyperdrive;
 INBOX_WAKEUPS:Queue;
 ASSETS:Fetcher;
}

const appPaths=['/api/v1','/collect/v1','/internal/v1','/health'];
let nextHttpPort=40000;
function isApplicationPath(path:string){const normalized=path.toLowerCase();return appPaths.some(prefix=>normalized===prefix||normalized.startsWith(prefix+'/'));}
function allocateHttpPort(){const port=nextHttpPort;nextHttpPort=port>=60000?40000:port+1;return port;}

function processEnvironment(env:Env):NodeJS.ProcessEnv{
 const values:Record<string,string|undefined>={
  APP_ENV:env.APP_ENV,
  PORT:env.PORT,
  PUBLIC_ORIGIN:env.PUBLIC_ORIGIN,
  FOUNDER_ID:env.FOUNDER_ID,
  SSO_AUDIENCE:env.SSO_AUDIENCE,
  CRM_SOURCE_URL:env.CRM_SOURCE_URL,
  CRM_AUTHORIZE_URL:env.CRM_AUTHORIZE_URL,
  CRM_SOURCE_SERVICE_TOKEN:env.CRM_SOURCE_SERVICE_TOKEN,
  INGEST_TOKEN:env.INGEST_TOKEN,
  PUBLIC_INGEST_ORIGINS:env.PUBLIC_INGEST_ORIGINS,
  DATABASE_URL:env.HYPERDRIVE.connectionString,
 };
 return Object.fromEntries(Object.entries(values).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
}

function unavailable(){
 return Response.json({error:{code:'REQUEST_FAILED',message:'Request unavailable',retryable:true},meta:{requestId:crypto.randomUUID(),apiVersion:1}},{status:503});
}

async function closeAfterResponse(response:Response,close:()=>Promise<void>,signal:AbortSignal):Promise<Response>{
 if(!response.body){await close();return response;}
 const reader=response.body.getReader();let closed:Promise<void>|undefined;
 const finish=()=>closed??=(async()=>{signal.removeEventListener('abort',abort);try{await close();}catch{/* avoid leaking runtime diagnostics to the client */}})();
 const abort=()=>{void reader.cancel(signal.reason).catch(()=>undefined);void finish();};
 signal.addEventListener('abort',abort,{once:true});
 if(signal.aborted)abort();
 const body=new ReadableStream<Uint8Array>({
  async pull(controller){
   try{const item=await reader.read();if(item.done){controller.close();await finish();}else controller.enqueue(item.value);}
   catch(error){controller.error(error);await finish();}
  },
  async cancel(reason){try{await reader.cancel(reason);}finally{await finish();}},
 });
 return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
}

async function serveApi(request:Request,env:Env):Promise<Response>{
 let runtime:Awaited<ReturnType<typeof createApiRuntime>>|undefined;
 let phase='configuration';
 try{
  const runtimeEnv=processEnvironment(env);
  loadConfig(runtimeEnv,{databaseTransport:'hyperdrive'});
  phase='application';
  runtime=await createApiRuntime(runtimeEnv,{databaseTransport:'hyperdrive'});
  const port=allocateHttpPort();
  phase='listen';
  await runtime.app.listen(port);
  phase='request';
  const response=await handleAsNodeRequest(port,request);
  phase='response';
  return await closeAfterResponse(response,runtime.close,request.signal);
 }catch(error){
  const cause=error instanceof Error?error.cause:undefined;
  const errorCode=cause&&typeof cause==='object'&&'code' in cause&&typeof cause.code==='string'&&/^[A-Z0-9_:-]{1,64}$/.test(cause.code)?cause.code:undefined;
  const failureCode=error instanceof Error&&/^[A-Z0-9_:-]{1,64}$/.test(error.message)?error.message:undefined;
  console.error('WORKER_API_FAILED',{phase,errorName:error instanceof Error?error.name:'UnknownError',failureCode,causeName:cause instanceof Error?cause.name:undefined,errorCode});
  try{await runtime?.close();}catch{/* keep request failures generic */}
  return unavailable();
 }
}

async function processInbox(env:Env):Promise<void>{
 const application=createFoundationApplication(processEnvironment(env),{databaseTransport:'hyperdrive'});
 try{await createCollectionRuntime(application.database,{environment:application.config.environment}).processBatch(100);}
 finally{await application.close();}
}

async function runScheduled(env:Env):Promise<void>{
 const application=createFoundationApplication(processEnvironment(env),{databaseTransport:'hyperdrive'});
 try{
  let failed=false;
  const sourceSync=createSourceSync(application.database,application.config);
  if(sourceSync.configured)try{await sourceSync.sync(false);}catch{failed=true;}
  try{await createCollectionRuntime(application.database,{environment:application.config.environment}).processBatch(100);}catch{failed=true;}
  if(failed)throw new Error('BACKGROUND_TASK_FAILED');
 }finally{await application.close();}
}

const allowRequest=createCloudflareRateLimiter();
const handlers=createCloudflareHandlers<Env>({
 fetchApi:serveApi,
 allowRequest,
 sendInboxHint:async env=>{await env.INBOX_WAKEUPS.send({type:'inbox-available',version:1});},
 processInbox,
 runScheduled,
});

export default {
 fetch(request:Request,env:Env,context:ExecutionContext):Promise<Response>{
  const path=new URL(request.url).pathname;
  return isApplicationPath(path)?handlers.fetch(request,env,context):env.ASSETS.fetch(request);
 },
 queue(batch:MessageBatch<unknown>,env:Env):Promise<void>{return handlers.queue(batch,env);},
 scheduled(event:ScheduledController,env:Env):Promise<void>{return handlers.scheduled(event,env);},
};
