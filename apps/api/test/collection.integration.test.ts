import {afterAll,expect,test} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createFoundationApplication} from '../src/application/index.js';
import {ProductStore} from '../src/db/product-store.js';
import {CollectorService} from '../src/modules/collection/collector.js';
import {createTracker} from '../../../packages/tracker/src/index.js';
import type {EventEnvelope} from '@automaktab/contracts';
const app=createFoundationApplication({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL});
const collector=new CollectorService(new ProductStore(app.database),{environment:'synthetic',trustedToken:'synthetic-source-fixture'});
afterAll(()=>app.close());
test('durable admission replays identical telemetry and rejects conflicting event contents',async()=>{
 const event={event_id:randomUUID(),schema_version:1,name:'page.view',occurred_at:new Date().toISOString(),source:'marketing',environment:'synthetic',properties:{path:'/pricing',surface:'marketing'}};
 const first=await collector.admit({events:[event]},'public');expect(first.events[0]?.status).toBe('accepted');
 const replay=await collector.admit({events:[event]},'public');expect(replay.events[0]?.status).toBe('duplicate');expect(replay.receiptId).toBe(first.receiptId);expect(replay.accepted_event_ids).toEqual([event.event_id]);
 const conflict=await collector.admit({events:[{...event,properties:{path:'/about',surface:'marketing'}}]},'public');expect(conflict.events[0]).toMatchObject({status:'rejected',code:'EVENT_ID_CONFLICT'});
});
test('public telemetry rejects private properties and trusted lifecycle claims before storage',async()=>{
 const base={event_id:randomUUID(),schema_version:1,name:'page.view',occurred_at:new Date().toISOString(),source:'marketing',environment:'synthetic',properties:{path:'/pricing?phone=998901234567'}};
 expect((await collector.admit({events:[base]},'public')).events[0]).toMatchObject({status:'rejected',code:'INVALID_EVENT'});
 expect((await collector.admit({events:[{...base,event_id:randomUUID(),company_id:'forged-school',properties:{path:'/pricing'}}]},'public')).events[0]?.status).toBe('rejected');
 await expect(collector.admit({events:[base]},'trusted','Bearer wrong-token')).rejects.toThrow('SOURCE_UNAUTHORIZED');
});
test('public routes retain placeholders rather than opaque IDs or contact names',async()=>{
 const event={event_id:randomUUID(),schema_version:1,name:'page.view',occurred_at:new Date().toISOString(),source:'marketing',environment:'synthetic',properties:{path:'/students/abcdefab-cdef-abcd-efab-cdefabcdefab'}};
 expect((await collector.admit({events:[event]},'public')).events[0]?.status).toBe('rejected');
 expect((await collector.admit({events:[{...event,event_id:randomUUID(),properties:{path:'/students/:id'}}]},'public')).events[0]?.status).toBe('accepted');
});
test('the real SDK CRM route templates survive public collector admission while private paths remain rejected',async()=>{
 const routes=['courses','teachers','operators','vehicles','questions','training-programs','training-enrollments','driving-sessions','my-settlements','audit','fleet-map'];const observed:EventEnvelope[]=[];const results:{status:string}[]=[];
 const tracker=createTracker({source:'crm-browser',surface:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:async(_url,options)=>{const body=JSON.parse(String(options?.body)) as {events:EventEnvelope[]};observed.push(...body.events);const receipt=await collector.admit(body,'public');results.push(...receipt.events);return new Response(JSON.stringify({data:receipt}),{status:202});}});
 try{
  for(const route of routes){tracker.page(`/${route}`);tracker.page(`/${route}/private-entity?phone=private#token`);}
  await tracker.flush();await tracker.flush();
  expect(observed.map(event=>event.properties.path)).toEqual(routes.flatMap(route=>[`/${route}`,`/${route}/:id`]));expect(results).toHaveLength(22);expect(results.every(item=>item.status==='accepted')).toBe(true);expect(JSON.stringify(observed)).not.toMatch(/private-entity|phone=private|#token/);
  const base={schema_version:1,name:'page.view',occurred_at:new Date().toISOString(),source:'crm-browser',environment:'synthetic'};const invalid=await collector.admit({events:['/courses/private-entity','/teachers/:id?phone=private','/vehicles/:id#token'].map(path=>({...base,event_id:randomUUID(),properties:{path,surface:'tenant'}}))},'public');
  expect(invalid.events).toHaveLength(3);expect(invalid.events.every(item=>item.status==='rejected'&&item.code==='INVALID_EVENT')).toBe(true);
 }finally{tracker.dispose();}
});
