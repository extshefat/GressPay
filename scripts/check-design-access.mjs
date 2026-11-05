// Run after a production build, with Next on :3100 and GRESSPAY_PHP_URL=:3101.
// This isolated upstream fixture never participates in application code.
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const base = process.env.SECURITY_WEB_BASE || 'http://127.0.0.1:3100';
assert.equal((await fetch(base+'/design-system')).status,404);
assert.equal((await fetch(base+'/design-system',{headers:{Cookie:'gresspay_session=offline-fixture'}})).status,404);
const upstream=createServer((req,res)=>{
 const mode=req.headers.authorization?.slice(7);
 res.setHeader('Content-Type','application/json');
 res.end(JSON.stringify({user:{emailVerified:mode!=='unverified',role:mode==='member'?'merchant':'admin'}}));
});
await new Promise((resolve,reject)=>{upstream.once('error',reject);upstream.listen(3101,'127.0.0.1',resolve);});
try {
 for(const [mode,expected] of [['member',404],['unverified',404],['admin',200]]) {
  const response=await fetch(base+'/design-system',{headers:{Cookie:`gresspay_session=${mode}`}});
  assert.equal(response.status,expected,mode);
  assert.match(response.headers.get('x-robots-tag'),/noindex/);
  if(expected===200) assert.match(await response.text(),/Dotted Earth centered on Dhaka/);
 }
 console.log('PASS production showcase access, auth outage denial, noindex and server-rendered globe fallback');
} finally {await new Promise(resolve=>upstream.close(resolve));}
