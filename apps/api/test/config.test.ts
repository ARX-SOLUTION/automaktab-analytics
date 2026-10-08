import {expect,test,vi} from 'vitest';
import {loadConfig} from '../src/platform/config.js';
import {AuthService} from '../src/modules/auth/session.js';
import type {ProductStore} from '../src/db/product-store.js';
test('missing database config fails closed with no secret disclosure',()=>{expect(()=>loadConfig({})).toThrow('CONFIG_INVALID');});
test('non-synthetic and malformed database config fails closed',()=>{for(const url of ['postgresql://private:secret@remote/live','not-a-url'])expect(()=>loadConfig({DATABASE_URL:url,APP_ENV:'synthetic'})).toThrow('CONFIG_INVALID');});

test('requires explicit synthetic env and bounded valid integer port',()=>{const DATABASE_URL='postgresql://synthetic:synthetic-local-only@db:5432/automaktab_synthetic';for(const PORT of ['0','65536','abc','2.5'])expect(()=>loadConfig({APP_ENV:'synthetic',DATABASE_URL,PORT})).toThrow('CONFIG_INVALID');expect(()=>loadConfig({DATABASE_URL})).toThrow('CONFIG_INVALID');expect(loadConfig({APP_ENV:'synthetic',DATABASE_URL}).port).toBe(3000);});
test('production requires an exact founder and HTTPS source endpoints instead of synthetic defaults',()=>{
 const configured={APP_ENV:'production',DATABASE_URL:'postgresql://fixture:fixture-password-only@db.example.invalid/analytics?sslmode=verify-full',PUBLIC_ORIGIN:'https://analytics.example.invalid',FOUNDER_ID:'founder-fixture',CRM_SOURCE_URL:'https://api.example.invalid/',CRM_AUTHORIZE_URL:'https://app.example.invalid/platform/analytics',CRM_SOURCE_SERVICE_TOKEN:'fixture-service-token-that-is-never-live',INGEST_TOKEN:'fixture-ingest-token-that-is-never-live',SSO_AUDIENCE:'https://analytics.example.invalid',PUBLIC_INGEST_ORIGINS:'https://example.invalid'};
 expect(loadConfig(configured).environment).toBe('production');expect(()=>loadConfig({...configured,FOUNDER_ID:undefined})).toThrow('CONFIG_INVALID');expect(()=>loadConfig({...configured,PUBLIC_ORIGIN:'http://analytics.example.invalid'})).toThrow('CONFIG_INVALID');
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
