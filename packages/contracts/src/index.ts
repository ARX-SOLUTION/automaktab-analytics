export interface HealthStatus {status:'live'|'ready'|'notReady';environment:'synthetic'|'development'|'production';schemaVersion:1;}
export * from './product.js';
export * from './openapi.js';
export function parseHealthStatus(value:unknown):HealthStatus {
  if(typeof value!=='object'||value===null)throw new Error('INVALID_HEALTH_STATUS');
  const record=value as Record<string,unknown>;
  if(Object.keys(record).sort().join(',')!=='environment,schemaVersion,status'||!['synthetic','development','production'].includes(String(record.environment))||record.schemaVersion!==1||typeof record.status!=='string'||!['live','ready','notReady'].includes(record.status))throw new Error('INVALID_HEALTH_STATUS');
  return record as unknown as HealthStatus;
}
