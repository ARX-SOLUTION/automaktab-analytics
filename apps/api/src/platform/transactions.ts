import type {Database,Transaction} from '../db/index.js';
import {foundationProbe} from '../db/schema.js';
export class UnitOfWork {
 constructor(private readonly database:Database){}
 run<T>(work:(tx:Transaction)=>Promise<T>):Promise<T>{return this.database.db.transaction(tx=>work(tx));}
}
export class ProbeRepository {
 insert(tx:Transaction,id:string){return tx.insert(foundationProbe).values({id});}
 list(tx:Transaction){return tx.select().from(foundationProbe);}
}
