import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const load = async path => import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'));
const f=await load('src/lib/formatters.ts');
assert.equal(f.formatCurrency(1234.5,'BDT'),'৳1,234.50');
assert.equal(f.formatCurrency(1234.5,'BDT',{bengaliDigits:true}),'৳১,২৩৪.৫০');
assert.equal(f.formatNumber('bad'),'—');
assert.equal(f.formatDate('bad'),'—');
assert.match(f.formatDate('2026-01-01T00:00:00Z'),/06:00/);
const {THEME_SCRIPT}=await load('src/lib/theme-script.ts');
for(const [stored,system,expected] of [[null,true,true],[null,false,false],['light',true,false],['dark',false,true]]) {
 let actual;
 const context={localStorage:{getItem:()=>stored},matchMedia:()=>({matches:system}),document:{documentElement:{classList:{toggle:(_,value)=>actual=value},style:{}}}};
 vm.runInNewContext(THEME_SCRIPT,context);
 assert.equal(actual,expected);
}
console.log('Currency, Bengali digits, Dhaka time, invalid values and pre-paint theme contracts passed.');
