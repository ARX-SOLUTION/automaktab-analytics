import {expect,test,vi} from 'vitest';
import {createCloudflareHandlers,createCloudflareRateLimiter} from '../src/cloudflare-runtime.js';

function fixture(allowRequest:(request:Request)=>boolean=()=>true,options:{readonly maxConcurrentLiveStreams?:number}={}){
 const fetchApi=vi.fn(async()=>new Response(null,{status:200}));
 const sendInboxHint=vi.fn(async()=>undefined);
 const processInbox=vi.fn(async()=>undefined);
 const runScheduled=vi.fn(async()=>undefined);
 const handlers=createCloudflareHandlers({fetchApi,allowRequest,sendInboxHint,processInbox,runScheduled},options);
 const promises:Promise<unknown>[]=[];
 const context={waitUntil:(promise:Promise<unknown>)=>{promises.push(promise);}};
 return {handlers,fetchApi,sendInboxHint,processInbox,runScheduled,promises,context};
}

test('the Worker rate-limit window persists across requests and keys by trusted client and route scope',async()=>{
 const f=fixture(createCloudflareRateLimiter({limit:2}));
 const publicRequest=(address:string)=>new Request('https://analytics.example.test/collect/v1/events',{method:'POST',headers:{'cf-connecting-ip':address}});
 const sameClient=publicRequest('198.51.100.10');
 const first=await f.handlers.fetch(sameClient,{},f.context);
 const second=await f.handlers.fetch(sameClient,{},f.context);
 const limited=await f.handlers.fetch(sameClient,{},f.context);
 expect([first.status,second.status,limited.status]).toEqual([200,200,429]);
 expect(limited.headers.get('retry-after')).toBe('60');
 expect(f.fetchApi).toHaveBeenCalledTimes(2);
 expect((await f.handlers.fetch(publicRequest('198.51.100.11'),{},f.context)).status).toBe(200);
 expect((await f.handlers.fetch(new Request('https://analytics.example.test/api/v1/auth/config',{headers:{'cf-connecting-ip':'198.51.100.10'}}),{},f.context)).status).toBe(200);
});

test('rate-limit route scopes normalize case and trailing-slash aliases',()=>{
 const allow=createCloudflareRateLimiter({limit:1});
 const request=(path:string)=>new Request(`https://analytics.example.test${path}`,{method:'POST',headers:{'cf-connecting-ip':'198.51.100.15'}});
 expect(allow(request('/collect/v1/events'))).toBe(true);
 expect(allow(request('/COLLECT/V1/EVENTS/'))).toBe(false);
 expect(allow(request('/internal/v1/events'))).toBe(true);
 expect(allow(request('/INTERNAL/V1/EVENTS/'))).toBe(false);
 expect(allow(request('/api/v1/auth/config'))).toBe(true);
});

test('readiness checks are rate limited while liveness stays available',async()=>{
 const f=fixture(createCloudflareRateLimiter({limit:1}));
 const ready=new Request('https://analytics.example.test/health/ready',{headers:{'cf-connecting-ip':'198.51.100.12'}});
 const live=new Request('https://analytics.example.test/health/live',{headers:{'cf-connecting-ip':'198.51.100.12'}});
 expect((await f.handlers.fetch(ready,{},f.context)).status).toBe(200);
 expect((await f.handlers.fetch(ready,{},f.context)).status).toBe(429);
 expect((await f.handlers.fetch(live,{},f.context)).status).toBe(200);
 expect(f.fetchApi).toHaveBeenCalledTimes(2);
});

test('live streams are capped across requests and release capacity when clients disconnect',async()=>{
 const f=fixture();
 f.fetchApi.mockImplementation(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));}}),{status:200,headers:{'content-type':'text/event-stream'}}));
 const request=()=>new Request('https://analytics.example.test/api/v1/live/stream',{headers:{'cf-connecting-ip':'198.51.100.13'}});
 const first=await f.handlers.fetch(request(),{},f.context);
 const second=await f.handlers.fetch(request(),{},f.context);
 const third=await f.handlers.fetch(request(),{},f.context);
 expect([first.status,second.status,third.status]).toEqual([200,200,429]);
 expect(f.fetchApi).toHaveBeenCalledTimes(2);
 await Promise.all([first.body?.cancel(),second.body?.cancel()]);
 const afterDisconnect=await f.handlers.fetch(request(),{},f.context);
 expect(afterDisconnect.status).toBe(200);
 await afterDisconnect.body?.cancel();
});

test('aborted Worker requests release their live-stream slot',async()=>{
 const f=fixture(()=>true,{maxConcurrentLiveStreams:1}),controller=new AbortController();
 f.fetchApi.mockImplementation(async()=>new Response(new ReadableStream<Uint8Array>({start(){}}),{status:200,headers:{'content-type':'text/event-stream'}}));
 const request=(signal?:AbortSignal)=>new Request('https://analytics.example.test/api/v1/live/stream',{signal});
 const open=await f.handlers.fetch(request(controller.signal),{},f.context);
 expect(open.status).toBe(200);
 controller.abort();
 await open.body?.cancel();
 const afterAbort=await f.handlers.fetch(request(),{},f.context);
 expect(afterAbort.status).toBe(200);
 await afterAbort.body?.cancel();
});

