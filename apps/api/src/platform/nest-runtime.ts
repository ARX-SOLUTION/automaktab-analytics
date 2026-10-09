import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import type {NestExpressApplication} from '@nestjs/platform-express';
import type {RuntimeConfigOptions} from './config.js';
import {SafeErrorFilter} from './errors.js';
import {protection} from './http.js';
import {foundationModule} from '../app.module.js';
import {createFoundationApplication} from '../application/foundation-app.js';

export async function createApiRuntime(env:NodeJS.ProcessEnv,options:RuntimeConfigOptions={}){
 const application=createFoundationApplication(env,options);
 try{
  const config=application.config;
  const app=await NestFactory.create<NestExpressApplication>(foundationModule(application,{environment:config.environment,origin:config.publicOrigin,founderId:config.founderId,sourceUrl:config.sourceUrl,sourceServiceToken:config.sourceServiceToken,sourceAuthorizeUrl:config.sourceAuthorizeUrl,audience:config.audience}),{logger:false,abortOnError:false,bodyParser:false});
  app.useGlobalFilters(new SafeErrorFilter());
  app.use(protection(config));app.useBodyParser('json',{limit:'1mb',strict:false});
  let closing:Promise<void>|undefined;
  return {app,application,close:()=>closing??=(async()=>{try{await app.close();}finally{await application.close();}})()};
 }catch(error){try{await application.close();}catch{/* preserve the original startup failure */}throw new Error('STARTUP_FAILED',{cause:error});}
}
