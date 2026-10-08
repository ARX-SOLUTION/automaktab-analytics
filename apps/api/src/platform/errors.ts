import {Catch,HttpException,type ExceptionFilter,type ArgumentsHost} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
@Catch()
export class SafeErrorFilter implements ExceptionFilter {
 catch(error:unknown,host:ArgumentsHost){
  const domain=error instanceof Error&&'code'in error&&'status'in error?error as Error&{code:unknown;status:unknown}:undefined;
  const status=domain&&typeof domain.status==='number'&&domain.status>=400&&domain.status<=599?domain.status:error instanceof HttpException?error.getStatus():error instanceof Error&&error.message==='INVALID_REQUEST'?400:error instanceof Error&&error.message==='NOT_FOUND'?404:500;
  const code=domain&&typeof domain.code==='string'&&/^[A-Z_]+$/.test(domain.code)?domain.code:status===404?'NOT_FOUND':status===400?'INVALID_REQUEST':'REQUEST_FAILED';
  host.switchToHttp().getResponse<{status(code:number):{json(value:unknown):void}}>().status(status).json({error:{code,message:'Request unavailable',retryable:status>=500},meta:{requestId:randomUUID(),apiVersion:1}});
 }
}
