import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const css=readFileSync('src/app/globals.css','utf8');
const blocks=[...css.matchAll(/(?:^|\n)(?::root[^{}]*|\.dark[^{}]*)\{([^}]+)\}/g)].map(m=>Object.fromEntries([...m[1].matchAll(/--ds-([\w-]+):\s*(\d+) (\d+) (\d+);/g)].map(v=>[v[1],v.slice(2).map(Number)]))).filter(t=>t.canvas);
function lum(c){return c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function ratio(a,b){const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
assert.equal(blocks.length,2);
for(const [i,raw] of blocks.entries()){
 const t={...blocks[0],...raw};
 for(const bg of ['canvas','surface','card'])for(const fg of ['ink','muted','accent','success','warning','danger','info'])assert.ok(ratio(t[fg],t[bg])>=4.5,`${i}:${fg}/${bg} ${ratio(t[fg],t[bg])}`);
 assert.ok(ratio(t['on-brand'],t.brand)>=4.5,`${i}:button text`);
 assert.ok(ratio(t['border-strong'],t.card)>=3,`${i}:control boundary`);
}
console.log('Both theme text pairs meet 4.5:1; control boundaries meet 3:1.');
