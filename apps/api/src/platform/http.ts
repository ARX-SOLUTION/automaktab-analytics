import type {RuntimeConfig} from './config.js';
import {randomUUID} from 'node:crypto';
interface Request{method:string;path:string;ip?:string;headers:Record<string,string|string[]|undefined>;socket:{remoteAddress?:string};}
interface Response{setHeader(name:string,value:string):void;status(code:number):Response;json(value:unknown):void;end():void;}
export function protection(config:RuntimeConfig){
 const windows=new Map<string,{at:number;count:number}>();
 return (request:Request,response:Response,next:()=>void)=>{
  response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Referrer-Policy','no-referrer');response.setHeader('Cache-Control','no-store');
  if(request.path.startsWith('/health/')){next();return;}
  const reject=(status:number,code:string)=>response.status(status).json({error:{code,message:'Request unavailable',retryable:status===429},meta:{apiVersion:1,requestId:randomUUID()}});
  if(request.path==='/collect/v1/events'||request.path==='/tracker/v1.js'){
   const origin=request.headers.origin;
   const staticGet=request.path==='/tracker/v1.js'&&request.method==='GET'&&origin===undefined;
   if(!staticGet&&(typeof origin!=='string'||!config.publicIngestOrigins.includes(origin))){reject(403,'SOURCE_ORIGIN_DENIED');return;}
   if(typeof origin==='string')response.setHeader('Access-Control-Allow-Origin',origin);response.setHeader('Vary','Origin');response.setHeader('Access-Control-Allow-Methods',request.path==='/tracker/v1.js'?'GET, OPTIONS':'POST, OPTIONS');response.setHeader('Access-Control-Allow-Headers','Content-Type');
   if(request.method==='OPTIONS'){response.status(204).end();return;}
  }
  const now=Date.now(),key=(request.socket.remoteAddress??'unknown')+':'+(request.path.startsWith('/internal/')?'internal':request.path==='/collect/v1/events'?'public':'owner');
  if(windows.size>=4096)for(const [id,window]of windows)if(now-window.at>=60000)windows.delete(id);
  if(!windows.has(key)&&windows.size>=4096){reject(429,'RATE_LIMITED');return;}
  const window=windows.get(key);if(!window||now-window.at>=60000)windows.set(key,{at:now,count:1});else if(++window.count>600){response.setHeader('Retry-After','60');reject(429,'RATE_LIMITED');return;}
  next();
 };
}
