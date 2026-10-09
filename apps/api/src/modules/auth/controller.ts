import {Body,Controller,Delete,Get,HttpCode,Inject,Post,Req,Res} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {object,exactKeys,identifier} from '@automaktab/contracts';
import {AuthService,AccessError} from './session.js';
export interface HttpRequest {headers:Record<string,string|string[]|undefined>;ip?:string;}
export interface HttpResponse {setHeader(name:string,value:string|string[]):void;status(code:number):HttpResponse;json(value:unknown):void;}
export function header(request:HttpRequest,name:string):string|undefined {const value=request.headers[name];return typeof value==='string'?value:undefined;}
export function cookie(request:HttpRequest,name:string):string|undefined {const values=(header(request,'cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(name+'='));if(values.length!==1)return undefined;return values[0]!.slice(name.length+1);}
export function envelope<T>(data:T){return {data,meta:{requestId:randomUUID(),apiVersion:1}};}
@Controller('api/v1/auth')
export class AuthController {
 constructor(@Inject(AuthService) private readonly auth:AuthService){}
 private secureCookie(){return this.auth.options.environment==='production'||new URL(this.auth.options.origin).protocol==='https:';}
 private setSession(response:HttpResponse,token:string){response.setHeader('Set-Cookie',`analytics_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${this.secureCookie()?'; Secure':''}`);}
 @Get('config') async config(@Res() response:HttpResponse){
  const data:{environment:string;providerConfigured:boolean;authorizeUrl?:string}={environment:this.auth.options.environment,providerConfigured:this.auth.configured};
  if(this.auth.configured){const handoff=await this.auth.beginHandoff();data.authorizeUrl=handoff.authorizeUrl;response.setHeader('Set-Cookie',`analytics_handoff=${handoff.state}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=300${this.secureCookie()?'; Secure':''}`);}
  response.json(envelope(data));
 }
 @Post('demo-session') @HttpCode(200) async demo(@Req() request:HttpRequest,@Res() response:HttpResponse){const result=await this.auth.createDemoSession(header(request,'origin'));this.setSession(response,result.token);response.json(envelope(result.session));}
 @Get('session') async session(@Req() request:HttpRequest){return envelope(await this.auth.session(cookie(request,'analytics_session')));}
 @Post('session') async exchange(@Body() body:unknown,@Req() request:HttpRequest,@Res() response:HttpResponse){
  if(header(request,'origin')!==this.auth.options.origin)throw new AccessError('CSRF_FAILED',403);
  const input=object(body);exactKeys(input,['exchangeCode','state']);const result=await this.auth.exchange({exchangeCode:identifier(input.exchangeCode),state:identifier(input.state)},cookie(request,'analytics_handoff'));
  this.setSession(response,result.token);response.json(envelope(result.session));
 }
 @Delete('session') async logout(@Req() request:HttpRequest,@Res() response:HttpResponse){
  const token=cookie(request,'analytics_session');await this.auth.authenticate(token,{origin:header(request,'origin'),csrf:header(request,'x-csrf-token')});await this.auth.revoke(token);
  response.setHeader('Set-Cookie',`analytics_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${this.secureCookie()?'; Secure':''}`);response.json(envelope({revoked:true}));
 }
}
