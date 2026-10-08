import {BadRequestException,Body,Controller,Headers,HttpCode,Inject,Post,UnauthorizedException} from '@nestjs/common';
import {CollectorService} from './collector.js';
import {SchoolService} from '../schools/schools.service.js';

@Controller()
export class CollectorController {
 constructor(@Inject(CollectorService)private readonly collector:CollectorService,@Inject(SchoolService)private readonly schools:SchoolService){}
 @Post('collect/v1/events') @HttpCode(202)
 publicEvents(@Body()body:unknown){return this.invoke(()=>this.collector.admit(body,'public'));}
 @Post('internal/v1/events') @HttpCode(202)
 trustedEvents(@Body()body:unknown,@Headers('authorization')authorization?:string){return this.invoke(()=>this.collector.admit(body,'trusted',authorization));}
 @Post('internal/v1/snapshots') @HttpCode(202)
 snapshot(@Body()body:unknown,@Headers('authorization')authorization?:string){return this.invoke(()=>this.schools.acceptSnapshot(body,authorization));}
 @Post('internal/v1/subject-aliases') @HttpCode(202)
 verifyAlias(@Body()body:unknown,@Headers('authorization')authorization?:string){return this.invoke(()=>this.schools.verifyAlias(body,authorization));}
 @Post('internal/v1/subject-aliases/revoke') @HttpCode(202)
 revokeAlias(@Body()body:unknown,@Headers('authorization')authorization?:string){return this.invoke(()=>this.schools.revokeAlias(body,authorization));}
 private async invoke<T>(work:()=>Promise<T>):Promise<T>{
  try{return await work();}catch(error){
   const code=error instanceof Error?error.message:'COLLECTION_FAILED';
   if(code==='SOURCE_UNAUTHORIZED')throw new UnauthorizedException({code});
   if(['INVALID_REQUEST','INVALID_EVENT','BATCH_LIMIT','INVALID_SNAPSHOT','SNAPSHOT_HASH_MISMATCH','INVALID_BASELINE','DUPLICATE_SNAPSHOT_RECORD','SOURCE_HEADS_MISMATCH','MISSING_SNAPSHOT_PARENT','BASELINE_CONFLICT','BARRIER_CONFLICT','OWNERSHIP_MISMATCH','INVALID_ALIAS_PROOF','ALIAS_TARGET_NOT_CANONICAL','ALIAS_PROOF_CONFLICT','ALIAS_PROOF_NOT_FOUND'].includes(code)||code.startsWith('BASELINE_'))throw new BadRequestException({code});
   throw error;
  }
 }
}
