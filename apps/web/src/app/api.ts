import {useEffect,useRef,useState} from 'react';
import type {ApiResult,ResponseMeta,Session} from '@automaktab/contracts';
export type Meta=ResponseMeta;
export type Envelope<T>=ApiResult<T>;
export type {Session};
export class ApiError extends Error{constructor(readonly code:string,message:string,readonly requestId:string,readonly retryable:boolean,readonly details?:unknown){super(message);}}
export const errors:Record<string,string>={SESSION_EXPIRED:'Sessiya tugadi. Qayta kiring.',FOUNDER_REQUIRED:'Bu hisobga platforma nazorati ruxsati berilmagan.',CSRF_FAILED:'Sessiya tekshiruvi o‘tmadi. Qayta kiring.',AUTH_NOT_CONFIGURED:'Kirish provayderi hali sozlanmagan.',PREVIEW_STALE:'Hisoblash asosi o‘zgargan. Yangi ko‘rib chiqish kerak.',CORRECTION_PREVIEW_STALE:'Invoice qoldig‘i o‘zgargan. Yangi correction reviewini oling.',SOURCE_NOT_CONFIGURED:'CRM manbasi serverda sozlanmagan. Sozlamalar tayyor bo‘lgach qayta tekshiring.',NOT_FOUND:'Ma’lumot topilmadi yoki ruxsat yo‘q.',DEFINITION_STALE:'Funnel versiyasi o‘zgargan. Joriy ta’rifni qayta tanlab review oling.',REVERSAL_PREVIEW_STALE:'Tushum va qarz holati o‘zgargan. Yangi review oling.',ALLOCATION_CONFLICT:'Invoice qoldig‘i o‘zgargan. Taqsimotni qayta ko‘rib chiqing.',SOURCE_NOT_READY:'Manba ma’lumotlari to‘liq emas. Invoice yopilmadi.',BILLING_POLICY_UNCONFIRMED:'Billing qoidalari faollashtirilmagan.',COMMAND_IN_PROGRESS:'Bu amal serverda bajarilmoqda. Shu niyatni tekshiring.',IDEMPOTENCY_CONFLICT:'Bu kalit avval boshqa amal uchun ishlatilgan.',RESOURCE_NOT_FOUND:'Ma’lumot topilmadi yoki ruxsat yo‘q.',RATE_LIMITED:'So‘rovlar chegarasi oshdi. Biroz kutib qayta tekshiring.',NETWORK_ERROR:'Server javobi kelmadi. Moliyaviy amal natijasi noma’lum bo‘lishi mumkin.'};
export async function request<T>(path:string,options:{method?:string;body?:unknown;signal?:AbortSignal;csrfToken?:string;key?:string}={}):Promise<Envelope<T>>{
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);const abort=()=>controller.abort();if(options.signal?.aborted)controller.abort();options.signal?.addEventListener('abort',abort,{once:true});
 try{
  const response=await fetch(`/api/v1${path}`,{method:options.method??'GET',credentials:'same-origin',signal:controller.signal,headers:{Accept:'application/json',...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(options.csrfToken?{'X-CSRF-Token':options.csrfToken}:{}),...(options.key?{'Idempotency-Key':options.key}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{})});
  const value=await response.json() as {data?:T;meta?:Meta;error?:{code:string;message:string;retryable:boolean;details?:unknown}};
  if(!response.ok||value.error){const error=value.error;throw new ApiError(error?.code??'REQUEST_FAILED',errors[error?.code??'']??error?.message??'So‘rov bajarilmadi.',value.meta?.requestId??'',error?.retryable??false,error?.details);}
  if(!value.meta||!Object.prototype.hasOwnProperty.call(value,'data'))throw new ApiError('INVALID_RESPONSE','Server javobi kutilgan formatda emas.','',false);
  return {data:value.data as T,meta:value.meta};
 }catch(error){if(error instanceof ApiError)throw error;if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');throw new ApiError('NETWORK_ERROR',errors.NETWORK_ERROR,'',true);}
 finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);}
}
export type QueryState<T>={key:string;loading:boolean;result?:Envelope<T>;error?:ApiError};
export function useQuery<T>(path:string|null,onDenied?:()=>void,version=0):QueryState<T>&{reload:()=>void}{
 const [refresh,setRefresh]=useState(0);const [state,setState]=useState<QueryState<T>>({key:'',loading:false});const sequence=useRef(0);const denied=useRef(onDenied);denied.current=onDenied;
 useEffect(()=>{const token=++sequence.current;if(!path){setState({key:'',loading:false});return;}const controller=new AbortController();setState(previous=>previous.key===path?{...previous,loading:true,error:undefined}:{key:path,loading:true});
  request<T>(path,{signal:controller.signal}).then(result=>{if(token===sequence.current&&!controller.signal.aborted)setState({key:path,loading:false,result});}).catch(error=>{if(controller.signal.aborted||token!==sequence.current)return;const apiError=error as ApiError;if(['SESSION_EXPIRED','FOUNDER_REQUIRED'].includes(apiError.code)){setState({key:path,loading:false,error:apiError});denied.current?.();return;}setState(previous=>({key:path,loading:false,...(previous.key===path?{result:previous.result}:{}),error:apiError}));});return()=>controller.abort();
 },[path,refresh,version]);
 return {...(state.key===path?state:{key:path??'',loading:Boolean(path)}),reload:()=>setRefresh(value=>value+1)};
}
