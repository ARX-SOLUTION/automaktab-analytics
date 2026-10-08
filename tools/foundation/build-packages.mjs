import {cpSync,existsSync,mkdirSync,symlinkSync} from 'node:fs';
if(process.argv.includes('--tracker')){mkdirSync('apps/web/dist/tracker',{recursive:true});cpSync('packages/tracker/dist/index.js','apps/web/dist/tracker/v1.js');process.exit(0);}
cpSync('build/apps/api/src','apps/api/dist',{recursive:true});
cpSync('build/packages/contracts/src','packages/contracts/dist',{recursive:true});
cpSync('build/apps/worker/src','apps/worker/dist',{recursive:true});
cpSync('build/packages/tracker/src','packages/tracker/dist',{recursive:true});
// Compiled operational tools import the API build tree and need its workspace contract dependency.
if(!existsSync('build/apps/api/node_modules'))symlinkSync('../../../apps/api/node_modules','build/apps/api/node_modules','dir');
