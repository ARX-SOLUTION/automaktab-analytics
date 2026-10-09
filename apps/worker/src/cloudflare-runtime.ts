type QueueMessage = {ack():void;retry(options?:{delaySeconds?:number}):void};
type QueueBatch = {messages:readonly QueueMessage[]};
type ExecutionContext = {waitUntil(promise:Promise<unknown>):void};

const INBOX_WRITE_PATHS=new Set([
 '/collect/v1/events',
 '/internal/v1/events',
 '/internal/v1/snapshots',
 '/internal/v1/subject-aliases',
 '/internal/v1/subject-aliases/revoke',
]);

export interface CloudflareHandlerDependencies<Env> {
 fetchApi(request:Request,env:Env):Promise<Response>;
 allowRequest(request:Request):boolean;
 sendInboxHint(env:Env):Promise<void>;
 processInbox(env:Env):Promise<void>;
 runScheduled(env:Env):Promise<void>;
}

export interface CloudflareRateLimitOptions {readonly limit?:number;readonly windowMs?:number;readonly maxKeys?:number;}
export function createCloudflareRateLimiter(options:CloudflareRateLimitOptions={}){
 const windows=new Map<string,{at:number;count:number}>();
 const limit=options.limit??600,windowMs=options.windowMs??60000,maxKeys=options.maxKeys??4096;
 return (request:Request):boolean=>{
  const path=new URL(request.url).pathname.replace(/\/+$/,'').toLowerCase();
  if(path==='/health/live')return true;
  const candidate=request.headers.get('cf-connecting-ip')||'';
  const address=candidate.length<=64&&/^[a-f0-9:.]+$/i.test(candidate)?candidate:'unknown';
  const scope=path.startsWith('/internal/')?'internal':path==='/collect/v1/events'?'public':'owner';
  const key=`${address}:${scope}`,now=Date.now();
  if(windows.size>=maxKeys)for(const [id,window]of windows)if(now-window.at>=windowMs)windows.delete(id);
  const current=windows.get(key);
  if(!current&&windows.size>=maxKeys)return false;
  if(!current||now-current.at>=windowMs)windows.set(key,{at:now,count:1});
  else if(++current.count>limit)return false;
  return true;
 };
}

function rateLimited():Response{
 return Response.json({error:{code:'RATE_LIMITED',message:'Request unavailable',retryable:true},meta:{requestId:crypto.randomUUID(),apiVersion:1}},{status:429,headers:{'Retry-After':'60'}});
}

function releaseAfterStream(response:Response,release:()=>void,signal:AbortSignal):Response{
 if(!response.body){release();return response;}
 const reader=response.body.getReader();let released=false,canceled=false,cancellation:Promise<void>|undefined;
 const finish=()=>{if(released||cancellation)return;released=true;signal.removeEventListener('abort',abort);release();};
 const cancelReader=(reason?:unknown)=>{
  canceled=true;
  if(!cancellation)cancellation=reader.cancel(reason).finally(()=>{cancellation=undefined;finish();});
  return cancellation;
 };
 const abort=()=>{void cancelReader(signal.reason).catch(()=>undefined);};
 signal.addEventListener('abort',abort,{once:true});
 if(signal.aborted)abort();
 const body=new ReadableStream<Uint8Array>({
  async pull(controller){
   try{const item=await reader.read();if(item.done){if(!canceled)controller.close();finish();}else if(canceled)finish();else controller.enqueue(item.value);}
   catch(error){if(!canceled)controller.error(error);finish();}
  },
  async cancel(reason){await cancelReader(reason);},
 });
 return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
}

/** Queue entries are PII-free wakeup hints; the Postgres inbox remains authoritative. */
export function createCloudflareHandlers<Env>(dependencies:CloudflareHandlerDependencies<Env>,options:{readonly maxConcurrentLiveStreams?:number}={}){
 const maxConcurrentLiveStreams=options.maxConcurrentLiveStreams??2;
 if(!Number.isInteger(maxConcurrentLiveStreams)||maxConcurrentLiveStreams<1)throw new Error('INVALID_STREAM_LIMIT');
 let activeLiveStreams=0;
 return {
  async fetch(request:Request,env:Env,context:ExecutionContext):Promise<Response>{
   if(!dependencies.allowRequest(request))return rateLimited();
   const path=new URL(request.url).pathname;
   const liveStream=(request.method==='GET'||request.method==='HEAD')&&path.replace(/\/+$/,'').toLowerCase()==='/api/v1/live/stream';
   if(liveStream&&activeLiveStreams>=maxConcurrentLiveStreams)return rateLimited();
   if(liveStream)activeLiveStreams++;
   let response:Response;
   try{response=await dependencies.fetchApi(request,env);}
   catch(error){if(liveStream)activeLiveStreams--;throw error;}
   if(liveStream){
    if(response.status===200&&response.body)return releaseAfterStream(response,()=>{activeLiveStreams--;},request.signal);
    activeLiveStreams--;
   }
   if(request.method==='POST'&&response.status===202&&INBOX_WRITE_PATHS.has(path)){
    context.waitUntil(dependencies.sendInboxHint(env).catch(()=>undefined));
   }
   return response;
  },
  async queue(batch:QueueBatch,env:Env):Promise<void>{
   if(!batch.messages.length)return;
   try{
    await dependencies.processInbox(env);
    for(const message of batch.messages)message.ack();
   }catch{
    for(const message of batch.messages)message.retry({delaySeconds:5});
   }
  },
  scheduled(_event:unknown,env:Env):Promise<void>{return dependencies.runScheduled(env);},
 };
}
