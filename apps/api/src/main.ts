import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {foundationModule} from './app.module.js';
import {createFoundationApplication} from './application/index.js';
import {SafeErrorFilter} from './platform/errors.js';
import {protection} from './platform/http.js';
export async function startApi(env:NodeJS.ProcessEnv){
 const application=createFoundationApplication(env);
 try {
  const config=application.config;
  const app=await NestFactory.create<NestExpressApplication>(foundationModule(application,{environment:config.environment,origin:config.publicOrigin,founderId:config.founderId,sourceUrl:config.sourceUrl,sourceServiceToken:config.sourceServiceToken,sourceAuthorizeUrl:config.sourceAuthorizeUrl,audience:config.audience}),{logger:false,abortOnError:false,bodyParser:false});
  app.useGlobalFilters(new SafeErrorFilter());
  // Parse valid JSON primitives too; each use case validates shape and financial rejections stay recoverable.
  app.use(protection(config));app.useBodyParser('json',{limit:'1mb',strict:false});
  if(config.environment!=='synthetic'){
   const web=resolve('apps/web/dist');if(!existsSync(resolve(web,'index.html')))throw new Error('WEB_BUILD_MISSING');app.useStaticAssets(web,{index:false,fallthrough:true});await app.init();
   app.getHttpAdapter().getInstance().get('/{*path}',(request:{path:string;headers:{accept?:string}},response:{sendFile(path:string):void},next:()=>void)=>{if(!['/api/','/internal/','/collect/','/health/'].some(prefix=>request.path.startsWith(prefix))&&request.headers.accept?.includes('text/html'))response.sendFile(resolve(web,'index.html'));else next();});
  }

  const server=app.getHttpServer();server.maxConnections=64;server.maxRequestsPerSocket=100;server.setTimeout(20000);server.requestTimeout=15000;server.headersTimeout=10000;
  await app.listen(application.config.port,'0.0.0.0');
  let closing:Promise<void>|undefined;
  return {app,application,close:()=>closing??=(async()=>{await app.close();await application.close();})()};
 }catch{await application.close();throw new Error('STARTUP_FAILED');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 startApi(process.env).then(runtime=>{const stop=()=>{runtime.close().then(()=>process.exit(0)).catch(()=>process.exit(1));};process.once('SIGTERM',stop);process.once('SIGINT',stop);}).catch(()=>{console.error('STARTUP_FAILED');process.exitCode=1;});
}
