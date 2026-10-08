import type {RuntimeConfig} from '../platform/config.js';
import type {Database} from '../db/index.js';
import {createCollectionRuntime} from '../modules/collection/worker.js';
export const SOURCE_SYNC=Symbol('SOURCE_SYNC');
export type SourceSync=ReturnType<typeof createSourceSync>;
export function createSourceSync(database:Database,config:RuntimeConfig){
 const collection=createCollectionRuntime(database,{environment:config.environment,trustedToken:config.ingestToken});let running:Promise<unknown>|undefined;
 const configured=Boolean(config.sourceUrl&&config.sourceServiceToken);
 const sync=(activate=false):Promise<unknown>=>{
  if(running)return running;if(!configured)return Promise.reject(new Error('SOURCE_NOT_CONFIGURED'));
  running=(async()=>{
   const endpoint=new URL('internal/analytics/'+(activate?'activate':'snapshot'),config.sourceUrl!.replace(/\/?$/,'/'));
   const response=await fetch(endpoint,{method:activate?'POST':'GET',headers:{Accept:'application/json',Authorization:'Bearer '+config.sourceServiceToken},redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('SOURCE_SYNC_FAILED');const length=Number(response.headers.get('content-length')??0);if(length>33554432)throw new Error('SOURCE_SNAPSHOT_TOO_LARGE');
   const reader=response.body?.getReader();if(!reader)throw new Error('SOURCE_SYNC_FAILED');const chunks:Uint8Array[]=[];let bytes=0;
   for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>33554432){await reader.cancel();throw new Error('SOURCE_SNAPSHOT_TOO_LARGE');}chunks.push(next.value);}
   const snapshot:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));return collection.schools.acceptSnapshot(snapshot,'Bearer '+config.ingestToken);
  })().finally(()=>{running=undefined;});return running;
 };
 return {configured,sync};
}
