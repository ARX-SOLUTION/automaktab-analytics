import assert from 'node:assert/strict';
import {spawn,type ChildProcess} from 'node:child_process';
import {setTimeout as pause} from 'node:timers/promises';
async function waitStatus(port:number,status:number){const deadline=Date.now()+20000;while(Date.now()<deadline){try{const res=await fetch(`http://127.0.0.1:${port}/health/ready`,{signal:AbortSignal.timeout(2000)});if(res.status===status)return;}catch{/* bounded startup retry */}await pause(200);}throw new Error('EXPECTED_HEALTH_STATUS_NOT_OBSERVED');}
function run(path:string,port:number,databaseUrl:string){return spawn(process.execPath,[path],{env:{PATH:process.env.PATH,APP_ENV:'synthetic',PORT:String(port),DATABASE_URL:databaseUrl},stdio:['ignore','pipe','pipe']});}
async function stop(child:ChildProcess){if(child.exitCode!==null){assert.equal(child.exitCode,0);return;}child.kill('SIGTERM');await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('SHUTDOWN_TIMEOUT'));},10000);child.once('exit',code=>{clearTimeout(timer);try{assert.equal(code,0);resolve();}catch(error){reject(error);}});});}
const databaseUrl=process.env.DATABASE_URL;if(!databaseUrl)throw new Error('CONFIG_INVALID');
for(const path of ['apps/api/dist/main.js','apps/worker/dist/main.js']){
 const bad=spawn(process.execPath,[path],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});let output='';bad.stderr?.on('data',data=>{output+=String(data);});const code=await new Promise<number|null>((resolve,reject)=>{const timer=setTimeout(()=>{bad.kill('SIGKILL');reject(new Error('STARTUP_TIMEOUT'));},10000);bad.once('exit',code=>{clearTimeout(timer);resolve(code);});});assert.equal(code,1);assert.match(output,/STARTUP_FAILED/);assert.doesNotMatch(output,/postgres|secret|stack/);
}
const processes:ChildProcess[]=[];
try{
 for(const [path,port] of [['apps/api/dist/main.js',18302],['apps/worker/dist/main.js',18303]] as const){const child=run(path,port,databaseUrl);processes.push(child);await waitStatus(port,200);await stop(child);const restarted=run(path,port,databaseUrl);processes.push(restarted);await waitStatus(port,200);}
 const absent=new URL(databaseUrl);absent.port='59999';const lost=run('apps/worker/dist/main.js',18304,absent.href);processes.push(lost);await waitStatus(18304,503);const live=await fetch('http://127.0.0.1:18304/health/live',{signal:AbortSignal.timeout(2000)});assert.equal(live.status,200);
 console.log('PASS API/worker invalid startup, real process restart and unavailable DB readiness (controlled actual Compose DB stop is separate orchestration)');
}finally{for(const child of processes)await stop(child);}
