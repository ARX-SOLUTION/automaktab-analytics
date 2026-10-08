import {hasFoundationSchema,hasProductSchema} from '../db/foundation-schema.js';
import {createDatabase,type Database} from '../db/index.js';
import {loadConfig} from '../platform/config.js';
import type {HealthStatus} from '@automaktab/contracts';
export {loadConfig} from '../platform/config.js';
export {createDatabase} from '../db/index.js';
export {createCollectionRuntime} from '../modules/collection/worker.js';
export {createSourceSync} from './source-sync.js';
export class Readiness {
 private inFlight:Promise<HealthStatus>|undefined;
 private productChecks=false;
 constructor(private readonly database:Database,readonly environment:HealthStatus['environment']='synthetic'){}
 enableProductChecks(){this.productChecks=true;}
 check():Promise<HealthStatus>{
  if(this.inFlight)return this.inFlight;
  this.inFlight=this.inspect().finally(()=>{this.inFlight=undefined;});return this.inFlight;
 }
 private async inspect():Promise<HealthStatus>{
  try {
   if(!await hasFoundationSchema(this.database.db))throw new Error();
   if(this.productChecks&&!await hasProductSchema(this.database.db))throw new Error();
   return {status:'ready',environment:this.environment,schemaVersion:1};
  }catch{return {status:'notReady',environment:this.environment,schemaVersion:1};}
 }
}
export function createFoundationApplication(env:NodeJS.ProcessEnv){
 const config=loadConfig(env);const database=createDatabase(config);
 return {config,database,readiness:new Readiness(database,config.environment),close:()=>database.pool.end()};
}
