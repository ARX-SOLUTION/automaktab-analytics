import {expect,it} from 'vitest';
import {startApi} from '../src/main.js';
import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
it('protects owner reads and exposes observed traffic only after cookie login',async()=>{
 const runtime=await startApi({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL,PORT:'18309'});
 const base='http://127.0.0.1:18309';try{
  expect((await fetch(base+'/api/v1/overview')).status).toBe(401);
  expect((await fetch(base+'/api/v1/openapi.json')).status).toBe(401);
  const response=await fetch(base+'/api/v1/auth/demo-session',{method:'POST',headers:{Origin:'http://127.0.0.1:18517'}});expect(response.status).toBe(200);
  const cookie=response.headers.get('set-cookie')!.split(';')[0]!;
  const documentation=await fetch(base+'/api/v1/openapi.json',{headers:{cookie}});expect(documentation.status).toBe(200);const api=await documentation.json();expect(api.openapi).toBe('3.1.0');expect(Object.keys(api.paths).length).toBeGreaterThan(40);
  expect(api.paths['/api/v1/billing/contracts/{id}/closes'].post.requestBody.content['application/json'].schema.required).toEqual(expect.arrayContaining(['contractId','previewId','expectedPreviewHash','expectedLedgerRevision']));
  expect(api.paths['/internal/v1/events'].post.security).toEqual([{sourceBearer:[]}]);expect(api.paths['/collect/v1/events'].post.security).toEqual([]);
  const traffic=await fetch(base+'/api/v1/traffic/summary?from=2026-10-01&to=2026-11-01&environment=synthetic',{headers:{cookie}});expect(traffic.status).toBe(200);const result=await traffic.json();expect(result.data.definitionVersion).toBe('observed-events-v1');expect(result.meta.status).toMatch(/fresh|stale|partial/);
  expect((await fetch(base+'/api/v1/traffic/summary?from=2026-10-01&to=2026-11-01&environment=production',{headers:{cookie}})).status).toBe(403);
 }finally{await runtime.close();}
});
it('reviews opening debt, receipt, credit correction and full reversal through the real protected HTTP pipeline',async()=>{
 const runtime=await startApi({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL,PORT:'18311'}),base='http://127.0.0.1:18311',origin='http://127.0.0.1:18517',company=randomUUID();
 const login=await fetch(base+'/api/v1/auth/demo-session',{method:'POST',headers:{Origin:origin}}),cookie=login.headers.get('set-cookie')!.split(';')[0]!,session=(await login.json()).data;
 const headers={cookie,Origin:origin,'X-CSRF-Token':session.csrfToken,'Content-Type':'application/json'};
 const read=async(path:string)=>{const response=await fetch(base+'/api/v1'+path,{headers:{cookie}});expect(response.status).toBe(200);return (await response.json()).data;};
 const post=async(path:string,body:unknown,key?:string)=>{const response=await fetch(base+'/api/v1'+path,{method:'POST',headers:{...headers,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});expect(response.status).toBe(201);return (await response.json()).data;};
 const submit=async(path:string,preview:Record<string,unknown>)=>{const key=randomUUID(),result=await post(path,{...preview.input as object,previewId:preview.previewId,expectedPreviewHash:preview.previewHash,expectedLedgerRevision:preview.ledgerRevision},key);await post('/commands/'+key+'/acknowledgments',{});return result;};
 try{
  await runtime.application.database.db.execute(sql`INSERT INTO analytics_schools(id,environment,name,slug,status,is_demo,deleted_at,data_through) VALUES(${company},'synthetic','Synthetic Archived Finance School',${'school-'+company},'suspended',false,now(),now())`);
  const branch=randomUUID();await runtime.application.database.db.execute(sql`INSERT INTO analytics_branches(id,environment,company_id,name,is_active,data_through) VALUES(${branch},'synthetic',${company},'Synthetic Finance Branch',true,now())`);
  expect((await fetch(base+`/api/v1/usage/summary?companyId=${randomUUID()}&branchId=${branch}`,{headers:{cookie}})).status).toBe(400);
  expect((await fetch(base+`/api/v1/schools/${company}?companyId=${randomUUID()}`,{headers:{cookie}})).status).toBe(400);
  const policy=await read('/billing/policy-status');if(policy.status!=='confirmed'){const key=randomUUID();await post('/billing/policy-confirmations',{confirmed:true,expectedPolicyHash:policy.policyHash},key);await post('/commands/'+key+'/acknowledgments',{});}
  const now=new Date(),day=new Date(now.getTime()+5*3600000).toISOString().slice(0,10),next=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const opening=await post('/billing/opening-balance-previews',{companyId:company,amount:{currency:'UZS',minor:'100000'},asOf:day,dueDate:day,reason:'Synthetic owner-confirmed opening debt'});expect(opening.canCommit).toBe(true);
  const invoice=await submit('/billing/opening-balances',opening);expect(invoice.totalMinor).toBe('100000');
  const paymentPreview=await post('/billing/payment-previews',{companyId:company,amount:{currency:'UZS',minor:'120000'},receivedAt:now.toISOString(),method:'bank_transfer',reference:'synthetic-only'});
  const payment=await submit('/billing/payments',paymentPreview);expect(payment.unallocatedMinor).toBe('20000');
  const correction=await post('/billing/invoices/'+invoice.id+'/correction-previews',{type:'credit',correctedTotalMinor:'80000',reason:'Synthetic reviewed invoice correction'});
  await submit('/billing/invoices/'+invoice.id+'/corrections',correction);
  const corrected=await read('/billing/invoices/'+invoice.id);expect(corrected.totalMinor).toBe('100000');expect(corrected.correctedTotalMinor).toBe('80000');expect(corrected.outstandingMinor).toBe('0');
  expect((await read('/billing/credits?companyId='+company)).items[0].unallocatedMinor).toBe('40000');
  const reversal=await post('/billing/payments/'+payment.id+'/reversal-previews',{reason:'Synthetic mistaken receipt reversal'});await submit('/billing/payments/'+payment.id+'/reversals',reversal);
  expect((await read('/billing/invoices/'+invoice.id)).outstandingMinor).toBe('80000');
  const overview=await read(`/overview?companyId=${company}&from=${day}&to=${next}`);expect(overview.metrics.find((metric:{key:string})=>metric.key==='debt').value).toBe('80000');expect(overview.metrics.find((metric:{key:string})=>metric.key==='collected').value).toBe('0');
  expect((await read(`/audit?companyId=${company}&from=${day}&to=${next}`)).items.some((item:{id:string})=>item.id.startsWith('billing:'))).toBe(true);
  const privateKey=randomUUID(),invalid=await fetch(base+'/api/v1/billing/payments',{method:'POST',headers:{...headers,'Idempotency-Key':privateKey},body:JSON.stringify({reference:{phone:'private-test-value'}})});expect(invalid.status).toBe(400);
  const rejected=await read('/commands/'+privateKey);expect(rejected).toMatchObject({state:'notCommitted',code:'INVALID_REQUEST'});
  const intent=await runtime.application.database.db.execute(sql`SELECT body FROM billing_http_intents WHERE intent_id=${privateKey}`);expect(intent.rows).toEqual([{body:{}}]);await post('/commands/'+privateKey+'/acknowledgments',{});
  for(const invalidBody of [[],null]){
   const invalidKey=randomUUID(),invalidResponse=await fetch(base+'/api/v1/billing/payments',{method:'POST',headers:{...headers,'Idempotency-Key':invalidKey},body:JSON.stringify(invalidBody)});expect(invalidResponse.status).toBe(400);
   expect(await read('/commands/'+invalidKey)).toMatchObject({state:'notCommitted',code:'INVALID_REQUEST'});
   expect((await read('/commands')).items.some((item:{key:string})=>item.key===invalidKey)).toBe(true);
   const invalidIntent=await runtime.application.database.db.execute(sql`SELECT body FROM billing_http_intents WHERE intent_id=${invalidKey}`);expect(invalidIntent.rows).toEqual([{body:{}}]);await post('/commands/'+invalidKey+'/acknowledgments',{});
  }
  for(const invalidDate of ['2026-13-01','2026-02-30'])expect((await fetch(base+'/api/v1/billing/invoices?from='+invalidDate+'&to=2026-11-01',{headers:{cookie}})).status).toBe(400);
 }finally{await runtime.close();}
});
it('discovers and replays a lost financial response after logout without executing a new intent',async()=>{
 const runtime=await startApi({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL,PORT:'18310'}),base='http://127.0.0.1:18310',origin='http://127.0.0.1:18517';
 const login=async()=>{const response=await fetch(base+'/api/v1/auth/demo-session',{method:'POST',headers:{Origin:origin}});return {cookie:response.headers.get('set-cookie')!.split(';')[0]!,session:(await response.json()).data};};
 try{let user=await login();const policy=(await (await fetch(base+'/api/v1/billing/policy-status',{headers:{cookie:user.cookie}})).json()).data;
  const key=randomUUID(),body={confirmed:true,expectedPolicyHash:policy.policyHash};const headers=()=>({cookie:user.cookie,Origin:origin,'X-CSRF-Token':user.session.csrfToken,'Content-Type':'application/json','Idempotency-Key':key});
  const commit=await fetch(base+'/api/v1/billing/policy-confirmations',{method:'POST',headers:headers(),body:JSON.stringify(body)});expect(commit.status).toBe(201);const original=(await commit.json()).data;
  await fetch(base+'/api/v1/auth/session',{method:'DELETE',headers:headers()});user=await login();
  const discovered=(await (await fetch(base+'/api/v1/commands?status=unresolved',{headers:{cookie:user.cookie}})).json()).data;expect(discovered.items.some((item:{key:string})=>item.key===key)).toBe(true);
  const replay=await fetch(base+'/api/v1/billing/policy-confirmations',{method:'POST',headers:headers(),body:JSON.stringify(body)});expect(replay.status).toBe(201);expect((await replay.json()).data.revisionId).toBe(original.revisionId);
  expect((await fetch(base+`/api/v1/commands/${key}/acknowledgments`,{method:'POST',headers:headers(),body:'{}'})).status).toBe(201);
  const remaining=(await (await fetch(base+'/api/v1/commands?status=unresolved',{headers:{cookie:user.cookie}})).json()).data;expect(remaining.items.some((item:{key:string})=>item.key===key)).toBe(false);
 }finally{await runtime.close();}
});
