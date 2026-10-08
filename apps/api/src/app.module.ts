import {Module} from '@nestjs/common';
import {sql} from 'drizzle-orm';
import {HealthController} from './health/health.controller.js';
import {Readiness,createCollectionRuntime,type createFoundationApplication} from './application/index.js';
import {ProductStore} from './db/product-store.js';
import {AuthService,type AuthOptions} from './modules/auth/session.js';
import {AuthController} from './modules/auth/controller.js';
import {CollectorController} from './modules/collection/controller.js';
import {CollectorService} from './modules/collection/collector.js';
import {SchoolService} from './modules/schools/schools.service.js';
import {ReportingService} from './modules/reporting/reporting.service.js';
import {ReportingController} from './modules/reporting/controller.js';
import {BillingService} from './modules/billing/billing.service.js';
import {BillingController} from './modules/billing/controller.js';
import {CommandRegistry} from './modules/commands/registry.js';
import {SOURCE_SYNC,createSourceSync} from './application/source-sync.js';
import {API_DOCUMENT,buildOpenApi} from './platform/openapi.js';
import {ApiDocumentController} from './platform/openapi.controller.js';
type Application=ReturnType<typeof createFoundationApplication>;
export function foundationModule(application:Application,authOptions:AuthOptions={environment:'synthetic',origin:'http://127.0.0.1:18517'}){
 const store=new ProductStore(application.database);const auth=new AuthService(store,authOptions);const collection=createCollectionRuntime(store,{environment:application.config.environment,trustedToken:application.config.ingestToken});const reports=new ReportingService(store,(...args)=>collection.schools.qualitySummary(...args));const billing=new BillingService(store,(...args)=>collection.schools.getBasis(...args),undefined,async(tx,company,environment)=>{const [school]=await store.query(tx,sql`SELECT id FROM analytics_schools WHERE id=${company} AND environment=${environment} AND NOT is_demo`);return Boolean(school);});application.readiness.enableProductChecks();
 const controllers=[HealthController,AuthController,CollectorController,ReportingController,BillingController,ApiDocumentController];
 @Module({controllers,providers:[{provide:API_DOCUMENT,useValue:buildOpenApi(controllers)},{provide:Readiness,useValue:application.readiness},{provide:AuthService,useValue:auth},{provide:ProductStore,useValue:store},{provide:CollectorService,useValue:collection.collector},{provide:SchoolService,useValue:collection.schools},{provide:ReportingService,useValue:reports},{provide:BillingService,useValue:billing},{provide:CommandRegistry,useValue:new CommandRegistry(store,billing)},{provide:SOURCE_SYNC,useValue:createSourceSync(application.database,application.config)}]})
 class FoundationModule {}
 return FoundationModule;
}
