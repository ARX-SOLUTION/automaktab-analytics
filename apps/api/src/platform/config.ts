import type {Environment} from '@automaktab/contracts';
export interface RuntimeConfig {readonly databaseUrl:string;readonly port:number;readonly environment:Environment;readonly publicOrigin:string;readonly founderId?:string;readonly sourceUrl?:string;readonly sourceAuthorizeUrl?:string;readonly sourceServiceToken?:string;readonly audience?:string;readonly ingestToken:string;readonly publicIngestOrigins:readonly string[];}
export type DatabaseTransport='direct'|'hyperdrive';
export interface RuntimeConfigOptions {readonly databaseTransport?:DatabaseTransport;}
function secret(value:string|undefined){if(!value||value.length<24||value.length>512||/[\s\r\n]/.test(value))throw new Error();return value;}
function loopbackHost(hostname:string){return hostname==='localhost'||hostname.endsWith('.localhost')||hostname==='127.0.0.1'||hostname==='[::1]';}
function urlValue(value:string|undefined,environment:Environment,originOnly=false):string{const url=new URL(value??'');if(!['http:','https:'].includes(url.protocol)||environment==='production'&&url.protocol!=='https:'||environment!=='production'&&url.protocol==='http:'&&!loopbackHost(url.hostname)||url.username||url.password||url.hash||url.search||originOnly&&url.pathname!=='/')throw new Error();return originOnly?url.origin:url.href;}
export function loadConfig(env:NodeJS.ProcessEnv,options:RuntimeConfigOptions={}):RuntimeConfig {
  try {
    const databaseTransport=options.databaseTransport??'direct';
    const url=new URL(env.DATABASE_URL ?? '');
    const port=Number(env.PORT ?? '3000');
    if(!['synthetic','development','production'].includes(env.APP_ENV??'')||(url.protocol!=='postgresql:'&&!(options.databaseTransport==='hyperdrive'&&url.protocol==='postgres:'))||url.hash||!Number.isInteger(port)||port<1024||port>65535)throw new Error();
    const environment=env.APP_ENV as Environment,production=environment==='production';
    if(environment==='synthetic'){
     const directSyntheticHost=['db','checks-db','127.0.0.1','localhost'].includes(url.hostname);
     const localHyperdriveHost=databaseTransport==='hyperdrive'&&/^[a-f0-9]{32}\.hyperdrive\.local$/.test(url.hostname)&&url.port==='5432'&&url.searchParams.size===1&&['disable','prefer','require','verify-ca','verify-full'].includes(url.searchParams.get('sslmode')??'');
     if((!directSyntheticHost&& !localHyperdriveHost)||url.username!=='synthetic'||url.password!=='synthetic-local-only'||url.pathname!=='/automaktab_synthetic'||directSyntheticHost&&url.search)throw new Error();
     const publicOrigin=urlValue(env.PUBLIC_ORIGIN??'http://127.0.0.1:18517',environment,true);
     return Object.freeze({databaseUrl:url.href,port,environment,publicOrigin,ingestToken:env.INGEST_TOKEN?secret(env.INGEST_TOKEN):'synthetic-ingest-token-only',publicIngestOrigins:Object.freeze(['http://127.0.0.1:18517'])});
    }
    if(!url.username||!url.password||url.pathname==='/'||url.username==='synthetic'||production&&databaseTransport==='direct'&&url.searchParams.get('sslmode')!=='verify-full'||[...url.searchParams.keys()].some(key=>key!=='sslmode'))throw new Error();
    const founderId=env.FOUNDER_ID;if(!founderId||! /^[a-zA-Z0-9_.:-]{1,160}$/.test(founderId))throw new Error();
    const audience=env.SSO_AUDIENCE;if(!audience||audience.length>2048||audience!==audience.trim()||[...audience].some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127))throw new Error();urlValue(audience,environment);
    const origins=(env.PUBLIC_INGEST_ORIGINS??'').split(',').filter(Boolean).map(value=>urlValue(value,environment,true));if(!origins.length||origins.length>10)throw new Error();
    const publicOrigin=urlValue(env.PUBLIC_ORIGIN,environment,true);
    return Object.freeze({databaseUrl:url.href,port,environment,publicOrigin,founderId,sourceUrl:urlValue(env.CRM_SOURCE_URL,environment),sourceAuthorizeUrl:urlValue(env.CRM_AUTHORIZE_URL,environment),sourceServiceToken:secret(env.CRM_SOURCE_SERVICE_TOKEN),audience,ingestToken:secret(env.INGEST_TOKEN),publicIngestOrigins:Object.freeze([...new Set(origins)])});
  } catch {throw new Error('CONFIG_INVALID');}
}
