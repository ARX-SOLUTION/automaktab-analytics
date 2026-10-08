import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
const eslint=new ESLint();
const [result]=await eslint.lintText('debugger;\n',{filePath:'intentional-lint-failure.ts'});
assert(result.messages.some(message=>message.ruleId==='no-debugger' && message.severity===2));
console.log('PASS syntax lint rejects debugger');
