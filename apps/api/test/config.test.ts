import {expect,test,vi} from 'vitest';
import {loadConfig} from '../src/platform/config.js';
import {AuthService} from '../src/modules/auth/session.js';
import {AuthController,type HttpResponse} from '../src/modules/auth/controller.js';
import type {ProductStore} from '../src/db/product-store.js';
test('missing database config fails closed with no secret disclosure',()=>{expect(()=>loadConfig({})).toThrow('CONFIG_INVALID');});
test('non-synthetic and malformed database config fails closed',()=>{for(const url of ['postgresql://private:secret@remote/live','not-a-url'])expect(()=>loadConfig({DATABASE_URL:url,APP_ENV:'synthetic'})).toThrow('CONFIG_INVALID');});

test('requires explicit synthetic env and bounded valid integer port',()=>{const DATABASE_URL='postgresql://synthetic:synthetic-local-only@db:5432/automaktab_synthetic';for(const PORT of ['0','65536','abc','2.5'])expect(()=>loadConfig({APP_ENV:'synthetic',DATABASE_URL,PORT})).toThrow('CONFIG_INVALID');expect(()=>loadConfig({DATABASE_URL})).toThrow('CONFIG_INVALID');expect(loadConfig({APP_ENV:'synthetic',DATABASE_URL}).port).toBe(3000);});
test('production requires an exact founder and HTTPS source endpoints instead of synthetic defaults',()=>{
 const configured={APP_ENV:'production',DATABASE_URL:'postgresql://fixture:fixture-password-only@db.example.invalid/analytics?sslmode=verify-full',PUBLIC_ORIGIN:'https://analytics.example.invalid',FOUNDER_ID:'founder-fixture',CRM_SOURCE_URL:'https://api.example.invalid/',CRM_AUTHORIZE_URL:'https://app.example.invalid/platform/analytics',CRM_SOURCE_SERVICE_TOKEN:'fixture-service-token-that-is-never-live',INGEST_TOKEN:'fixture-ingest-token-that-is-never-live',SSO_AUDIENCE:'https://analytics.example.invalid',PUBLIC_INGEST_ORIGINS:'https://example.invalid'};
 expect(loadConfig(configured).environment).toBe('production');expect(()=>loadConfig({...configured,FOUNDER_ID:undefined})).toThrow('CONFIG_INVALID');expect(()=>loadConfig({...configured,PUBLIC_ORIGIN:'http://analytics.example.invalid'})).toThrow('CONFIG_INVALID');
});
test('development HTTP origins are restricted to loopback while HTTPS origins remain supported',()=>{
 const configured={APP_ENV:'development',DATABASE_URL:'postgresql://fixture:fixture-password-only@db.example.invalid/analytics',PUBLIC_ORIGIN:'http://analytics.example.invalid',FOUNDER_ID:'founder-fixture',CRM_SOURCE_URL:'http://api.example.invalid/',CRM_AUTHORIZE_URL:'http://app.example.invalid/platform/analytics',CRM_SOURCE_SERVICE_TOKEN:'fixture-service-token-that-is-never-live',INGEST_TOKEN:'fixture-ingest-token-that-is-never-live',SSO_AUDIENCE:'http://analytics.example.invalid',PUBLIC_INGEST_ORIGINS:'http://example.invalid'};
 expect(()=>loadConfig(configured)).toThrow('CONFIG_INVALID');
 const local={...configured,PUBLIC_ORIGIN:'http://localhost:3000',SSO_AUDIENCE:'http://localhost:3000',CRM_SOURCE_URL:'http://127.0.0.1:9000/',CRM_AUTHORIZE_URL:'http://localhost:9000/platform/analytics',PUBLIC_INGEST_ORIGINS:'http://127.0.0.1:3001'};
 expect(loadConfig(local).publicOrigin).toBe('http://localhost:3000');
 expect(loadConfig({...local,PUBLIC_ORIGIN:'https://analytics.example.invalid',SSO_AUDIENCE:'https://analytics.example.invalid',CRM_SOURCE_URL:'https://api.example.invalid/',CRM_AUTHORIZE_URL:'https://app.example.invalid/platform/analytics',PUBLIC_INGEST_ORIGINS:'https://example.invalid'}).publicOrigin).toBe('https://analytics.example.invalid');
 for(const patch of [
  {CRM_SOURCE_URL:'http://api.example.invalid/'},
  {CRM_AUTHORIZE_URL:'http://app.example.invalid/platform/analytics'},
  {PUBLIC_INGEST_ORIGINS:'http://example.invalid'},
  {SSO_AUDIENCE:'http://analytics.example.invalid'},
 ])expect(()=>loadConfig({...local,...patch})).toThrow('CONFIG_INVALID');
});
test('auth session cookies are Secure on HTTPS origins and retain the synthetic loopback exception',async()=>{
 const sessionCookie=async(environment:'development'|'synthetic',origin:string)=>{
  const auth={options:{environment,origin},createDemoSession:vi.fn().mockResolvedValue({token:'a'.repeat(64),session:{}})} as unknown as AuthService;
  const setHeader=vi.fn(),response={setHeader,status:vi.fn(),json:vi.fn()} as unknown as HttpResponse;
  Object.defineProperty(response,'setHeader',{value:setHeader});
  await new AuthController(auth).demo({headers:{origin}},response);
  return setHeader.mock.calls.find(([name])=>name==='Set-Cookie')?.[1] as string;
 };
 expect(await sessionCookie('development','https://analytics.example.invalid')).toContain('; Secure');
 expect(await sessionCookie('synthetic','http://127.0.0.1:18517')).not.toContain('; Secure');
});
test('production Hyperdrive connections use an explicit managed transport while direct PostgreSQL keeps TLS verification',()=>{
 const configured={APP_ENV:'production',DATABASE_URL:'postgres://fixture:fixture-password-only@hyperdrive.local/analytics',PUBLIC_ORIGIN:'https://analytics.example.invalid',FOUNDER_ID:'founder-fixture',CRM_SOURCE_URL:'https://api.example.invalid/',CRM_AUTHORIZE_URL:'https://app.example.invalid/platform/analytics',CRM_SOURCE_SERVICE_TOKEN:'fixture-service-token-that-is-never-live',INGEST_TOKEN:'fixture-ingest-token-that-is-never-live',SSO_AUDIENCE:'https://analytics.example.invalid',PUBLIC_INGEST_ORIGINS:'https://example.invalid'};
 expect(()=>loadConfig(configured)).toThrow('CONFIG_INVALID');
 expect(loadConfig(configured,{databaseTransport:'hyperdrive'}).databaseUrl).toBe(configured.DATABASE_URL);
});
test('synthetic Hyperdrive accepts only its local managed endpoint and synthetic credentials',()=>{
 const configured={APP_ENV:'synthetic',DATABASE_URL:'postgresql://synthetic:synthetic-local-only@0123456789abcdef0123456789abcdef.hyperdrive.local:5432/automaktab_synthetic?sslmode=require'};
 expect(loadConfig(configured,{databaseTransport:'hyperdrive'}).environment).toBe('synthetic');
 expect(()=>loadConfig(configured)).toThrow('CONFIG_INVALID');
 expect(()=>loadConfig({...configured,DATABASE_URL:configured.DATABASE_URL.replace('synthetic-local-only','other-password')},{databaseTransport:'hyperdrive'})).toThrow('CONFIG_INVALID');
 expect(()=>loadConfig({...configured,DATABASE_URL:configured.DATABASE_URL.replace('0123456789abcdef0123456789abcdef','remote')},{databaseTransport:'hyperdrive'})).toThrow('CONFIG_INVALID');
});
test('synthetic HTTP origins are restricted to loopback',()=>{
 const DATABASE_URL='postgresql://synthetic:synthetic-local-only@db:5432/automaktab_synthetic';
 expect(loadConfig({APP_ENV:'synthetic',DATABASE_URL,PUBLIC_ORIGIN:'http://localhost:18517'}).publicOrigin).toBe('http://localhost:18517');
 expect(()=>loadConfig({APP_ENV:'synthetic',DATABASE_URL,PUBLIC_ORIGIN:'http://analytics.example.invalid'})).toThrow('CONFIG_INVALID');
 expect(loadConfig({APP_ENV:'synthetic',DATABASE_URL,PUBLIC_ORIGIN:'https://analytics.example.invalid'}).publicOrigin).toBe('https://analytics.example.invalid');
});
test('runtime URL audience reaches the founder handoff unchanged and unsafe production audiences fail closed',async()=>{
 const env={APP_ENV:'production',DATABASE_URL:'postgresql://fixture:fixture-password-only@db.example.invalid/analytics?sslmode=verify-full',PUBLIC_ORIGIN:'https://analytics.example.invalid',FOUNDER_ID:'00000000-0000-4000-8000-000000000001',CRM_SOURCE_URL:'https://api.example.invalid/',CRM_AUTHORIZE_URL:'https://app.example.invalid/platform/analytics/sso/authorize',CRM_SOURCE_SERVICE_TOKEN:'fixture-service-token-that-is-never-live',INGEST_TOKEN:'fixture-ingest-token-that-is-never-live',SSO_AUDIENCE:'https://analytics.example.invalid/',PUBLIC_INGEST_ORIGINS:'https://example.invalid'};
 const config=loadConfig(env),execute=vi.fn().mockResolvedValue(undefined),store={database:{db:{execute}}} as unknown as ProductStore;
 const auth=new AuthService(store,{...config,origin:config.publicOrigin});
 const handoff=await auth.beginHandoff(),url=new URL(handoff.authorizeUrl);
 expect(url.searchParams.get('audience')).toBe(env.SSO_AUDIENCE);
 expect(new URL(url.searchParams.get('returnTo')!).origin).toBe(new URL(env.SSO_AUDIENCE).origin);
 for(const SSO_AUDIENCE of ['analytics.example.invalid','http://analytics.example.invalid','https://user:password@analytics.example.invalid','https://analytics.example.invalid/?secret=value','https://analytics.example.invalid/#fragment'])expect(()=>loadConfig({...env,SSO_AUDIENCE})).toThrow('CONFIG_INVALID');
});
import {parseHealthStatus} from '@automaktab/contracts';
test('runtime health contract rejects malformed types extra keys and unknown versions',()=>{for(const value of [null,[],{status:['ready'],environment:'synthetic',schemaVersion:1},{status:'ready',environment:'synthetic',schemaVersion:2},{status:'ready',environment:'synthetic',schemaVersion:1,secret:'x'}])expect(()=>parseHealthStatus(value)).toThrow('INVALID_HEALTH_STATUS');expect(parseHealthStatus({status:'ready',environment:'synthetic',schemaVersion:1}).status).toBe('ready');});
import {previewTarget} from '../../web/vite.config.js';
test('synthetic preview proxy refuses remote targets or missing environment',()=>{expect(()=>previewTarget({SYNTHETIC_API_URL:'http://private.example'})).toThrow('SYNTHETIC_PROXY_CONFIG_INVALID');expect(()=>previewTarget({SYNTHETIC_API_URL:'http://api:3000'})).toThrow('SYNTHETIC_PROXY_CONFIG_INVALID');expect(previewTarget({APP_ENV:'synthetic',SYNTHETIC_API_URL:'http://api:3000'})).toBe('http://api:3000');});