test('live-stream capacity remains held until upstream cancellation cleanup settles',async()=>{
 const f=fixture(()=>true,{maxConcurrentLiveStreams:1});let settleCleanup!:()=>void;
 const cleanup=new Promise<void>(resolve=>{settleCleanup=resolve;});
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({cancel:()=>cleanup}),{status:200,headers:{'content-type':'text/event-stream'}}));
 const request=()=>new Request('https://analytics.example.test/api/v1/live/stream');
 const open=await f.handlers.fetch(request(),{},f.context),cancellation=open.body!.cancel();
 await Promise.resolve();
 const duringCleanup=await f.handlers.fetch(request(),{},f.context);
 expect(duringCleanup.status).toBe(429);
 settleCleanup();
 await cancellation;
 const afterCleanup=await f.handlers.fetch(request(),{},f.context);
 expect(afterCleanup.status).toBe(200);
});

test('live-stream trailing-slash and HEAD aliases share the Worker stream cap',async()=>{
 const f=fixture();
 f.fetchApi.mockImplementation(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));}}),{status:200,headers:{'content-type':'text/event-stream'}}));
 const request=(method:'GET'|'HEAD',path:string)=>new Request(`https://analytics.example.test${path}`,{method});
 const first=await f.handlers.fetch(request('GET','/api/v1/live/stream'),{},f.context);
 const second=await f.handlers.fetch(request('GET','/api/v1/live/stream/'),{},f.context);
 const third=await f.handlers.fetch(request('HEAD','/API/V1/LIVE/STREAM/'),{},f.context);
 expect([first.status,second.status,third.status]).toEqual([200,200,429]);
 expect(f.fetchApi).toHaveBeenCalledTimes(2);
 await Promise.all([first.body?.cancel(),second.body?.cancel()]);
});

test('live stream capacity is released after a stream completes',async()=>{
 const f=fixture(()=>true,{maxConcurrentLiveStreams:1});
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('event: ready\n\n'));controller.close();}}),{status:200}));
 const request=()=>new Request('https://analytics.example.test/api/v1/live/stream');
 const completed=await f.handlers.fetch(request(),{},f.context);
 expect(await completed.text()).toContain('event: ready');
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({start(){}}),{status:200}));
 const next=await f.handlers.fetch(request(),{},f.context);
 expect(next.status).toBe(200);
 await next.body?.cancel();
});

test('live stream capacity is released after a stream read error',async()=>{
 const f=fixture(()=>true,{maxConcurrentLiveStreams:1});
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({start(controller){controller.error(new Error('synthetic stream failure'));}}),{status:200}));
 const request=()=>new Request('https://analytics.example.test/api/v1/live/stream');
 const failed=await f.handlers.fetch(request(),{},f.context);
 await expect(failed.arrayBuffer()).rejects.toThrow('synthetic stream failure');
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({start(){}}),{status:200}));
 const next=await f.handlers.fetch(request(),{},f.context);
 expect(next.status).toBe(200);
 await next.body?.cancel();
});

test('live stream capacity is released when API runtime creation rejects',async()=>{
 const f=fixture(()=>true,{maxConcurrentLiveStreams:1});
 f.fetchApi.mockRejectedValueOnce(new Error('synthetic runtime failure'));
 const request=()=>new Request('https://analytics.example.test/api/v1/live/stream');
 await expect(f.handlers.fetch(request(),{},f.context)).rejects.toThrow('synthetic runtime failure');
 f.fetchApi.mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({start(){}}),{status:200}));
 const next=await f.handlers.fetch(request(),{},f.context);
 expect(next.status).toBe(200);
 await next.body?.cancel();
});

test('accepted inbox writes enqueue a non-authoritative wakeup after the API returns',async()=>{
 const f=fixture();f.fetchApi.mockResolvedValue(new Response(null,{status:202}));
 const request=new Request('https://analytics.example.test/collect/v1/events',{method:'POST'});
 const response=await f.handlers.fetch(request,{},f.context);
 await Promise.all(f.promises);
 expect(response.status).toBe(202);
 expect(f.sendInboxHint).toHaveBeenCalledTimes(1);
});

test('rejected and non-inbox API responses do not enqueue work',async()=>{
 const f=fixture();
 f.fetchApi.mockResolvedValue(new Response(null,{status:202}));
 await f.handlers.fetch(new Request('https://analytics.example.test/api/v1/billing/contracts',{method:'POST'}),{},f.context);
 f.fetchApi.mockResolvedValue(new Response(null,{status:400}));
 await f.handlers.fetch(new Request('https://analytics.example.test/collect/v1/events',{method:'POST'}),{},f.context);
 await Promise.all(f.promises);
 expect(f.sendInboxHint).not.toHaveBeenCalled();
});

test('queue hints are acknowledged only after a database inbox batch succeeds',async()=>{
 const f=fixture(),ack=vi.fn(),retry=vi.fn();
 await f.handlers.queue({messages:[{ack,retry}]},{ });
 expect(f.processInbox).toHaveBeenCalledTimes(1);
 expect(ack).toHaveBeenCalledOnce();
 expect(retry).not.toHaveBeenCalled();
});

test('queue hints retry after inbox processing fails',async()=>{
 const f=fixture(),ack=vi.fn(),retry=vi.fn();f.processInbox.mockRejectedValue(new Error('synthetic outage'));
 await f.handlers.queue({messages:[{ack,retry}]},{ });
 expect(ack).not.toHaveBeenCalled();
 expect(retry).toHaveBeenCalledWith({delaySeconds:5});
});

test('scheduled reconciliation runs through the injected maintenance boundary',async()=>{
 const f=fixture();await f.handlers.scheduled({},{});
 expect(f.runScheduled).toHaveBeenCalledOnce();
});
