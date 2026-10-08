import assert from 'node:assert/strict';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { probe } from './schema.js';
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL, max:2, connectionTimeoutMillis:3000, statement_timeout:10000, query_timeout:15000, options:'-c lock_timeout=5000'});
const db=drizzle(pool);
try { await migrate(db,{migrationsFolder:'./drizzle'}); await assert.rejects(db.transaction(async tx=>{await tx.insert(probe).values({id:'rollback-probe'});throw new Error('intended rollback');}), /intended rollback/); assert.deepEqual(await db.select().from(probe), []); await db.transaction(async tx=>{await tx.insert(probe).values({id:'committed-probe'});}); assert.deepEqual(await db.select().from(probe), [{id:'committed-probe'}]); await db.delete(probe); console.log('PASS Drizzle generated migration, real PostgreSQL commit/query/rollback'); } finally {await pool.end();}
