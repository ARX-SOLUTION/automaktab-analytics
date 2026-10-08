import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import type {RuntimeConfig} from '../platform/config.js';
export function createDatabase(config:RuntimeConfig){
 const pool=new pg.Pool({connectionString:config.databaseUrl,max:2,connectionTimeoutMillis:3000,statement_timeout:10000,query_timeout:15000,options:'-c lock_timeout=5000'});
 pool.on('error',()=>{/* readiness reports unavailable; never emit connection details */});
 return {pool,db:drizzle(pool)};
}
export type Database=ReturnType<typeof createDatabase>;
export type Transaction=Parameters<Parameters<Database['db']['transaction']>[0]>[0];
