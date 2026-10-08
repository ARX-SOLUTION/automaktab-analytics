import {dayNumber} from './calculate.js';

const format=(year:number,month:number,day:number)=>String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
function anniversary(anchor:string,year:number):string{
 const month=Number(anchor.slice(5,7)),day=Number(anchor.slice(8,10));
 const leap=year%400===0||(year%4===0&&year%100!==0);
 return format(year,month,month===2&&day===29&&!leap?28:day);
}
export function annualPeriod(anchor:string,reference:string):{periodStart:string;periodEnd:string}{
 dayNumber(anchor);dayNumber(reference);if(reference<anchor)throw new Error('INVALID_BILLING_PERIOD');
 let year=Number(reference.slice(0,4));if(reference<anniversary(anchor,year))year--;
 return {periodStart:anniversary(anchor,year),periodEnd:anniversary(anchor,year+1)};
}
export function monthlyPeriod(reference:string):{periodStart:string;periodEnd:string}{
 dayNumber(reference);const year=Number(reference.slice(0,4)),month=Number(reference.slice(5,7));
 return {periodStart:format(year,month,1),periodEnd:format(month===12?year+1:year,month===12?1:month+1,1)};
}
