import {describe,expect,it} from 'vitest';
import {calculateBilling} from '../src/modules/billing/domain/calculate.js';

describe('school billing calculation',()=>{
 it('charges authoritative active days and excludes suspended days',()=>{
  const result=calculateBilling({planType:'active_student',amountMinor:'31000',contractFrom:'2026-01-01',contractTo:null,periodStart:'2026-01-01',periodEnd:'2026-02-01',intervals:[
   {subjectId:'student-a',branchId:'branch-a',from:'2026-01-01',to:'2026-01-11',status:'active'},
   {subjectId:'student-a',branchId:'branch-a',from:'2026-01-11',to:'2026-02-01',status:'suspended'}
  ]});
  expect(result.totalMinor).toBe('10000');
 expect(result.lines).toEqual([{subjectId:'student-a',branchId:'branch-a',days:10,amountMinor:'10000',basis:'activeCalendarDays'}]);
 });
 it('prorates the first fixed monthly period once at school level',()=>{
  const input={planType:'fixed_monthly' as const,amountMinor:'100000',contractFrom:'2026-01-16',contractTo:null,periodStart:'2026-01-01',periodEnd:'2026-02-01',intervals:[]};
  expect(calculateBilling(input).totalMinor).toBe('51613');
  const afterCancellation=calculateBilling({...input,contractTo:'2026-01-24'});
  expect(afterCancellation.totalMinor).toBe('25806');
  expect(BigInt(calculateBilling(input).totalMinor)-BigInt(afterCancellation.totalMinor)).toBe(25807n);
 });
 it('unions duplicate subject days, attributes transfers and excludes zero-day/demo/deleted intervals',()=>{
  const active={subjectId:'subject-a',branchId:'branch-a',from:'2026-01-01',to:'2026-01-04',status:'active'},result=calculateBilling({planType:'active_student',amountMinor:'3100',contractFrom:'2026-01-01',contractTo:null,periodStart:'2026-01-01',periodEnd:'2026-02-01',intervals:[active,active,{...active,branchId:'branch-b',from:'2026-01-04',to:'2026-01-07'},{...active,from:'2026-01-07',to:'2026-01-07'},{...active,subjectId:'demo',demo:true},{...active,subjectId:'deleted',deleted:true}]});
  expect(result.totalMinor).toBe('600');
  expect(result.lines.map(line=>[line.branchId,line.days,line.amountMinor])).toEqual([['branch-a',3,'300'],['branch-b',3,'300']]);
 });
 it('rounds once and distributes deterministic residuals without losing large integer precision',()=>{
  const intervals=[{subjectId:'subject-b',branchId:'branch',from:'2026-01-01',to:'2026-01-11',status:'active'},{subjectId:'subject-a',branchId:'branch',from:'2026-01-01',to:'2026-01-11',status:'active'}],input={planType:'active_student' as const,amountMinor:'1',contractFrom:'2026-01-01',contractTo:null,periodStart:'2026-01-01',periodEnd:'2026-02-01',intervals};
  const small=calculateBilling(input);expect(small.totalMinor).toBe('1');expect(small.lines.map(line=>line.amountMinor)).toEqual(['1','0']);expect(calculateBilling({...input,intervals:[...intervals].reverse()})).toEqual(small);
  const large=calculateBilling({...input,amountMinor:'999999999999999999999999999999'}),expected=(999999999999999999999999999999n*20n*2n+31n)/62n;
  expect(large.totalMinor).toBe(expected.toString());expect(large.lines.reduce((sum,line)=>sum+BigInt(line.amountMinor),0n)).toBe(expected);
 });
 it('rejects contradictory branch days and reversed active intervals instead of silently underbilling',()=>{
  const interval={subjectId:'subject',branchId:'branch-a',from:'2026-01-01',to:'2026-01-11',status:'active'},input={planType:'active_student' as const,amountMinor:'3100',contractFrom:'2026-01-01',contractTo:null,periodStart:'2026-01-01',periodEnd:'2026-02-01',intervals:[interval,{...interval,branchId:'branch-b'}]};
  expect(()=>calculateBilling(input)).toThrow('BILLING_BASIS_CONFLICT');
  expect(()=>calculateBilling({...input,intervals:[{...interval,from:'2026-01-20'}]})).toThrow('BILLING_BASIS_CONFLICT');
 });
});
