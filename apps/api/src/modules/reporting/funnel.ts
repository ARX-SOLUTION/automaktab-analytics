export interface FunnelDefinition {steps:Array<{event:string;name:string}>;windowDays:number;}
export interface FunnelEvent {identity:string|null;event:string;occurredAt:string;}
export function evaluateFunnel(events:FunnelEvent[],definition:FunnelDefinition){
 const counts=definition.steps.map(()=>0),journeys=new Map<string,{step:number;start:number;last:number}>();let excludedUnidentified=0;
 for(const event of [...events].sort((a,b)=>Date.parse(a.occurredAt)-Date.parse(b.occurredAt))){
  if(!event.identity){excludedUnidentified++;continue;}const time=Date.parse(event.occurredAt);if(!Number.isFinite(time))continue;
  let journey=journeys.get(event.identity);
  if(!journey&&event.event===definition.steps[0]?.event){journey={step:1,start:time,last:time};journeys.set(event.identity,journey);counts[0]++;continue;}
  if(!journey||journey.step>=definition.steps.length||time<=journey.last||time-journey.start>definition.windowDays*86400000)continue;
  if(event.event===definition.steps[journey.step]?.event){counts[journey.step]++;journey.step++;journey.last=time;}
 }
 return {steps:definition.steps.map((step,index)=>({name:step.name,count:counts[index]!,rate:counts[0]?Math.round(counts[index]!/counts[0]!*10000)/100:null})),excludedUnidentified};
}
