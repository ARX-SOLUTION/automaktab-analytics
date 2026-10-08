import assert from 'node:assert/strict';
import {sql} from 'drizzle-orm';
import {createFoundationApplication} from '../../apps/api/src/application/index.js';
import {migrate} from './migrate.js';
const app=createFoundationApplication(process.env);
try {
 // Dedicated synthetic checks database only. Never drop tables or reset persistent stack data.
 await migrate();assert.equal((await app.readiness.check()).status,'ready');
 await app.database.db.execute(sql`INSERT INTO foundation_probe(id) VALUES ('upgrade-preserved') ON CONFLICT DO NOTHING`);
 await migrate();await migrate();
 const constraints=await app.database.db.execute(sql`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.foundation_version'::regclass ORDER BY contype`);assert.ok(constraints.rows.some(row=>String(row.definition).includes('id = 1')));
 const rows=await app.database.db.execute(sql`SELECT id FROM foundation_probe WHERE id='upgrade-preserved'`);assert.equal(rows.rows.length,1);assert.equal((await app.readiness.check()).status,'ready');
 console.log('PASS foundation migration apply/reapply, populated schema preservation and readiness fingerprint');
}finally{await app.close();}
