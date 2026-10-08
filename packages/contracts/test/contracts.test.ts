import {expect,test} from 'vitest';
import {businessDate,instant,parseMoney,parseEventEnvelope,parseQueryScope} from '../src/product.js';
import {openApiInput} from '../src/openapi.js';

test('whole-so‘m money preserves values beyond the JavaScript safe integer range',()=>{
 expect(parseMoney({currency:'UZS',minor:'9007199254740993123'})).toEqual({currency:'UZS',minor:'9007199254740993123'});
 for(const minor of ['1.50','-1','01','1e3'])expect(()=>parseMoney({currency:'UZS',minor})).toThrow('INVALID_REQUEST');
 expect(()=>parseMoney({currency:'USD',minor:'100'})).toThrow('INVALID_REQUEST');
});
test('invoice void documentation accepts the omitted preview total but requires the canonical zero at commit',()=>{
 const preview=openApiInput('/api/v1/billing/invoices/{id}/correction-previews')!;
 const variants=preview.oneOf as Array<{properties:Record<string,Record<string,unknown>>;required:string[]}>;
 expect(variants).toHaveLength(2);
 const voidPreview=variants.find(schema=>schema.properties.type?.const==='void')!;
 expect(voidPreview.required).not.toContain('correctedTotalMinor');
 expect(voidPreview.properties.correctedTotalMinor).toEqual({const:'0'});
 expect(variants.find(schema=>schema!==voidPreview)!.required).toContain('correctedTotalMinor');
 const commits=openApiInput('/api/v1/billing/invoices/{id}/corrections')!.oneOf as typeof variants;
 for(const schema of commits)expect(schema.required).toEqual(expect.arrayContaining(['invoiceId','correctedTotalMinor','previewId','expectedPreviewHash','expectedLedgerRevision']));
});
test('public telemetry cannot assert a school lifecycle or leak form contents',()=>{
 const event={event_id:'event-1',schema_version:1,name:'page.view',occurred_at:'2026-10-08T00:00:00Z',source:'marketing',environment:'synthetic',properties:{path:'/uz',surface:'marketing'}};
 expect(parseEventEnvelope(event,'public').name).toBe('page.view');
 expect(()=>parseEventEnvelope({...event,name:'student.updated'},'public')).toThrow('INVALID_REQUEST');
 expect(()=>parseEventEnvelope({...event,properties:{phone:'private'}},'public')).toThrow('INVALID_REQUEST');
});
test('trusted student state retains opaque ownership and an exact aggregate version',()=>{
 const event={event_id:'event-2',schema_version:1,name:'student.updated',occurred_at:'2026-10-08T00:00:00Z',effective_at:'2026-10-08T00:00:00Z',source:'crm',environment:'synthetic',aggregate_type:'student',aggregate_id:'student-1',aggregate_version:'9007199254740993',company_id:'school-1',properties:{company_id:'school-1',branch_id:'branch-1',status:'active',created_at:'2026-10-08T00:00:00Z',deleted_at:null}};
 expect(parseEventEnvelope(event,'trusted').aggregate_version).toBe('9007199254740993');
 expect(()=>parseEventEnvelope({...event,aggregate_version:Number('9007199254740993')},'trusted')).toThrow('INVALID_REQUEST');
 expect(()=>parseEventEnvelope({...event,properties:{...event.properties,firstName:'private'}},'trusted')).toThrow('INVALID_REQUEST');
});
test('query scope rejects reversed dates and unsupported timezones rather than silently changing scope',()=>{
 expect(parseQueryScope({from:'2026-10-01',to:'2026-11-01',timezone:'Asia/Tashkent',environment:'synthetic'}).timezone).toBe('Asia/Tashkent');
 expect(()=>parseQueryScope({from:'2026-11-01',to:'2026-10-01',timezone:'Asia/Tashkent'})).toThrow('INVALID_REQUEST');
 expect(()=>parseQueryScope({from:'2026-10-01',to:'2026-11-01',timezone:'Unknown/Place'})).toThrow('INVALID_REQUEST');
});
test('invalid calendar dates and normalized invalid event timestamps remain validation errors',()=>{
 for(const value of ['2026-13-01','2026-02-30','2026-02-29'])expect(()=>businessDate(value)).toThrow('INVALID_REQUEST');
 expect(businessDate('2024-02-29')).toBe('2024-02-29');
 for(const value of ['2026-02-30T00:00:00Z','2026-10-01T24:00:00Z'])expect(()=>instant(value)).toThrow('INVALID_REQUEST');
 expect(instant('2026-10-08T04:00:00+05:00')).toBe('2026-10-08T04:00:00+05:00');
});
test('trusted facts reject malformed SQL dates, nested data and mismatched aggregate kinds before admission',()=>{
 const event={event_id:'invalid-fact',schema_version:1,name:'branch.updated',occurred_at:'2026-10-08T00:00:00Z',effective_at:'2026-10-08T00:00:00Z',source:'crm',environment:'synthetic',aggregate_type:'branch',aggregate_id:'branch-1',aggregate_version:'1',company_id:'school-1',properties:{name:'Synthetic Branch',company_id:'school-1',is_active:true,deleted_at:null}};
 expect(()=>parseEventEnvelope({...event,properties:{...event.properties,deleted_at:'not-a-date'}},'trusted')).toThrow('INVALID_REQUEST');
 expect(()=>parseEventEnvelope({...event,aggregate_type:'student'},'trusted')).toThrow('INVALID_REQUEST');
 expect(()=>parseEventEnvelope({...event,name:'lead.created',aggregate_type:'lead',properties:{lead_id:'branch-1',first_touch:{phone:'private'}}},'trusted')).toThrow('INVALID_REQUEST');
 expect(()=>parseEventEnvelope({...event,name:'learning.result',aggregate_type:'learning',properties:{branch_id:'branch-1',subject_id:'subject-1',outcome:'passed',score:80,practice:'false'}},'trusted')).toThrow('INVALID_REQUEST');
 expect(parseEventEnvelope({...event,name:'learning.result',aggregate_type:'learning',properties:{branch_id:'branch-1',subject_id:'subject-1',outcome:'passed',score:null,practice:false}},'trusted').properties.score).toBeNull();
});
