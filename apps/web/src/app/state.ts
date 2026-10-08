export interface Filters {from:string;to:string;timezone:string;companyId:string;branchId:string;surface:string;environment:string;}
export const routes=['overview','schools','traffic','acquisition','usage','learning','funnels','journeys','live','contracts','invoices','payments','reminders','diagnostics','audit'] as const;
export type Route=typeof routes[number];
export function filtersForRoute(filters:Filters,route:Route):Filters{return ['contracts','invoices','payments','reminders'].includes(route)?{...filters,branchId:'',surface:''}:filters;}
const datePattern=/^\d{4}-\d{2}-\d{2}$/;
export function currentPeriod(now=new Date()):{from:string;to:string}{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit'}).formatToParts(now);
 const year=Number(parts.find(part=>part.type==='year')?.value);const month=Number(parts.find(part=>part.type==='month')?.value);
 const from=`${year}-${String(month).padStart(2,'0')}-01`;const next=new Date(Date.UTC(year,month,1));return {from,to:next.toISOString().slice(0,10)};
}
export function tashkentDateTime(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const part=(type:string)=>parts.find(item=>item.type===type)?.value??'';return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function filtersFromUrl(search:string):Filters{
 const query=new URLSearchParams(search);const period=currentPeriod();
 const safeId=(key:string)=>{const value=query.get(key)??'';return /^[a-zA-Z0-9_-]{1,120}$/.test(value)?value:'';};
 let timezone=query.get('timezone')??'Asia/Tashkent';try{new Intl.DateTimeFormat('uz',{timeZone:timezone});}catch{timezone='Asia/Tashkent';}
 const surface=query.get('surface')??'';
 return {from:datePattern.test(query.get('from')??'')?query.get('from')!:period.from,to:datePattern.test(query.get('to')??'')?query.get('to')!:period.to,timezone,companyId:safeId('companyId'),branchId:safeId('companyId')?safeId('branchId'):'',surface:['marketing','tenant','learning','practice'].includes(surface)?surface:'',environment:['synthetic','production'].includes(query.get('environment')??'')?query.get('environment')!:'synthetic'};
}
export function changeFilter(filters:Filters,key:keyof Filters,value:string):Filters{return {...filters,[key]:value,...(key==='companyId'?{branchId:''}:{})};}
export function filterSearch(filters:Filters):string{const query=new URLSearchParams();for(const [key,value]of Object.entries(filters))if(value)query.set(key,value);return query.toString();}
export function routeFromPath(path:string):{route:Route;id?:string}{const [,name,rawId]=path.split('/');let id:string|undefined;try{id=rawId?decodeURIComponent(rawId):undefined;}catch{id=undefined;}return {route:routes.includes(name as Route)?name as Route:'overview',id};}
export function moneyText(value:string|null|undefined,currency='UZS'):string{
 if(value===null||value===undefined||!/^-?\d+$/.test(value))return 'Ma’lumot yo‘q';
 const number=new Intl.NumberFormat('uz-UZ').format(BigInt(value));return `${number} ${currency==='UZS'?'so‘m':currency}`;
}
export function numberText(value:string|number|null|undefined):string{if(value===null||value===undefined)return 'Ma’lumot yo‘q';if(typeof value==='number')return Number.isFinite(value)?new Intl.NumberFormat('uz-UZ').format(value):'Ma’lumot yo‘q';if(/^-?\d+$/.test(value))return new Intl.NumberFormat('uz-UZ').format(BigInt(value));return value;}
export function dateText(value:string|null|undefined,timezone='Asia/Tashkent'):string{if(!value)return 'Ma’lumot yo‘q';const date=new Date(value.length===10?`${value}T00:00:00+05:00`:value);if(!Number.isFinite(date.getTime()))return 'Noma’lum sana';return new Intl.DateTimeFormat('uz-UZ',{timeZone:timezone,day:'numeric',month:'short',year:'numeric',...(value.length===10?{}:{hour:'2-digit',minute:'2-digit'})}).format(date);}
export const statusLabels:Record<string,string>={active:'Faol',suspended:'To‘xtatilgan',pending:'Kutilmoqda',completed:'Bitirgan',dropped:'Tark etgan',deleted:'Arxivlangan',fresh:'Yangilangan',stale:'Eskirgan',partial:'Qisman',unknown:'Noma’lum',draft:'Qoralama',closed:'Yopilgan',paid:'To‘langan',overdue:'Muddati o‘tgan',reversed:'Bekor qilingan',acknowledged:'Ko‘rilgan',fixedMonthly:'Qat’iy oylik',fixedAnnual:'Qat’iy yillik',monthlyActiveStudent:'Faol o‘quvchi / oy',fixed_monthly:'Qat’iy oylik',fixed_annual:'Qat’iy yillik',monthly_active_student:'Faol o‘quvchi / oy',active_student:'Faol o‘quvchi / oy',cancelled:'Bekor qilingan'};
