import {expect,test} from 'vitest';
import {forbiddenImport} from '../check-boundaries.js';
import {focusedCommand} from '../test-focused.js';
test('web cannot import ORM or server through alias or relative path',()=>{for(const value of ['drizzle-orm','@automaktab/api/application','../../api/src/main.js'])expect(forbiddenImport('apps/web/src/main.tsx',value)).toBe(true);expect(forbiddenImport('apps/web/src/main.tsx','@automaktab/contracts')).toBe(false);});
test('worker consumes only named application port',()=>{expect(forbiddenImport('apps/worker/src/main.ts','@automaktab/api/application')).toBe(false);expect(forbiddenImport('apps/worker/src/main.ts','@automaktab/api/main')).toBe(true);});
test('focused dispatch rejects traversal unknown and extra args',()=>{for(const args of [['../secret'],['x.test.ts'],['apps/api/test/config.test.ts','--update']])expect(()=>focusedCommand(args)).toThrow('FOCUSED_PATH_REJECTED');expect(focusedCommand(['apps/api/test/config.test.ts'])).toEqual(['vitest','run','--config','vitest.config.ts','apps/api/test/config.test.ts']);});
import {importsFrom} from '../check-boundaries.js';
test('AST guard detects import types, dynamic imports and nonliteral require',()=>{expect(importsFrom("type X=import('drizzle-orm').SQL; import('pg'); require(variable);")).toEqual(['drizzle-orm','pg',null]);expect(forbiddenImport('apps/worker/src/main.ts','../../api/src/main.js')).toBe(true);});
