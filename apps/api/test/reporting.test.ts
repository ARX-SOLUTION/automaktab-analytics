import {expect,it} from 'vitest';
import {evaluateFunnel} from '../src/modules/reporting/funnel.js';
it('counts one identified journey only when steps occur in order within the revision window',()=>{
 const result=evaluateFunnel([
  {identity:'a',event:'lead.created',occurredAt:'2026-10-01T10:00:00Z'},
  {identity:'a',event:'page.view',occurredAt:'2026-10-01T11:00:00Z'},
  {identity:'b',event:'page.view',occurredAt:'2026-10-01T10:00:00Z'},
  {identity:'b',event:'lead.created',occurredAt:'2026-10-02T10:00:00Z'},
  {identity:'b',event:'lead.created',occurredAt:'2026-10-03T10:00:00Z'},
  {identity:'c',event:'page.view',occurredAt:'2026-10-01T10:00:00Z'},
  {identity:'c',event:'lead.created',occurredAt:'2026-10-05T10:00:00Z'},
  {identity:null,event:'page.view',occurredAt:'2026-10-01T10:00:00Z'},
 ],{steps:[{event:'page.view',name:'Tashrif'},{event:'lead.created',name:'Murojaat'}],windowDays:2});
 expect(result.steps.map(step=>step.count)).toEqual([3,1]);expect(result.excludedUnidentified).toBe(1);
});
