import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createApiRuntime} from './platform/nest-runtime.js';
export async function startApi(env:NodeJS.ProcessEnv){
 let runtime:Awaited<ReturnType<typeof createApiRuntime>>|undefined;
 try {
  runtime=await createApiRuntime(env);const {app,application}=runtime;const config=application.config;
  if(config.environment!=='synthetic'){
   const web=resolve('apps/web/dist');if(!existsSync(resolve(web,'index.html')))throw new Error('WEB_BUILD_MISSING');app.useStaticAssets(web,{index:false,fallthrough:true});await app.init();
   app.getHttpAdapter().getInstance().get('/{*path}',(request:{path:string;headers:{accept?:string}},response:{sendFile(path:string):void},next:()=>void)=>{if(!['/api/','/internal/','/collect/','/health/'].some(prefix=>request.path.startsWith(prefix))&&request.headers.accept?.includes('text/html'))response.sendFile(resolve(web,'index.html'));else next();});
  }

  const server=app.getHttpServer();server.maxConnections=64;server.maxRequestsPerSocket=100;server.setTimeout(20000);server.requestTimeout=15000;server.headersTimeout=10000;
  await app.listen(application.config.port,'0.0.0.0');
  return runtime;
 }catch{await runtime?.close();throw new Error('STARTUP_FAILED');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 startApi(process.env).then(runtime=>{const stop=()=>{runtime.close().then(()=>process.exit(0)).catch(()=>process.exit(1));};process.once('SIGTERM',stop);process.once('SIGINT',stop);}).catch(()=>{console.error('STARTUP_FAILED');process.exitCode=1;});
}
