import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
export function previewTarget(env:NodeJS.ProcessEnv):string|undefined {
 const target=env.SYNTHETIC_API_URL;if(!target)return undefined;
 if(env.APP_ENV!=='synthetic'||!['http://api:3000','http://127.0.0.1:18306'].includes(target))throw new Error('SYNTHETIC_PROXY_CONFIG_INVALID');return target;
}
const target=previewTarget(process.env);
export default defineConfig({root:'apps/web',plugins:[react()],preview:{allowedHosts:['web'],proxy:target?{'^/(health/(live|ready)|api/v1|collect/v1)':{target,proxyTimeout:65000,timeout:65000}}:undefined},build:{outDir:'dist',emptyOutDir:true}});
