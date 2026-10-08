import {sql,type SQL} from 'drizzle-orm';
import type {Database} from './index.js';
export type ProductExecutor=Pick<Database['db'],'execute'>;
export interface Actor {id:string;environment:'synthetic'|'development'|'production';}
export class ProductStore {
 constructor(readonly database:Database){}
 async query<T extends Record<string,unknown>>(executor:ProductExecutor,query:SQL):Promise<T[]>{const result=await executor.execute(query);return result.rows as T[];}
 transaction<T>(work:(tx:ProductExecutor)=>Promise<T>):Promise<T>{return this.database.db.transaction(async tx=>work(tx));}
 async lock(tx:ProductExecutor,companyId:string,environment:string){await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'billing:'+environment+':'+companyId}))`);}
}
