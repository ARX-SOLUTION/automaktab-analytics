import {expect,it} from 'vitest';
import {annualPeriod} from '../src/modules/billing/domain/period.js';

it('keeps the original leap-day anniversary with February 28 fallback',()=>{
 expect(annualPeriod('2024-02-29','2025-02-28')).toEqual({periodStart:'2025-02-28',periodEnd:'2026-02-28'});
 expect(annualPeriod('2024-02-29','2028-02-29')).toEqual({periodStart:'2028-02-29',periodEnd:'2029-02-28'});
});
