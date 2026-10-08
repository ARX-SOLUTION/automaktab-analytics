import {describe,expect,it} from 'vitest';
import {changeFilter,filtersForRoute,filtersFromUrl,moneyText,tashkentDateTime} from '../src/app/state.js';

describe('owner dashboard scope',()=>{
 it('uses school totals for finance without changing nonfinancial branch scope',()=>{
  const filters=filtersFromUrl('?from=2026-10-01&to=2026-11-01&companyId=school-a&branchId=branch-a&surface=tenant');
  expect(filtersForRoute(filters,'payments')).toMatchObject({companyId:'school-a',branchId:'',surface:''});
  expect(filtersForRoute(filters,'usage')).toMatchObject({companyId:'school-a',branchId:'branch-a',surface:'tenant'});
 });
 it('clears a branch when its school changes and preserves date scope',()=>{
  const filters=filtersFromUrl('?from=2026-10-01&to=2026-11-01&companyId=school-a&branchId=branch-a');
  expect(changeFilter(filters,'companyId','school-b')).toMatchObject({companyId:'school-b',branchId:'',from:'2026-10-01',to:'2026-11-01'});
 });
 it('does not turn an unknown financial value into zero',()=>{
  expect(moneyText(null)).toBe('Ma’lumot yo‘q');
  expect(moneyText('0')).toBe('0 so‘m');
  expect(moneyText('900719925474099312345')).toContain('900');
 });
 it('defaults receipt time to the same Tashkent business day the form displays',()=>{
  expect(tashkentDateTime(new Date('2026-10-07T22:30:00Z'))).toBe('2026-10-08T03:30');
 });
});
