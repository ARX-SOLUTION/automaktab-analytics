export interface BillingInterval {subjectId:string;branchId:string;from:string;to:string;status:string;deleted?:boolean;demo?:boolean;}
export interface BillingInput {
 planType:'fixed_monthly'|'fixed_annual'|'active_student';amountMinor:string;contractFrom:string;contractTo:string|null;
 periodStart:string;periodEnd:string;intervals:BillingInterval[];
}
export interface BillingLine {subjectId?:string;branchId?:string;days:number;amountMinor:string;basis:string;}
export interface BillingCalculation {totalMinor:string;lines:BillingLine[];}

export function dayNumber(date:string):number{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('INVALID_BILLING_DATE');
 const timestamp=Date.parse(date+'T00:00:00Z');
 if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==date)throw new Error('INVALID_BILLING_DATE');
 return timestamp/86400000;
}

export function calculateBilling(input:BillingInput):BillingCalculation{
 if(!['fixed_monthly','fixed_annual','active_student'].includes(input.planType))throw new Error('INVALID_BILLING_PLAN');
 if(!/^(0|[1-9][0-9]{0,29})$/.test(input.amountMinor))throw new Error('INVALID_BILLING_AMOUNT');
 const first=dayNumber(input.periodStart),last=dayNumber(input.periodEnd),denominator=last-first;
 if(denominator<1||denominator>366)throw new Error('INVALID_BILLING_PERIOD');
 const from=Math.max(first,dayNumber(input.contractFrom)),to=Math.min(last,input.contractTo?dayNumber(input.contractTo):last);
 if(input.planType==='fixed_monthly'||input.planType==='fixed_annual'){
  const days=Math.max(0,to-from),divisor=BigInt(denominator),numerator=BigInt(input.amountMinor)*BigInt(days);
  const amountMinor=((numerator*2n+divisor)/(divisor*2n)).toString();
  return {totalMinor:amountMinor,lines:[{days,amountMinor,basis:input.planType==='fixed_monthly'?'fixedMonthlyCalendarDays':'fixedAnnualCalendarDays'}]};
 }
 const eligible=new Map<string,Map<number,string>>();
 for(const interval of input.intervals){
  if(interval.status!=='active'||interval.deleted||interval.demo)continue;
  const intervalFrom=dayNumber(interval.from),intervalTo=dayNumber(interval.to);
  if(!interval.subjectId||!interval.branchId||intervalTo<intervalFrom)throw new Error('BILLING_BASIS_CONFLICT');
  const begin=Math.max(from,intervalFrom),end=Math.min(to,intervalTo);
  const days=eligible.get(interval.subjectId)??new Map<number,string>();
  eligible.set(interval.subjectId,days);
  for(let day=begin;day<end;day++){
   const existing=days.get(day);
   if(existing!==undefined&&existing!==interval.branchId)throw new Error('BILLING_BASIS_CONFLICT');
   days.set(day,interval.branchId);
  }
 }
 const quantities=new Map<string,{subjectId:string;branchId:string;days:number}>();
 for(const [subjectId,days] of eligible)for(const branchId of days.values()){
  const key=JSON.stringify([subjectId,branchId]),line=quantities.get(key)??{subjectId,branchId,days:0};
  line.days++;quantities.set(key,line);
 }
 const rate=BigInt(input.amountMinor),divisor=BigInt(denominator);
 const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
 const rows=[...quantities.values()].sort((a,b)=>compare(a.subjectId,b.subjectId)||compare(a.branchId,b.branchId)).map(line=>({...line,numerator:rate*BigInt(line.days)}));
 const numerator=rows.reduce((sum,line)=>sum+line.numerator,0n),total=(numerator*2n+divisor)/(divisor*2n);
 const amounts=rows.map(line=>line.numerator/divisor),remainder=total-amounts.reduce((sum,amount)=>sum+amount,0n);
 const ranks=rows.map((line,index)=>({index,remainder:line.numerator%divisor})).sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
 for(let index=0;BigInt(index)<remainder;index++)amounts[ranks[index]!.index]++;
 return {totalMinor:total.toString(),lines:rows.map((line,index)=>({subjectId:line.subjectId,branchId:line.branchId,days:line.days,amountMinor:amounts[index]!.toString(),basis:'activeCalendarDays'}))};
}
