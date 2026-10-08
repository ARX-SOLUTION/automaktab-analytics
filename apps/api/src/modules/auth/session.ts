import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {sql} from 'drizzle-orm';
import type {Environment,Session} from '@automaktab/contracts';
import {ProductStore,type Actor} from '../../db/product-store.js';
export interface AuthOptions {environment:Environment;origin:string;founderId?:string;sourceUrl?:string;sourceServiceToken?:string;sourceAuthorizeUrl?:string;audience?:string;}
export class AccessError extends Error {constructor(readonly code:string,readonly status:number){super(code);}}
export function digest(value:string){return createHash('sha256').update(value).digest('hex');}
function matches(left:string,right:string){return left.length===right.length&&timingSafeEqual(Buffer.from(left),Buffer.from(right));}
export class AuthService {
 constructor(private readonly store:ProductStore,readonly options:AuthOptions){}
 private requireOrigin(origin:string|undefined){if(origin!==this.options.origin)throw new AccessError('CSRF_FAILED',403);}
 get configured(){return !!(this.options.founderId&&this.options.sourceUrl&&this.options.sourceServiceToken&&this.options.sourceAuthorizeUrl&&this.options.audience);}
 async createDemoSession(origin:string|undefined){this.requireOrigin(origin);if(this.options.environment!=='synthetic')throw new AccessError('FOUNDER_REQUIRED',403);return this.create('synthetic-founder');}
 private async create(actorId:string){
  const token=randomBytes(32).toString('hex'),csrfToken=digest('csrf:'+token);
  await this.store.database.db.execute(sql`INSERT INTO analytics_sessions(token_hash,actor_id,csrf_hash,environment,expires_at) VALUES(${digest(token)},${actorId},${digest(csrfToken)},${this.options.environment},now()+interval '8 hours')`);
  return {token,session:{actorId,displayName:'Platforma administratori',csrfToken,environment:this.options.environment} satisfies Session};
 }
 async authenticate(token:string|undefined,mutation?:{origin?:string;csrf?:string}):Promise<Actor>{
  if(!token||! /^[a-f0-9]{64}$/.test(token))throw new AccessError('SESSION_EXPIRED',401);
  const rows=await this.store.query<{actor_id:string;csrf_hash:string}>(this.store.database.db,sql`SELECT actor_id,csrf_hash FROM analytics_sessions WHERE token_hash=${digest(token)} AND environment=${this.options.environment} AND revoked_at IS NULL AND expires_at>now()`);
  const row=rows[0];if(!row||row.actor_id!==(this.options.environment==='synthetic'?'synthetic-founder':this.options.founderId))throw new AccessError('SESSION_EXPIRED',401);
  if(mutation){this.requireOrigin(mutation.origin);if(!mutation.csrf||!matches(digest(mutation.csrf),row.csrf_hash))throw new AccessError('CSRF_FAILED',403);}
  return {id:row.actor_id,environment:this.options.environment};
 }
 async session(token:string|undefined):Promise<Session>{const actor=await this.authenticate(token);return {actorId:actor.id,displayName:'Platforma administratori',csrfToken:digest('csrf:'+token!),environment:actor.environment};}
 async revoke(token:string|undefined){await this.authenticate(token);await this.store.database.db.execute(sql`UPDATE analytics_sessions SET revoked_at=now() WHERE token_hash=${digest(token!)}`);}
 async beginHandoff(){
  if(!this.configured)throw new AccessError('AUTH_NOT_CONFIGURED',503);
  const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex');
  await this.store.database.db.execute(sql`INSERT INTO analytics_handoffs(state_hash,nonce,expires_at) VALUES(${digest(state)},${nonce},now()+interval '5 minutes')`);
  const url=new URL(this.options.sourceAuthorizeUrl!);url.searchParams.set('state',state);url.searchParams.set('nonce',nonce);url.searchParams.set('audience',this.options.audience!);url.searchParams.set('returnTo',this.options.origin+'/auth/callback');
  return {state,authorizeUrl:url.href};
 }
 async exchange(input:{exchangeCode:string;state:string},stateCookie:string|undefined){
  if(!this.configured)throw new AccessError('AUTH_NOT_CONFIGURED',503);
  if(!stateCookie||!matches(input.state,stateCookie))throw new AccessError('FOUNDER_REQUIRED',403);
  const handoff=await this.store.transaction(async tx=>{const rows=await this.store.query<{nonce:string}>(tx,sql`SELECT nonce FROM analytics_handoffs WHERE state_hash=${digest(input.state)} AND used_at IS NULL AND expires_at>now() FOR UPDATE`);if(!rows[0])throw new AccessError('FOUNDER_REQUIRED',403);await tx.execute(sql`UPDATE analytics_handoffs SET used_at=now() WHERE state_hash=${digest(input.state)}`);return rows[0];});
  let proof:Record<string,unknown>;
  try{const response=await fetch(new URL('internal/analytics/sso/exchange',this.options.sourceUrl!.replace(/\/?$/,'/')),{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+this.options.sourceServiceToken},body:JSON.stringify({code:input.exchangeCode,state:input.state,nonce:handoff.nonce,audience:this.options.audience}),signal:AbortSignal.timeout(5000),redirect:'error'});if(!response.ok)throw new Error();proof=await response.json() as Record<string,unknown>;}catch{throw new AccessError('AUTH_PROVIDER_UNAVAILABLE',503);}
  if(proof.founder_id!==this.options.founderId||proof.audience!==this.options.audience||typeof proof.expires_at!=='string'||!Number.isFinite(Date.parse(proof.expires_at))||Date.parse(proof.expires_at)<=Date.now()||typeof proof.auth_time!=='string'||!Number.isFinite(Date.parse(proof.auth_time))||Date.parse(proof.auth_time)>Date.now()+30000||Date.now()-Date.parse(proof.auth_time)>300000)throw new AccessError('FOUNDER_REQUIRED',403);
  return this.create(this.options.founderId!);
 }
}
