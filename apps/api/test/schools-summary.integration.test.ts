import {afterAll,expect,test} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createFoundationApplication} from '../src/application/index.js';
import {createCollectionRuntime} from '../src/modules/collection/worker.js';
import {snapshotHash} from '../src/modules/schools/schools.service.js';
import type {SourceRecord} from '@automaktab/contracts';
const app=createFoundationApplication({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL});
const actor={id:'synthetic-founder',environment:'synthetic' as const};
const cutover='2026-08-31T19:00:00Z',token='synthetic-summary-fixture';
afterAll(()=>app.close());
function company(id:string,name:string):SourceRecord{return {aggregate_type:'company',aggregate_id:id,aggregate_version:'0',company_id:id,properties:{name,slug:'school-'+id,status:'suspended',is_demo:false,created_at:cutover,deleted_at:null}};}
function branch(id:string,companyId:string,active=true):SourceRecord{return {aggregate_type:'branch',aggregate_id:id,aggregate_version:'0',company_id:companyId,properties:{name:'Synthetic Branch',company_id:companyId,is_active:active,created_at:cutover,deleted_at:null}};}
function student(id:string,companyId:string,branchId:string,status='active'):SourceRecord{return {aggregate_type:'student',aggregate_id:id,aggregate_version:'0',company_id:companyId,properties:{company_id:companyId,branch_id:branchId,status,created_at:cutover,deleted_at:null,billing_subject_id:id}};}
async function fixture(records:SourceRecord[],asOf=new Date().toISOString()){
 const source='crm-'+randomUUID(),runtime=createCollectionRuntime(app.database,{environment:'synthetic',trustedSource:source,trustedToken:token});
 await runtime.collector.acceptSnapshot({schema_version:1,source,environment:'synthetic',cutover_at:cutover,as_of:asOf,barrier_version:'0',snapshot_hash:snapshotHash(records),records,heads:records.map(({aggregate_type,aggregate_id,aggregate_version})=>({aggregate_type,aggregate_id,aggregate_version})),signal_heads:[],baseline_records:records,baseline_hash:snapshotHash(records)},'Bearer '+token);
 return {source,...runtime};
}
test('global source counts and completeness cover schools beyond the first page',async()=>{
 const prefix='summary-'+randomUUID(),records:SourceRecord[]=[],companies:string[]=[];
 for(let index=0;index<105;index++){const id=prefix+'-'+String(index).padStart(3,'0'),branchId=id+'-branch';companies.push(id);records.push(company(id,'Synthetic Summary '+index),branch(branchId,id,index!==104),student(id+'-student',id,branchId));}
 const runtime=await fixture(records);
 expect(await runtime.schools.summary(actor)).toMatchObject({schools:105,branches:105,activeStudents:105,status:'fresh'});
 const first=await runtime.schools.list(actor,{limit:100});expect(first.items).toHaveLength(100);expect(first.nextCursor).not.toBeNull();
 expect((await runtime.schools.list(actor,{limit:100,companyId:companies[104]})).items).toMatchObject([{id:companies[104],activeStudents:1}]);
 const initial=await runtime.schools.dataStatus(actor);expect(initial).toMatchObject({complete:true,total:105});expect(initial.sources).toHaveLength(100);expect(initial.nextCursor).not.toBeNull();
 const invalid={event_id:randomUUID(),schema_version:2,name:'company.updated',source:runtime.source,environment:'synthetic',occurred_at:new Date().toISOString(),effective_at:new Date().toISOString(),aggregate_type:'company',aggregate_id:companies[104],aggregate_version:'1',company_id:companies[104],properties:{private:'discarded'}};
 await runtime.collector.admit({events:[invalid]},'trusted','Bearer '+token);
 expect(await runtime.schools.qualitySummary(actor)).toMatchObject({status:'partial',warnings:expect.arrayContaining(['UNKNOWN_SCHEMA'])});
 expect(await runtime.schools.summary(actor)).toMatchObject({activeStudents:null});
 expect(await runtime.schools.summary(actor,{companyId:companies[0]})).toMatchObject({schools:1,branches:1,activeStudents:1});
 expect(await runtime.schools.dataStatus(actor)).toMatchObject({complete:false,total:105,blockers:expect.arrayContaining(['UNKNOWN_SCHEMA'])});
 expect((await runtime.schools.dataStatus(actor,{cursor:first.nextCursor!})).sources).toHaveLength(5);
});
test('inactive branches keep source-active students eligible and detail counts every branch',async()=>{
 const id=randomUUID(),other=randomUUID(),records:SourceRecord[]=[company(id,'Synthetic Many Branches'),company(other,'Synthetic Other School')],branches:string[]=[];
 for(let index=0;index<105;index++){const branchId='branch-'+id+'-'+String(index).padStart(3,'0');branches.push(branchId);records.push(branch(branchId,id,index!==104),student(branchId+'-student',id,branchId,index===104?'active':'completed'));}
 const foreign='foreign-'+other;records.push(branch(foreign,other));const runtime=await fixture(records);
 const detail=await runtime.schools.detail(actor,id);expect(detail).toMatchObject({branchesCount:105,activeStudents:1});expect(detail.branches).toHaveLength(100);expect(detail.branchesNextCursor).not.toBeNull();
 expect((await runtime.schools.branches(actor,id,{cursor:detail.branchesNextCursor!})).items).toHaveLength(5);
 expect(await runtime.schools.summary(actor,{companyId:id,branchId:branches[104]})).toMatchObject({schools:1,branches:1,activeStudents:1});
 await expect(runtime.schools.summary(actor,{companyId:id,branchId:foreign})).rejects.toThrow('NOT_FOUND');
 await expect(runtime.schools.summary(actor,{branchId:branches[104]})).rejects.toThrow('INVALID_REQUEST');
});
test('an empty authoritative source is known zero while absent proof stays unknown despite unrelated fresh snapshots',async()=>{
 const empty=await fixture([]);
 expect(await empty.schools.summary(actor)).toMatchObject({schools:0,branches:0,activeStudents:0,status:'fresh'});
 expect(await empty.schools.dataStatus(actor)).toMatchObject({complete:true,total:0,sources:[]});
 const missing=createCollectionRuntime(app.database,{environment:'synthetic',trustedSource:'crm-'+randomUUID(),trustedToken:token});
 expect(await missing.schools.summary(actor)).toMatchObject({schools:null,branches:null,activeStudents:null,dataThrough:null,coverageFrom:null,status:'partial'});
 expect(await missing.schools.qualitySummary(actor)).toMatchObject({warnings:expect.arrayContaining(['SOURCE_BARRIER_MISSING'])});
 expect(await missing.schools.dataStatus(actor)).toMatchObject({complete:false,total:null});
 const stale=await fixture([],new Date(Date.now()-3*60000).toISOString());expect(await stale.schools.qualitySummary(actor)).toMatchObject({status:'stale'});
});
test('global signal heads detect missing, advanced and extra signals without changing lifecycle hashes',async()=>{
 const runtime=await fixture([]),id=randomUUID(),now=new Date().toISOString();
 const snapshot=(version:string,signal_heads:Array<{aggregate_type:string;aggregate_id:string;aggregate_version:string}>)=>({schema_version:1,source:runtime.source,environment:'synthetic',cutover_at:cutover,as_of:new Date().toISOString(),barrier_version:version,snapshot_hash:snapshotHash([]),records:[],heads:[],signal_heads,baseline_records:[],baseline_hash:snapshotHash([])});
 const event={event_id:randomUUID(),schema_version:1,name:'lead.created',source:runtime.source,environment:'synthetic',occurred_at:now,effective_at:now,aggregate_type:'lead',aggregate_id:id,aggregate_version:'1',properties:{lead_id:id,utm_source:'synthetic'}};
 await runtime.collector.admit({events:[event]},'trusted','Bearer '+token);await runtime.processBatch();
 expect(await runtime.schools.qualitySummary(actor)).toMatchObject({status:'partial',warnings:expect.arrayContaining(['SOURCE_SIGNAL_HEADS_MISMATCH'])});
 await expect(runtime.collector.acceptSnapshot(snapshot('0',[{aggregate_type:'lead',aggregate_id:id,aggregate_version:'1'}]),'Bearer '+token)).rejects.toThrow('BARRIER_CONFLICT');
 await runtime.collector.acceptSnapshot(snapshot('1',[{aggregate_type:'lead',aggregate_id:id,aggregate_version:'1'}]),'Bearer '+token);
 expect(await runtime.schools.qualitySummary(actor)).toMatchObject({status:'fresh',warnings:[]});
 await runtime.collector.acceptSnapshot(snapshot('2',[{aggregate_type:'lead',aggregate_id:id,aggregate_version:'2'}]),'Bearer '+token);
 expect(await runtime.schools.qualitySummary(actor)).toMatchObject({status:'partial',warnings:expect.arrayContaining(['SOURCE_SIGNAL_HEADS_MISMATCH'])});
 await expect(runtime.collector.acceptSnapshot(snapshot('3',[{aggregate_type:'company',aggregate_id:id,aggregate_version:'1'}]),'Bearer '+token)).rejects.toThrow('INVALID_SIGNAL_HEADS');
 const head={aggregate_type:'lead',aggregate_id:id,aggregate_version:'1'};
 await expect(runtime.collector.acceptSnapshot(snapshot('3',[head,head]),'Bearer '+token)).rejects.toThrow('INVALID_SIGNAL_HEADS');
 const {signal_heads:omitted,...missing}=snapshot('3',[]);expect(omitted).toEqual([]);
 await expect(runtime.collector.acceptSnapshot(missing,'Bearer '+token)).rejects.toThrow('INVALID_SNAPSHOT');
});
test('a declared company awaiting projection is incomplete instead of a false missing-school response',async()=>{
 const runtime=await fixture([]),id=randomUUID(),record={...company(id,'Synthetic Awaiting Projection'),aggregate_version:'1'};
 await runtime.collector.acceptSnapshot({schema_version:1,source:runtime.source,environment:'synthetic',cutover_at:cutover,as_of:new Date().toISOString(),barrier_version:'1',snapshot_hash:snapshotHash([record]),records:[record],heads:[{aggregate_type:'company',aggregate_id:id,aggregate_version:'1'}],signal_heads:[],baseline_records:[],baseline_hash:snapshotHash([])},'Bearer '+token);
 expect(await runtime.schools.summary(actor,{companyId:id})).toMatchObject({schools:null,activeStudents:null,status:'partial',warnings:expect.arrayContaining(['SOURCE_HEADS_MISMATCH'])});
});
