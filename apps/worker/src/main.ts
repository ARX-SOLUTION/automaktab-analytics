import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {createCollectionRuntime,createFoundationApplication,createSourceSync} from '@automaktab/api/application';
export async function startWorker(env:NodeJS.ProcessEnv){
 const application=createFoundationApplication(env);
 application.readiness.enableProductChecks();
 const collection=createCollectionRuntime(application.database,{environment:application.config.environment});
 const sourceSync=createSourceSync(application.database,application.config);
 let stopped=false,lastFailure=false,lastSourceFailure=false,inFlight:Promise<void>|undefined,sourceInFlight:Promise<void>|undefined,timer:ReturnType<typeof setTimeout>|undefined,sourceTimer:ReturnType<typeof setTimeout>|undefined;
 const dispatch=()=>{
  if(stopped)return;
  inFlight=collection.processBatch(100).then(()=>{lastFailure=false;}).catch(()=>{lastFailure=true;}).finally(()=>{inFlight=undefined;if(!stopped)timer=setTimeout(dispatch,500);});
 };
 const synchronize=()=>{
  if(stopped||!sourceSync.configured)return;
  sourceInFlight=sourceSync.sync(false).then(()=>{lastSourceFailure=false;}).catch(()=>{lastSourceFailure=true;}).finally(()=>{sourceInFlight=undefined;if(!stopped)sourceTimer=setTimeout(synchronize,30000);});
 };
 const server=createServer((req,res)=>{
  if(req.method!=='GET'||!['/health/live','/health/ready'].includes(req.url??'')){res.writeHead(404);res.end();return;}
  if(req.url==='/health/live'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({status:'live',environment:application.config.environment,schemaVersion:1}));return;}
  application.readiness.check().then(state=>{const ready=state.status==='ready'&&!lastFailure&&!lastSourceFailure;res.writeHead(ready?200:503,{'content-type':'application/json'});res.end(JSON.stringify(ready?state:{...state,status:'notReady'}));}).catch(()=>{res.writeHead(503);res.end();});
 });
 server.maxConnections=64;server.maxRequestsPerSocket=100;server.setTimeout(20000);server.requestTimeout=15000;server.headersTimeout=10000;
 try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(application.config.port,'0.0.0.0',resolve);});}catch{await application.close();throw new Error('STARTUP_FAILED');}
 dispatch();synchronize();
 let closing:Promise<void>|undefined;
 return {close:()=>closing??=(async()=>{stopped=true;if(timer)clearTimeout(timer);if(sourceTimer)clearTimeout(sourceTimer);await Promise.all([inFlight,sourceInFlight]);await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));await application.close();})()};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 startWorker(process.env).then(runtime=>{const stop=()=>runtime.close().then(()=>process.exit(0)).catch(()=>process.exit(1));process.once('SIGTERM',stop);process.once('SIGINT',stop);}).catch(()=>{console.error('STARTUP_FAILED');process.exitCode=1;});
}
