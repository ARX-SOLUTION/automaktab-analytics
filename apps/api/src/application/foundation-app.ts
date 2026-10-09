import {createDatabase} from '../db/index.js';
import {loadConfig,type RuntimeConfigOptions} from '../platform/config.js';
import {Readiness} from './readiness.js';

export function createFoundationApplication(env:NodeJS.ProcessEnv,options:RuntimeConfigOptions={}){
 const config=loadConfig(env,options);const database=createDatabase(config);
 return {config,database,readiness:new Readiness(database,config.environment),close:()=>database.pool.end()};
}

export type FoundationApplication=ReturnType<typeof createFoundationApplication>;
