import {afterEach,describe,expect,it,vi} from 'vitest';
import {acknowledgeIntent,confirmIntentOutcome,discoverIntent,readIntent,recordOutcome,storeIntent} from '../src/app/commands.js';
const session={actorId:'test-owner',displayName:'Synthetic owner',csrfToken:'synthetic-csrf',environment:'synthetic' as const};
function browser(){const values=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});vi.stubGlobal('window',new EventTarget());}
afterEach(()=>vi.unstubAllGlobals());
const oldIntent={actorId:session.actorId,key:'old-server-key',path:'/billing/payments',body:{amount:{currency:'UZS',minor:'100000'}},createdAt:'2026-10-01T00:00:00Z'};
function response(data:unknown){return new Response(JSON.stringify({data,meta:{requestId:'synthetic-recovery',apiVersion:1}}),{status:200});}
describe('server intent recovery after missed discovery',()=>{
 it('keeps a rejected new key unknown until GET proves it did not commit, then discovers the old intent only after ACK',async()=>{
  browser();vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('lost initial discovery');}));await expect(discoverIntent(session)).rejects.toThrow();
  storeIntent({...oldIntent,key:'rejected-new-key'});vi.stubGlobal('fetch',vi.fn(async()=>response({state:'unknown'})));await confirmIntentOutcome(session,'rejected-new-key');expect(readIntent(session.actorId)?.state).toBeUndefined();
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('lost status response');}));await expect(confirmIntentOutcome(session,'rejected-new-key')).rejects.toThrow();expect(readIntent(session.actorId)?.state).toBeUndefined();
  vi.stubGlobal('fetch',vi.fn(async()=>response({state:'notCommitted',code:'UNKNOWN_COMMAND'})));await confirmIntentOutcome(session,'rejected-new-key');expect(readIntent(session.actorId)).toMatchObject({key:'rejected-new-key',state:'notCommitted'});
  vi.stubGlobal('fetch',vi.fn(async()=>response({items:[oldIntent]})));await discoverIntent(session);expect(readIntent(session.actorId)?.key).toBe('rejected-new-key');
  vi.stubGlobal('fetch',vi.fn(async()=>response({resolved:true,state:'notCommitted'})));await acknowledgeIntent(session);expect(readIntent(session.actorId)).toBeUndefined();
  vi.stubGlobal('fetch',vi.fn(async()=>response({items:[oldIntent]})));await discoverIntent(session);expect(readIntent(session.actorId)).toMatchObject(oldIntent);expect(readIntent(session.actorId)?.state).toBeUndefined();
 });
 it('does not replace a new local intent with a racing discovery response and finds the old server intent in a fresh tab',async()=>{
  browser();let finish!:(value:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));const discovery=discoverIntent(session);
  storeIntent({...oldIntent,key:'new-local-key'});finish(response({items:[oldIntent]}));await discovery;expect(readIntent(session.actorId)?.key).toBe('new-local-key');
  browser();vi.stubGlobal('fetch',vi.fn(async()=>response({items:[oldIntent]})));await discoverIntent(session);expect(readIntent(session.actorId)?.key).toBe('old-server-key');
 });
 it('requires the command status endpoint to prove an outcome even after discovery',async()=>{browser();vi.stubGlobal('fetch',vi.fn(async()=>response({items:[{...oldIntent,state:'notCommitted'}]})));await discoverIntent(session);expect(readIntent(session.actorId)?.state).toBeUndefined();await expect(acknowledgeIntent(session)).rejects.toThrow();expect(readIntent(session.actorId)?.key).toBe('old-server-key');});
});
describe('financial result acknowledgment',()=>{
 it('keeps original body and key when a committed result has not been acknowledged',()=>{browser();const body={amount:{currency:'UZS',minor:'100000'}};storeIntent({actorId:session.actorId,key:'original-key',path:'/billing/payments',body,createdAt:'2026-10-01T00:00:00Z'});expect(recordOutcome(session.actorId,'different-key','committed')).toBe(false);expect(readIntent(session.actorId)?.state).toBeUndefined();expect(recordOutcome(session.actorId,'original-key','committed')).toBe(true);expect(readIntent(session.actorId)).toMatchObject({key:'original-key',body,state:'committed'});});
 it('does not acknowledge UNKNOWN or discard a known result after a lost acknowledgment response',async()=>{browser();storeIntent({actorId:session.actorId,key:'original-key',path:'/billing/payments',body:{amount:{currency:'UZS',minor:'100000'}},createdAt:'2026-10-01T00:00:00Z'});const sender=vi.fn(async()=>{throw new Error('offline');});vi.stubGlobal('fetch',sender);await expect(acknowledgeIntent(session)).rejects.toThrow();expect(sender).not.toHaveBeenCalled();recordOutcome(session.actorId,'original-key','committed');await expect(acknowledgeIntent(session)).rejects.toThrow();expect(readIntent(session.actorId)?.key).toBe('original-key');vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({data:{resolved:true,state:'committed'},meta:{requestId:'synthetic-ack',apiVersion:1}}),{status:200})));await acknowledgeIntent(session);expect(readIntent(session.actorId)).toBeUndefined();});
});
