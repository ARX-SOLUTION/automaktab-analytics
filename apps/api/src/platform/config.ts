import type {Environment} from '@automaktab/contracts';
export interface RuntimeConfig {readonly databaseUrl:string;readonly port:number;readonly environment:Environment;readonly publicOrigin:string;readonly founderId?:string;readonly sourceUrl?:string;readonly sourceAuthorizeUrl?:string;readonly sourceServiceToken?:string;readonly audience?:string;readonly ingestToken:string;readonly publicIngestOrigins:readonly string[];}
function urlValue(value:string|undefined,production:boolean,originOnly=false):string{const url=new URL(value??'');if(!['http:','https:'].includes(url.protocol)||production&&url.protocol!=='https:'||url.username||url.password||url.hash||url.search||originOnly&&url.pathname!=='/')throw new Error();return originOnly?url.origin:url.href;}
function secret(value:string|undefined){if(!value||value.length<24||value.length>512||/[\s\r\n]/.test(value))throw new Error();return value;}
export function loadConfig(env:NodeJS.ProcessEnv):RuntimeConfig {
  try {
    const url=new URL(env.DATABASE_URL ?? '');
    const port=Number(env.PORT ?? '3000');
    if(!['synthetic','development','production'].includes(env.APP_ENV??'')||url.protocol!=='postgresql:'||url.hash||!Number.isInteger(port)||port<1024||port>65535)throw new Error();
    const environment=env.APP_ENV as Environment,production=environment==='production';
    if(environment==='synthetic'){
     if(!['db','checks-db','127.0.0.1','localhost'].includes(url.hostname)||url.username!=='synthetic'||url.password!=='synthetic-local-only'||url.pathname!=='/automaktab_synthetic'||url.search)throw new Error();
     return Object.freeze({databaseUrl:url.href,port,environment,publicOrigin:urlValue(env.PUBLIC_ORIGIN??'http://127.0.0.1:18517',false,true),ingestToken:env.INGEST_TOKEN?secret(env.INGEST_TOKEN):'synthetic-ingest-token-only',publicIngestOrigins:Object.freeze(['http://127.0.0.1:18517'])});
    }
    if(!url.username||!url.password||url.pathname==='/'||url.username==='synthetic'||production&&url.searchParams.get('sslmode')!=='verify-full'||[...url.searchParams.keys()].some(key=>key!=='sslmode'))throw new Error();
    const founderId=env.FOUNDER_ID;if(!founderId||! /^[a-zA-Z0-9_.:-]{1,160}$/.test(founderId))throw new Error();
    const audience=env.SSO_AUDIENCE;if(!audience||audience.length>2048||audience!==audience.trim()||[...audience].some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127)||production&&!audience.startsWith('https://'))throw new Error();urlValue(audience,production);
    const origins=(env.PUBLIC_INGEST_ORIGINS??'').split(',').filter(Boolean).map(value=>urlValue(value,production,true));if(!origins.length||origins.length>10)throw new Error();
    return Object.freeze({databaseUrl:url.href,port,environment,publicOrigin:urlValue(env.PUBLIC_ORIGIN,production,true),founderId,sourceUrl:urlValue(env.CRM_SOURCE_URL,production),sourceAuthorizeUrl:urlValue(env.CRM_AUTHORIZE_URL,production),sourceServiceToken:secret(env.CRM_SOURCE_SERVICE_TOKEN),audience,ingestToken:secret(env.INGEST_TOKEN),publicIngestOrigins:Object.freeze([...new Set(origins)])});
  } catch {throw new Error('CONFIG_INVALID');}
}
