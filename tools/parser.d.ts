declare module '@babel/eslint-parser' {
 export function parseForESLint(code:string,options:Record<string,unknown>):{ast:Record<string,unknown>};
}
