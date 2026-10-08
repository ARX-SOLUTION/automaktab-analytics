import {afterAll,expect,test} from 'vitest';
import {createFoundationApplication} from '../src/application/index.js';
import {ProductStore} from '../src/db/product-store.js';
import {AuthService} from '../src/modules/auth/session.js';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../src/platform/config.js';
const application=createFoundationApplication({APP_ENV:'synthetic',DATABASE_URL:process.env.DATABASE_URL,PORT:'18301'});
const store=new ProductStore(application.database);
const auth=new AuthService(store,{environment:'synthetic',origin:'http://127.0.0.1:18517'});
afterAll(()=>application.close());
test('a synthetic founder session requires its CSRF secret for mutations and is revoked by logout',async()=>{
 const created=await auth.createDemoSession('http://127.0.0.1:18517');
 expect((await auth.authenticate(created.token)).id).toBe('synthetic-founder');
 await expect(auth.authenticate(created.token,{origin:'http://127.0.0.1:18517',csrf:'wrong'})).rejects.toThrow('CSRF_FAILED');
 expect((await auth.authenticate(created.token,{origin:'http://127.0.0.1:18517',csrf:created.session.csrfToken})).id).toBe('synthetic-founder');
 await auth.revoke(created.token);
 await expect(auth.authenticate(created.token)).rejects.toThrow('SESSION_EXPIRED');
});
test('real SSO HTTP handoff binds founder, audience and browser state and consumes one concurrent exchange',async()=>{
 const founder=randomUUID(),origin='https://analytics.example.test',audience=origin;let calls=0,wrongFounder=false;
 const provider=createServer((request,response)=>{calls++;expect(request.url).toBe('/internal/analytics/sso/exchange');expect(request.headers.authorization).toBe('Bearer synthetic-sso-provider-token-only');response.setHeader('Content-Type','application/json');response.end(JSON.stringify({founder_id:wrongFounder?randomUUID():founder,audience,auth_time:new Date().toISOString(),expires_at:new Date(Date.now()+60000).toISOString()}));});
 await new Promise<void>(resolve=>provider.listen(0,'127.0.0.1',resolve));const address=provider.address();if(!address||typeof address==='string')throw new Error('SYNTHETIC_PROVIDER_UNAVAILABLE');
 const config=loadConfig({APP_ENV:'development',DATABASE_URL:'postgresql://fixture:fixture-password-only@db.example.invalid/analytics',PUBLIC_ORIGIN:origin,FOUNDER_ID:founder,CRM_SOURCE_URL:`http://127.0.0.1:${address.port}/`,CRM_AUTHORIZE_URL:'https://crm.example.test/platform/analytics/sso/authorize',CRM_SOURCE_SERVICE_TOKEN:'synthetic-sso-provider-token-only',SSO_AUDIENCE:audience,INGEST_TOKEN:'synthetic-ingest-fixture-token-only',PUBLIC_INGEST_ORIGINS:'https://marketing.example.test'});
 const real=new AuthService(store,{...config,origin:config.publicOrigin});
 try{
  const binding=await real.beginHandoff();const url=new URL(binding.authorizeUrl);expect(url.searchParams.get('returnTo')).toBe(origin+'/auth/callback');expect(url.searchParams.get('audience')).toBe(audience);expect(url.searchParams.get('nonce')).toMatch(/^[a-f0-9]{64}$/);
  await expect(real.exchange({exchangeCode:'a'.repeat(43),state:binding.state},'wrong-browser-state')).rejects.toThrow('FOUNDER_REQUIRED');expect(calls).toBe(0);
  const outcomes=await Promise.allSettled([real.exchange({exchangeCode:'a'.repeat(43),state:binding.state},binding.state),real.exchange({exchangeCode:'a'.repeat(43),state:binding.state},binding.state)]);expect(outcomes.filter(outcome=>outcome.status==='fulfilled')).toHaveLength(1);expect(calls).toBe(1);
  const accepted=outcomes.find(outcome=>outcome.status==='fulfilled');if(accepted?.status!=='fulfilled')throw new Error('SYNTHETIC_SSO_NOT_ACCEPTED');expect(await real.authenticate(accepted.value.token)).toEqual({id:founder,environment:'development'});
  await real.revoke(accepted.value.token);await expect(real.authenticate(accepted.value.token)).rejects.toThrow('SESSION_EXPIRED');
  wrongFounder=true;const denied=await real.beginHandoff();await expect(real.exchange({exchangeCode:'b'.repeat(43),state:denied.state},denied.state)).rejects.toThrow('FOUNDER_REQUIRED');
  await expect(real.exchange({exchangeCode:'b'.repeat(43),state:denied.state},denied.state)).rejects.toThrow('FOUNDER_REQUIRED');expect(calls).toBe(2);
 }finally{await new Promise<void>((resolve,reject)=>provider.close(error=>error?reject(error):resolve()));}
});
