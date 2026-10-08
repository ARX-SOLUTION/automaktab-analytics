import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'automaktab-synthetic-type-proof-'));
try {
 const source=join(dir,'invalid.ts');
 await writeFile(source,'const unused: number = "wrong"; unknownIdentifier; export {};');
 const result=spawnSync('pnpm',['exec','tsc','--ignoreConfig','--noEmit','--strict','--noUnusedLocals','--noUnusedParameters','--skipLibCheck',source],{encoding:'utf8'});
 assert.notEqual(result.status,0);
 for (const diagnostic of ['TS2322','TS2304','TS6133']) assert(result.stdout.includes(diagnostic),result.stdout+result.stderr);
 console.log('PASS TypeScript7 rejects mismatched type, undefined identifier and unused local');
} finally {await rm(dir,{recursive:true,force:true});}
