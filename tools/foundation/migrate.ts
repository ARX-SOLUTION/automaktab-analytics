import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {hasFoundationSchema,hasProductSchema} from '../../apps/api/src/db/foundation-schema.js';
import {createFoundationApplication} from '../../apps/api/src/application/index.js';
export async function migrate(){
 const app=createFoundationApplication(process.env);
 try{const files=(await readdir('apps/api/drizzle')).filter(name=>/^\d{4}-.+\.sql$/.test(name)).sort();
  await app.database.db.transaction(async tx=>{
   await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('automaktab-schema-migration-v1'))`);
   await tx.execute(await readFile('apps/api/drizzle/0000-foundation.sql','utf8'));if(!await hasFoundationSchema(tx))throw new Error('MIGRATION_SCHEMA_INCOMPATIBLE');
   await tx.execute(sql`CREATE TABLE IF NOT EXISTS analytics_schema_migrations(name text PRIMARY KEY,content_hash text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
   for(const file of files){const migration=await readFile('apps/api/drizzle/'+file,'utf8'),hash=createHash('sha256').update(migration).digest('hex');const result=await tx.execute(sql`SELECT content_hash FROM analytics_schema_migrations WHERE name=${file}`);const applied=result.rows[0];if(applied){if(applied.content_hash!==hash)throw new Error('MIGRATION_HASH_CONFLICT');continue;}if(file!=='0000-foundation.sql')await tx.execute(migration);await tx.execute(sql`INSERT INTO analytics_schema_migrations(name,content_hash) VALUES(${file},${hash})`);}
   if(!await hasProductSchema(tx))throw new Error('MIGRATION_SCHEMA_INCOMPATIBLE');
  });app.readiness.enableProductChecks();if((await app.readiness.check()).status!=='ready')throw new Error('MIGRATION_SCHEMA_INCOMPATIBLE');
 }finally{await app.close();}
}
if(process.argv[1]?.endsWith('/migrate.js'))await migrate();
