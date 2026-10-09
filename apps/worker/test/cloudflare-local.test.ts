import {spawn,type ChildProcess} from 'node:child_process';
import {afterAll,beforeAll,expect,test} from 'vitest';

const port=18517;
let worker:ChildProcess|undefined;
let output='';

function delay(milliseconds:number){return new Promise(resolve=>setTimeout(resolve,milliseconds));}
async function stopWorker(){
 if(!worker||worker.exitCode!==null)return;
 const exited=new Promise<void>(resolve=>worker?.once('exit',()=>resolve()));
 worker.kill('SIGTERM');
 await Promise.race([exited,delay(3000)]);
 if(worker.exitCode===null)worker.kill('SIGKILL');
}

beforeAll(async()=>{
 worker=spawn('pnpm',['exec','wrangler','dev','--local','--config','apps/worker/wrangler.jsonc','--ip','127.0.0.1','--port',String(port),'--log-level','error'],{stdio:['ignore','pipe','pipe']});
 worker.on('error',error=>{output=(output+String(error)).slice(-3000);});
 worker.stdout?.on('data',chunk=>{output=(output+String(chunk)).slice(-3000);});
 worker.stderr?.on('data',chunk=>{output=(output+String(chunk)).slice(-3000);});
 for(let attempt=0;attempt<80;attempt++){
  if(worker.exitCode!==null)throw new Error(`Wrangler exited before serving requests: ${output}`);
  try{
   const response=await fetch(`http://127.0.0.1:${port}/health/live`,{signal:AbortSignal.timeout(500)});
   if(response.status===200)return;
   if(response.status>=500){const body=await response.text();await stopWorker();throw new Error(`Worker API returned ${response.status}: ${body}\n${output}`);}
  }catch(error){if(error instanceof Error&&error.message.startsWith('Worker API returned'))throw error;/* Wait for Wrangler and workerd startup. */}
  await delay(250);
 }
 await stopWorker();
 throw new Error(`Wrangler did not start within 20 seconds: ${output}`);
},25000);

afterAll(stopWorker);

test('local Workers runtime verifies Hyperdrive readiness and serves the API and Vite single-page application',async()=>{
 const health=await fetch(`http://127.0.0.1:${port}/health/live`,{signal:AbortSignal.timeout(3000)});
 expect(health.status).toBe(200);
 expect(await health.json()).toMatchObject({status:'live',environment:'synthetic',schemaVersion:1});
 const ready=await fetch(`http://127.0.0.1:${port}/health/ready`,{signal:AbortSignal.timeout(10000)});
 expect(ready.status).toBe(200);
 expect(await ready.json()).toMatchObject({status:'ready',environment:'synthetic',schemaVersion:1});
 const page=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(3000)});
 expect(page.status).toBe(200);
 expect(page.headers.get('content-type')).toContain('text/html');
 expect(await page.text()).toContain('<div id="root"></div>');
 const login=await fetch(`http://127.0.0.1:${port}/api/v1/auth/demo-session`,{method:'POST',headers:{Origin:`http://127.0.0.1:${port}`},signal:AbortSignal.timeout(10000)});
 expect(login.status).toBe(200);
 expect(login.headers.get('set-cookie')).toContain('analytics_session=');
 expect((await login.json()).data).toMatchObject({environment:'synthetic'});
 const cookie=login.headers.get('set-cookie')!.split(';')[0]!;
 const stream=(method='GET',path='/api/v1/live/stream')=>{const controller=new AbortController();return {controller,response:fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{Cookie:cookie},signal:controller.signal})};};
 const [first,second,third]=[stream(),stream('GET','/api/v1/live/stream/'),stream('HEAD','/api/v1/live/stream')];
 const [firstStream,secondStream,thirdStream]=await Promise.all([first.response,second.response,third.response]);
 expect([firstStream.status,secondStream.status,thirdStream.status]).toEqual([200,200,429]);
 first.controller.abort();second.controller.abort();
 await Promise.all([firstStream.body?.cancel().catch(()=>undefined),secondStream.body?.cancel().catch(()=>undefined)]);
});
