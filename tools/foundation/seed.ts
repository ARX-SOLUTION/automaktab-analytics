import {sql} from 'drizzle-orm';
import type {EventEnvelope,SourceRecord,SourceSnapshot} from '../../packages/contracts/src/product.js';
import {createFoundationApplication,createCollectionRuntime} from '../../apps/api/src/application/index.js';
import {ProductStore} from '../../apps/api/src/db/product-store.js';
import {snapshotHash} from '../../apps/api/src/modules/schools/schools.service.js';

/** An explicit local fixture command, never a production startup action. */
export async function seedSynthetic(){
 const app=createFoundationApplication(process.env);
 try{
  if(app.config.environment!=='synthetic')throw new Error('SYNTHETIC_SEED_REQUIRED');
  const store=new ProductStore(app.database),runtime=createCollectionRuntime(store,{environment:'synthetic',trustedToken:app.config.ingestToken}),authorization='Bearer '+app.config.ingestToken;
  const [prior]=await store.query(app.database.db,sql`SELECT manifest FROM analytics_barriers WHERE source='crm' AND environment='synthetic' ORDER BY version DESC LIMIT 1`);
  const old=prior?.manifest as SourceSnapshot|undefined;
  if(old&&old.records.some(record=>!record.company_id.startsWith('synthetic-school-')))throw new Error('SYNTHETIC_SEED_FOREIGN_SOURCE');
  const now=new Date(),cutover=old?.cutover_at??new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)-5*3600000).toISOString();
  const records:SourceRecord[]=old?.records??[];
  if(!old)for(let school=1;school<=3;school++){
   const company=`synthetic-school-${school}`;
   records.push({aggregate_type:'company',aggregate_id:company,aggregate_version:'0',company_id:company,properties:{name:`Namunaviy avtomaktab ${school}`,slug:`synthetic-school-${school}`,status:school===3?'suspended':'active',is_demo:false,created_at:cutover,deleted_at:null}});
   for(let branch=1;branch<=2;branch++){
    const branchId=`synthetic-branch-${school}-${branch}`;
    records.push({aggregate_type:'branch',aggregate_id:branchId,aggregate_version:'0',company_id:company,properties:{name:`Namunaviy filial ${branch}`,company_id:company,is_active:true,created_at:cutover,deleted_at:null}});
    for(let subject=1;subject<=3;subject++){
     const id=`synthetic-subject-${school}-${branch}-${subject}`;
     records.push({aggregate_type:'student',aggregate_id:id,aggregate_version:'0',company_id:company,properties:{company_id:company,branch_id:branchId,status:subject===3?'suspended':'active',billing_subject_id:id,created_at:cutover,deleted_at:null}});
    }
   }
  }
  const snapshot:SourceSnapshot={schema_version:1,source:'crm',environment:'synthetic',cutover_at:cutover,as_of:now.toISOString(),barrier_version:old?.barrier_version??'0',snapshot_hash:snapshotHash(records),records,heads:records.map(({aggregate_type,aggregate_id,aggregate_version})=>({aggregate_type,aggregate_id,aggregate_version})),signal_heads:old?.signal_heads??[],baseline_records:old?.baseline_records??records,baseline_hash:old?.baseline_hash??snapshotHash(records)};
  await runtime.schools.acceptSnapshot(snapshot,authorization);
  const at=new Date(now.getTime()-5*60000).toISOString(),events:EventEnvelope[]=[];
  const add=async(event:EventEnvelope)=>{const [stored]=await store.query(app.database.db,sql`SELECT payload FROM analytics_inbox WHERE source=${event.source} AND environment='synthetic' AND event_id=${event.event_id}`);events.push(stored?stored.payload as EventEnvelope:event);};
  for(let i=1;i<=4;i++)await add({event_id:`synthetic-traffic-${i}`,schema_version:1,name:'page.view',occurred_at:new Date(Date.parse(at)+i*1000).toISOString(),source:'marketing',environment:'synthetic',anonymous_id:i<=2?'synthetic-visitor-1':'synthetic-visitor-2',session_id:i<=2?'synthetic-session-1':'synthetic-session-2',properties:{path:i%2?'/':'/pricing',surface:'marketing',utm_source:'synthetic',utm_medium:'fixture',utm_campaign:'synthetic-local'}});
  const trusted=async(id:string,name:string,kind:string,properties:Record<string,unknown>,company?:string,version='1')=>add({event_id:'synthetic-event-'+id+'-'+version,schema_version:1,name,source:'crm',environment:'synthetic',occurred_at:at,effective_at:at,aggregate_type:kind,aggregate_id:id,aggregate_version:version,...(company?{company_id:company}:{}),properties});
  await trusted('synthetic-lead-1','lead.created','lead',{lead_id:'synthetic-lead-1',anonymous_id:'synthetic-visitor-1',utm_source:'synthetic'});
  await trusted('synthetic-lead-1','lead.school_linked','lead',{lead_id:'synthetic-lead-1',company_id:'synthetic-school-1'},'synthetic-school-1','2');
  await trusted('synthetic-usage-1','usage.action','usage',{action:'lesson.create',actor_id:'synthetic-actor-1',role:'teacher',branch_id:'synthetic-branch-1-1'},'synthetic-school-1');
  await trusted('synthetic-official-1','learning.result','learning',{branch_id:'synthetic-branch-1-1',subject_id:'synthetic-subject-1-1-1',outcome:'passed',score:85,practice:false},'synthetic-school-1');
  await trusted('synthetic-practice-1','learning.result','learning',{branch_id:'synthetic-branch-1-1',subject_id:'synthetic-subject-1-1-2',outcome:'failed',score:40,practice:true},'synthetic-school-1');
  for(const trust of ['public','trusted'] as const){const selected=events.filter(event=>(event.source==='crm')===(trust==='trusted'));const admitted=await runtime.collector.admit({events:selected},trust,trust==='trusted'?authorization:undefined);if(admitted.events.some(event=>event.status==='rejected'))throw new Error('SYNTHETIC_SEED_ADMISSION_FAILED');}
  for(let attempt=0;attempt<20;attempt++){const result=await runtime.processBatch();if(result.processed===0)break;if(result.applied===0)throw new Error('SYNTHETIC_SEED_PROJECTION_BLOCKED');}
  const signalHeads=new Map<string,SourceSnapshot['signal_heads'][number]>();for(const event of events)if(event.source==='crm'){const head={aggregate_type:event.aggregate_type as SourceSnapshot['signal_heads'][number]['aggregate_type'],aggregate_id:event.aggregate_id!,aggregate_version:event.aggregate_version!},key=head.aggregate_type+':'+head.aggregate_id;if(BigInt(head.aggregate_version)>BigInt(signalHeads.get(key)?.aggregate_version??'0'))signalHeads.set(key,head);}
  await runtime.schools.acceptSnapshot({...snapshot,as_of:new Date().toISOString(),barrier_version:'5',signal_heads:[...signalHeads.values()]},authorization);
  console.log('PASS synthetic source baseline and observed/trusted events; billing remains owner review only');
 }finally{await app.close();}
}
if(process.argv[1]?.endsWith('/seed.js'))await seedSynthetic();
