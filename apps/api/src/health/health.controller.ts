import {Controller,Get,Inject,Res} from '@nestjs/common';
import {Readiness} from '../application/index.js';
interface HealthResponse {status(code:number):HealthResponse;json(body:unknown):void;}
@Controller('health')
export class HealthController {
 constructor(@Inject(Readiness) private readonly readiness:Readiness){}
 @Get('live') live(){return {status:'live',environment:this.readiness.environment,schemaVersion:1};}
 @Get('ready') async ready(@Res() response:HealthResponse){const state=await this.readiness.check();response.status(state.status==='ready'?200:503).json(state);}
}
