import {afterEach,describe,expect,it,vi} from 'vitest';
import {createTracker} from '../src/index.js';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('public telemetry boundary',()=>{
 it('requires explicit consent and never records a payment claim',async()=>{
  const sender=vi.fn(async()=>new Response('{}',{status:202}));
  const tracker=createTracker({source:'marketing',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:false,fetch:sender});
  tracker.track('page.view',{path:'/pricing',surface:'marketing'});
  await tracker.flush();expect(sender).not.toHaveBeenCalled();
  tracker.setConsent(true);tracker.track('payment.received',{amount:'1000'});await tracker.flush();expect(sender).not.toHaveBeenCalled();
 });
 it('admits only bounded campaign labels and referrer hosts through the public page event',async()=>{
  vi.useFakeTimers();const bodies:string[]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{bodies.push(String(options?.body));const batch=JSON.parse(bodies[0]!) as {events:{event_id:string}[]};return new Response(JSON.stringify({receiptId:'attribution',events:batch.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'marketing',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.track('page.view',{path:'/blog/article-a',surface:'marketing',utm_source:'telegram',utm_medium:'social',utm_campaign:'autumn_2026',referrer:'search.example.test',email:'private@example.test',session:'opaque'});
  tracker.track('page.view',{path:'/blog/article-b',surface:'marketing',utm_source:'private@example.test',utm_medium:'998901234567',utm_campaign:'session_998901234567',referrer:'https://private:secret@search.example.test/path'});
  tracker.track('page.view',{path:'/blog/article-c',surface:'marketing',utm_campaign:'abc123abc123abc123abc123abc123',referrer:'javascript:private'});
  tracker.track('page.view',{path:'/blog/article-d',surface:'marketing',utm_source:'phone_998 90 123 45 67',utm_medium:'phone_998.90.123.45.67',utm_campaign:'phone_998-90-123-45-67'});
  tracker.track('page.view',{path:'/blog/article-e',surface:'marketing',utm_campaign:'phone_998_90_123_45_67'});
  await tracker.flush();
  expect((JSON.parse(bodies[0]!) as {events:{properties:Record<string,string>}[]}).events.map(event=>event.properties)).toEqual([
   {path:'/blog/:id',surface:'marketing',utm_source:'telegram',utm_medium:'social',utm_campaign:'autumn_2026',referrer:'search.example.test'},
   {path:'/blog/:id',surface:'marketing'},
   {path:'/blog/:id',surface:'marketing'},
   {path:'/blog/:id',surface:'marketing'},
   {path:'/blog/:id',surface:'marketing'}
  ]);
  tracker.dispose();
 });
 it('preserves host static CRM routes and redacts their detail identifiers at the public tracker boundary',async()=>{
  vi.useFakeTimers();const sent:{properties:Record<string,string>}[]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{const batch=JSON.parse(String(options?.body)) as {events:{event_id:string;properties:Record<string,string>}[]};sent.push(...batch.events);return new Response(JSON.stringify({receiptId:'crm-routes',events:batch.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'crm-browser',surface:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  const routes=['courses','teachers','operators','vehicles','questions','training-programs','training-enrollments','driving-sessions','my-settlements','audit','fleet-map'];
  for(const route of routes){tracker.page(`/${route}`);tracker.page(`/${route}/private-entity?phone=private#token`);}
  await tracker.flush();await tracker.flush();
  expect(sent.map(event=>event.properties)).toEqual(routes.flatMap(route=>[{path:`/${route}`,surface:'tenant'},{path:`/${route}/:id`,surface:'tenant'}]));
  expect(JSON.stringify(sent)).not.toMatch(/private-entity|phone=private|#token/);
  tracker.dispose();
 });
 it('retries uncertain delivery with unchanged event identity and strips private route details',async()=>{
  vi.useFakeTimers();
  const bodies:string[]=[];const sender=vi.fn(async(_url:string,options?:RequestInit)=>{bodies.push(String(options?.body));if(bodies.length===1)throw new Error('offline');const item=JSON.parse(bodies[0]!) as {events:{event_id:string}[]};return new Response(JSON.stringify({receiptId:'r1',events:item.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.page('/students/123456?phone=private#token','https://referrer.example/path?email=private');
  await tracker.flush();await vi.advanceTimersByTimeAsync(5000);await tracker.flush();
  expect(bodies).toHaveLength(2);expect(bodies[0]).toBe(bodies[1]);expect(bodies[0]).not.toContain('phone');expect(bodies[0]).not.toContain('123456');expect(bodies[0]).not.toContain('email');
  tracker.dispose();
 });
 it('automatically drains more than one bounded batch without a new page action',async()=>{
  vi.useFakeTimers();const sizes:number[]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{const batch=JSON.parse(String(options?.body)) as {events:{event_id:string}[]};sizes.push(batch.events.length);return new Response(JSON.stringify({receiptId:`r${sizes.length}`,events:batch.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  for(let index=0;index<45;index++)tracker.page('/dashboard');
  await vi.advanceTimersByTimeAsync(3000);
  expect(sizes).toEqual([20,20,5]);
  tracker.dispose();
 });
 it('honors bounded Retry-After and keeps the same event IDs on automatic retry',async()=>{
  vi.useFakeTimers();const bodies:string[]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{bodies.push(String(options?.body));if(bodies.length===1)return new Response('{}',{status:429,headers:{'Retry-After':'120'}});const batch=JSON.parse(bodies[0]!) as {events:{event_id:string}[]};return new Response(JSON.stringify({receiptId:'retried',events:batch.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.page('/dashboard');await vi.advanceTimersByTimeAsync(1000);expect(sender).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(59999);expect(sender).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);expect(sender).toHaveBeenCalledTimes(2);expect(bodies[1]).toBe(bodies[0]);
  tracker.dispose();
 });
 it('discards queued telemetry when DNT is enabled after creation',async()=>{
  vi.useFakeTimers();const privacy={doNotTrack:'0',globalPrivacyControl:false};vi.stubGlobal('navigator',privacy);const bodies:string[]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{bodies.push(String(options?.body));const batch=JSON.parse(bodies.at(-1)!) as {events:{event_id:string}[]};return new Response(JSON.stringify({receiptId:'privacy-test',events:batch.events.map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.page('/dashboard');privacy.doNotTrack='1';await vi.advanceTimersByTimeAsync(1000);expect(sender).not.toHaveBeenCalled();
  privacy.doNotTrack='0';tracker.page('/pricing');await vi.advanceTimersByTimeAsync(1000);
  expect(bodies).toHaveLength(1);expect(bodies[0]).not.toContain('/dashboard');expect(bodies[0]).toContain('/pricing');
  tracker.dispose();
 });
 it('retries only unresolved event IDs after a partial acknowledgment',async()=>{
  vi.useFakeTimers();const batches:{event_id:string}[][]=[];
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{const batch=(JSON.parse(String(options?.body)) as {events:{event_id:string}[]}).events;batches.push(batch);return new Response(JSON.stringify({receiptId:'partial',events:(batches.length===1?batch.slice(0,1):batch).map(event=>({eventId:event.event_id,status:'accepted'}))}),{status:202});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.page('/dashboard');tracker.page('/pricing');await vi.advanceTimersByTimeAsync(2000);
  expect(batches).toHaveLength(2);expect(batches[1]?.map(event=>event.event_id)).toEqual([batches[0]?.[1]?.event_id]);
  tracker.dispose();
 });
 it('cancels an in-flight request and discards pending events on consent withdrawal',async()=>{
  vi.useFakeTimers();let finish:(response:Response)=>void=()=>undefined;let signal:AbortSignal|undefined;
  const sender=vi.fn(async(_url:string,options?:RequestInit)=>{signal=options?.signal??undefined;return new Promise<Response>(resolve=>{finish=resolve;});});
  const tracker=createTracker({source:'tenant',environment:'synthetic',endpoint:'https://analytics.example.test/collect/v1/events',consent:true,fetch:sender});
  tracker.page('/dashboard');const delivery=tracker.flush();tracker.setConsent(false);expect(signal?.aborted).toBe(true);tracker.page('/pricing');finish(new Response('{}',{status:202}));await delivery;await vi.advanceTimersByTimeAsync(10000);expect(sender).toHaveBeenCalledTimes(1);tracker.dispose();
 });
});
