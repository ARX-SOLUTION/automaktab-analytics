import {readFileSync,readdirSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {parseForESLint} from '@babel/eslint-parser';
export function forbiddenImport(file:string,specifier:string):boolean {
 const normalized=file.replaceAll('\\','/');
 const relativeTarget=specifier.startsWith('.')?relative(process.cwd(),resolve(file,'..',specifier)).replaceAll('\\','/'):'';
 if(normalized.startsWith('apps/web/')||normalized.startsWith('packages/contracts/')||normalized.startsWith('packages/tracker/')){
  if(specifier.includes('drizzle')||specifier==='pg'||specifier.startsWith('@nestjs')||specifier.startsWith('@automaktab/api')||specifier.includes('apps/api')||specifier.includes('apps/worker')||relativeTarget.startsWith('apps/api/')||relativeTarget.startsWith('apps/worker/'))return true;
 }
 if(normalized.startsWith('apps/worker/')&&(relativeTarget.startsWith('apps/api/')||(specifier.startsWith('@automaktab/api')&&specifier!=='@automaktab/api/application')))return true;
 return false;
}
function walk(path:string):string[]{return readdirSync(path,{withFileTypes:true}).flatMap(entry=>{const p=join(path,entry.name);if(['node_modules','dist','build'].includes(entry.name))return [];return entry.isDirectory()?walk(p):/\.tsx?$/.test(p)?[p]:[];});}
function record(value:unknown):Record<string,unknown>|undefined {return typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:undefined;}
export function importsFrom(code:string):Array<string|null>{
 const ast=parseForESLint(code,{filePath:'boundary.tsx',requireConfigFile:false,sourceType:'module',babelOptions:{presets:['@babel/preset-typescript'],plugins:[['@babel/plugin-syntax-decorators',{legacy:true}],'@babel/plugin-syntax-jsx']}}).ast;
 const result:Array<string|null>=[];
 function add(value:unknown){const v=record(value)?.value;result.push(typeof v==='string'?v:null);}
 function visit(value:unknown){if(Array.isArray(value)){for(const item of value)visit(item);return;}const node=record(value);if(!node)return;const type=node.type;if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration'].includes(String(type))&&node.source)add(node.source);if(type==='TSImportType')add(node.argument);if(type==='ImportExpression')add(node.source);if(type==='CallExpression'){const callee=record(node.callee);if(callee?.type==='Import'||callee?.type==='Identifier'&&callee.name==='require')add(Array.isArray(node.arguments)?node.arguments[0]:undefined);}for(const [key,item] of Object.entries(node))if(!['parent','tokens','comments','loc','range'].includes(key))visit(item);}
 visit(ast);return result;
}
export function checkBoundaries(){const violations:string[]=[];for(const file of [...walk('apps'),...walk('packages')])for(const spec of importsFrom(readFileSync(file,'utf8')))if(spec===null||forbiddenImport(file,spec))violations.push(file+': '+(spec??'nonliteral import'));if(violations.length)throw new Error('BOUNDARY_VIOLATION\n'+violations.join('\n'));}
if(process.argv[1]?.endsWith('/check-boundaries.ts')){checkBoundaries();console.log('PASS workspace boundaries');}
