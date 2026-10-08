import {Controller,Get,Inject,Req} from '@nestjs/common';
import {AuthService} from '../modules/auth/session.js';
import {cookie,type HttpRequest} from '../modules/auth/controller.js';
import {API_DOCUMENT} from './openapi.js';
@Controller('api/v1')
export class ApiDocumentController {
 constructor(@Inject(AuthService)private readonly auth:AuthService,@Inject(API_DOCUMENT)private readonly document:unknown){}
 @Get('openapi.json')async read(@Req()request:HttpRequest){await this.auth.authenticate(cookie(request,'analytics_session'));return this.document;}
}
