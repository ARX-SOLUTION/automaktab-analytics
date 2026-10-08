import {afterAll,expect,test} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createFoundationApplication} from '../src/application/index.js';
import {ProductStore} from '../src/db/product-store.js';
import {createCollectionRuntime} from '../src/modules/collection/worker.js';
import {snapshotHash} from '../src/modules/schools/schools.service.js';
import type {SourceRecord} from '@automaktab/contracts';
const application=createFoundationApplication({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL});
const store=new ProductStore(application.database);
afterAll(()=>application.close());
test('source-issued cutover seeds v0, worker waits for missing versions, and barrier proof catches up atomically',async()=>{
 const source='crm-'+randomUUID(),company=randomUUID(),branch=randomUUID(),student=randomUUID(),token='synthetic-fixture';
 const runtime=createCollectionRuntime(store,{environment:'synthetic',trustedSource:source,trustedToken:token});
 const cutover='2026-08-31T19:00:00Z',now=new Date().toISOString();
 const baseline:SourceRecord[]=[
  {aggregate_type:'company',aggregate_id:company,aggregate_version:'0',company_id:company,properties:{name:'Synthetic School',slug:'synthetic-'+company,status:'active',is_demo:false,created_at:cutover,deleted_at:null}},
  {aggregate_type:'branch',aggregate_id:branch,aggregate_version:'0',company_id:company,properties:{name:'Synthetic Branch',company_id:company,is_active:true,created_at:cutover,deleted_at:null}},
  {aggregate_type:'student',aggregate_id:student,aggregate_version:'0',company_id:company,properties:{company_id:company,branch_id:branch,status:'active',created_at:cutover,deleted_at:null,billing_subject_id:student}}
 ];
 const snapshot=(records:SourceRecord[],barrier:string)=>({schema_version:1,source,environment:'synthetic',cutover_at:cutover,as_of:now,barrier_version:barrier,snapshot_hash:snapshotHash(records),records,heads:records.map(({aggregate_type,aggregate_id,aggregate_version})=>({aggregate_type,aggregate_id,aggregate_version})),signal_heads:[],baseline_records:baseline,baseline_hash:snapshotHash(baseline)});
 await runtime.collector.acceptSnapshot(snapshot(baseline,'0'),'Bearer '+token);
 const event=(version:string,status:string)=>({event_id:randomUUID(),schema_version:1,name:'student.updated',source,environment:'synthetic',occurred_at:now,effective_at:'2026-09-'+(version==='1'?'10':'20')+'T00:00:00Z',aggregate_type:'student',aggregate_id:student,aggregate_version:version,company_id:company,properties:{...baseline[2]!.properties,status}});
 const second=event('2','completed');await runtime.collector.admit({events:[second]},'trusted','Bearer '+token);
 expect((await runtime.processBatch()).deferred).toBeGreaterThanOrEqual(1);
 expect(await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'))).toMatchObject({complete:false,blockers:expect.arrayContaining(['VERSION_GAP'])});
 const first=event('1','suspended');await runtime.collector.admit({events:[first]},'trusted','Bearer '+token);
 await runtime.processBatch();await runtime.processBatch();
 const current=baseline.map(record=>record.aggregate_id===student?{...record,aggregate_version:'2',properties:second.properties}:record);
 expect((await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'))).blockers).toContain('SOURCE_HEADS_MISMATCH');
 await runtime.collector.acceptSnapshot(snapshot(current,'2'),'Bearer '+token);
 const basis=await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'));
 expect(basis.complete).toBe(true);expect(basis.intervals.map(interval=>interval.status)).toEqual(['active','suspended','completed']);
 expect(await runtime.schools.detail({id:'synthetic-founder',environment:'synthetic'},company)).toMatchObject({id:company,activeStudents:0});
 await expect(runtime.collector.acceptSnapshot({...snapshot(current,'2'),baseline_hash:'wrong'},'Bearer '+token)).rejects.toThrow('SNAPSHOT_HASH_MISMATCH');
 const unknown={...event('3','active'),schema_version:2,properties:{phone:'998901234567'}};
 expect((await runtime.collector.admit({events:[unknown]},'trusted','Bearer '+token)).events[0]?.status).toBe('rejected');
 expect((await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'))).blockers).toContain('UNKNOWN_SCHEMA');
});
test('a source proof is required for aliases and revocation makes the current basis incomplete',async()=>{
 const source='crm-'+randomUUID(),token='synthetic-alias',company=randomUUID(),branch=randomUUID(),original=randomUUID(),replacement=randomUUID(),now=new Date().toISOString(),cutover='2026-08-31T19:00:00Z';
 const runtime=createCollectionRuntime(store,{environment:'synthetic',trustedSource:source,trustedToken:token});
 const baseline:SourceRecord[]=[
  {aggregate_type:'company',aggregate_id:company,aggregate_version:'0',company_id:company,properties:{name:'Synthetic Alias School',slug:'alias-'+company,status:'suspended',is_demo:false,created_at:cutover,deleted_at:null}},
  {aggregate_type:'branch',aggregate_id:branch,aggregate_version:'0',company_id:company,properties:{name:'Synthetic Branch',company_id:company,is_active:true,created_at:cutover,deleted_at:null}},
  {aggregate_type:'student',aggregate_id:original,aggregate_version:'0',company_id:company,properties:{company_id:company,branch_id:branch,status:'active',created_at:cutover,deleted_at:null,billing_subject_id:original}}
 ];
 const snapshot=(records:SourceRecord[],version:string)=>({schema_version:1,source,environment:'synthetic',cutover_at:cutover,as_of:now,barrier_version:version,snapshot_hash:snapshotHash(records),records,heads:records.map(({aggregate_type,aggregate_id,aggregate_version})=>({aggregate_type,aggregate_id,aggregate_version})),signal_heads:[],baseline_records:baseline,baseline_hash:snapshotHash(baseline)});
 await runtime.collector.acceptSnapshot(snapshot(baseline,'0'),'Bearer '+token);
 const suspendedBasis=await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'));expect(suspendedBasis.complete).toBe(true);expect(suspendedBasis.intervals[0]).toMatchObject({status:'active',deleted:false});
 const properties={...baseline[2]!.properties},effective='2026-09-10T00:00:00Z';
 const event={event_id:randomUUID(),schema_version:1,name:'student.updated',source,environment:'synthetic',occurred_at:now,effective_at:effective,aggregate_type:'student',aggregate_id:replacement,aggregate_version:'1',company_id:company,properties};
 await runtime.collector.admit({events:[event]},'trusted','Bearer '+token);await runtime.processBatch();
 expect((await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'))).blockers).toContain('ALIAS_NOT_VERIFIED');
 const proofId=randomUUID();await runtime.schools.verifyAlias({source,environment:'synthetic',companyId:company,subjectId:replacement,canonicalId:original,effectiveAt:effective,proofId},'Bearer '+token);
 await runtime.processBatch();
 const current:SourceRecord[]=[...baseline,{aggregate_type:'student',aggregate_id:replacement,aggregate_version:'1',company_id:company,properties}];
 await runtime.collector.acceptSnapshot(snapshot(current,'1'),'Bearer '+token);
 expect(await runtime.schools.detail({id:'synthetic-founder',environment:'synthetic'},company)).toMatchObject({activeStudents:1});
 await runtime.schools.revokeAlias({source,environment:'synthetic',companyId:company,proofId,revokedAt:'2026-09-20T00:00:00Z'},'Bearer '+token);
 expect((await store.transaction(tx=>runtime.schools.getBasis(tx,company,'2026-09-01','2026-10-01','synthetic'))).blockers).toContain('ALIAS_NOT_VERIFIED');
 expect(await runtime.schools.qualitySummary({id:'synthetic-founder',environment:'synthetic'},{companyId:company})).toMatchObject({status:'partial',warnings:expect.arrayContaining(['ALIAS_NOT_VERIFIED'])});
});
