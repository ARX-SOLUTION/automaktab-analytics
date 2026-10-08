import {afterAll,beforeAll,expect,test} from 'vitest';
import {createFoundationApplication} from '../src/application/index.js';
import {UnitOfWork,ProbeRepository} from '../src/platform/transactions.js';
import {sql} from 'drizzle-orm';
import {startApi} from '../src/main.js';
import {Readiness} from '../src/application/index.js';
const env={APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL,PORT:'18301'};
const application=createFoundationApplication(env);
beforeAll(async()=>{expect((await application.readiness.check()).status).toBe('ready');});
afterAll(()=>application.close());
test('supplied transaction persists commit but no rollback probe',async()=>{const uow=new UnitOfWork(application.database);const repository=new ProbeRepository();await application.database.db.execute(sql`DELETE FROM foundation_probe`);await expect(uow.run(async tx=>{await repository.insert(tx,'rolled-back');throw new Error('ROLLBACK');})).rejects.toThrow('ROLLBACK');expect(await uow.run(tx=>repository.list(tx))).toEqual([]);await uow.run(tx=>repository.insert(tx,'committed'));expect(await uow.run(tx=>repository.list(tx))).toEqual([{id:'committed'}]);});
test('incompatible schema fails readiness without SQL disclosure',async()=>{await application.database.db.execute(sql`UPDATE foundation_version SET version=2 WHERE id=1`);try{expect(await application.readiness.check()).toEqual({status:'notReady',environment:'synthetic',schemaVersion:1});}finally{await application.database.db.execute(sql`UPDATE foundation_version SET version=1 WHERE id=1`);}});
test('real Nest HTTP liveness/readiness and safe unknown route',async()=>{const runtime=await startApi(env);try{for(const path of ['live','ready']){const result=await fetch('http://127.0.0.1:18301/health/'+path);expect(result.status).toBe(200);expect((await result.json()).status).toBe(path==='live'?'live':'ready');}const missing=await fetch('http://127.0.0.1:18301/private');expect(missing.status).toBe(404);expect(JSON.stringify(await missing.json())).not.toMatch(/secret|postgres|stack/);}finally{await runtime.close();}});
test('health transport bounds concurrent connections',async()=>{const runtime=await startApi({...env,PORT:'18305'});try{expect(runtime.app.getHttpServer().maxConnections).toBe(64);}finally{await runtime.close();}});
test('product readiness rejects a partial command schema and disabled invoice immutability',async()=>{
 const readiness=new Readiness(application.database);readiness.enableProductChecks();expect((await readiness.check()).status).toBe('ready');
 await application.database.db.execute(sql`ALTER TABLE billing_http_intents RENAME TO synthetic_readiness_saved_intents`);
 try{expect((await readiness.check()).status).toBe('notReady');}finally{await application.database.db.execute(sql`ALTER TABLE synthetic_readiness_saved_intents RENAME TO billing_http_intents`);}
 await application.database.db.execute(sql`ALTER TABLE billing_invoices DISABLE TRIGGER immutable_financial_record`);
 try{expect((await readiness.check()).status).toBe('notReady');}finally{await application.database.db.execute(sql`ALTER TABLE billing_invoices ENABLE TRIGGER immutable_financial_record`);}
 expect((await readiness.check()).status).toBe('ready');
});
test('unexpected foundation version column prevents ready',async()=>{await application.database.db.execute(sql`ALTER TABLE foundation_version ADD COLUMN unexpected text`);try{expect((await application.readiness.check()).status).toBe('notReady');}finally{await application.database.db.execute(sql`ALTER TABLE foundation_version DROP COLUMN unexpected`);}});
test('concurrent health calls share one bounded database inspection',async()=>{const client=await application.database.pool.connect();try{await client.query('BEGIN');await client.query('LOCK TABLE foundation_version IN ACCESS EXCLUSIVE MODE');const started=Date.now();const checks=Array.from({length:64},()=>application.readiness.check());expect(new Set(checks).size).toBe(1);const states=await Promise.all(checks);expect(states.every(state=>state.status==='notReady')).toBe(true);expect(Date.now()-started).toBeLessThan(8000);}finally{await client.query('ROLLBACK');client.release();}expect((await application.readiness.check()).status).toBe('ready');});
test('wrong primary key column prevents schema readiness',async()=>{await application.database.db.execute(sql`ALTER TABLE foundation_version DROP CONSTRAINT foundation_version_pkey`);await application.database.db.execute(sql`ALTER TABLE foundation_version ADD PRIMARY KEY(version)`);try{expect((await application.readiness.check()).status).toBe('notReady');}finally{await application.database.db.execute(sql`ALTER TABLE foundation_version DROP CONSTRAINT foundation_version_pkey`);await application.database.db.execute(sql`ALTER TABLE foundation_version ADD PRIMARY KEY(id)`);}});
import {migrate} from '../../../tools/foundation/migrate.js';
test('incompatible existing probe rolls back newly created version table',async()=>{
 await application.database.db.transaction(async tx=>{
  await tx.execute(sql`ALTER TABLE foundation_probe RENAME TO t02_atomicity_saved_probe`);
  await tx.execute(sql`ALTER TABLE foundation_version RENAME TO t02_atomicity_saved_version`);
  await tx.execute(sql`CREATE TABLE foundation_probe (id integer PRIMARY KEY)`);
  await tx.execute(sql`INSERT INTO foundation_probe(id) VALUES (42)`);
 });
 try{
  await expect(migrate()).rejects.toThrow('MIGRATION_SCHEMA_INCOMPATIBLE');
  const version=await application.database.db.execute(sql`SELECT to_regclass('public.foundation_version') AS table_name`);
  expect(version.rows[0]?.table_name).toBeNull();
  const original=await application.database.db.execute(sql`SELECT id FROM foundation_probe`);
  expect(original.rows).toEqual([{id:42}]);
 }finally{
  await application.database.db.transaction(async tx=>{
   await tx.execute(sql`DROP TABLE IF EXISTS foundation_version`);
   await tx.execute(sql`DROP TABLE foundation_probe`);
   await tx.execute(sql`ALTER TABLE t02_atomicity_saved_probe RENAME TO foundation_probe`);
   await tx.execute(sql`ALTER TABLE t02_atomicity_saved_version RENAME TO foundation_version`);
  });
 }
});
