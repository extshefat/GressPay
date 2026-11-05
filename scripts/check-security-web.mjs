// Run against a production build started on :3100 with GRESSPAY_PHP_URL=http://127.0.0.1:3101
// and TRUSTED_PROXY_HOPS=1. The in-memory upstream is a test fixture, never shipped as app logic.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
const base = process.env.SECURITY_WEB_BASE || 'http://127.0.0.1:3100';
const upstream = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(req.headers));
});
await new Promise((resolve, reject) => { upstream.once('error', reject); upstream.listen(3101, '127.0.0.1', resolve); });
const jsonPost = body => fetch(base + '/api/auth/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
try {
  for (const body of [null, [], {token:'a.b.c'}, {token:'x'.repeat(5000)}]) {
    assert.equal((await jsonPost(body)).status,400);
  }
  assert.equal((await jsonPost({token:'x'.repeat(9000)})).status,413);
  const huge = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(' '.repeat(9000))); controller.close(); } });
  assert.equal((await fetch(base+'/api/auth/session',{method:'POST',body:huge,duplex:'half'})).status,413);
  const encode = object => Buffer.from(JSON.stringify(object)).toString('base64url');
  const token = `${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:'test-only',exp:Math.floor(Date.now()/1000)+600})}.${'a'.repeat(43)}`;
  const accepted = await jsonPost({token,rememberMe:true});
  assert.equal(accepted.status,200);
  const cookie = accepted.headers.get('set-cookie');
  assert.match(cookie,/HttpOnly/i); assert.match(cookie,/SameSite=lax/i); assert.match(cookie,/Secure/i);
  const wrongAlgorithm = `${encode({alg:'none',typ:'JWT'})}.${encode({sub:'x',exp:Math.floor(Date.now()/1000)+600})}.${'a'.repeat(43)}`;
  assert.equal((await jsonPost({token:wrongAlgorithm})).status,400);
  const page=await fetch(base+'/checkout-preview');
  assert.equal(page.status,200); assert.equal(page.headers.get('x-content-type-options'),'nosniff');
  assert.match(page.headers.get('strict-transport-security'),/max-age=31536000/);
  const html=await page.text();
  const theme=html.match(/<script>([\s\S]*?gresspay_theme[\s\S]*?)<\/script>/)?.[1];
  assert.ok(theme,'Theme bootstrap is present');
  assert.ok(page.headers.get('content-security-policy-report-only').includes(`'sha256-${createHash('sha256').update(theme).digest('base64')}'`),'CSP hash matches rendered theme bytes');
  const proxy=await fetch(base+'/api/v1/security-probe',{headers:{
    'x-forwarded-for':'1.1.1.1, 8.8.8.8','x-real-ip':'9.9.9.9','cf-connecting-ip':'9.9.9.9',forwarded:'for=9.9.9.9','x-gresspay-client-ip':'9.9.9.9',
  }});
  assert.equal(proxy.status,200);
  const headers=await proxy.json();
  assert.equal(headers['x-gresspay-client-ip'],'8.8.8.8');
  for (const name of ['x-forwarded-for','x-real-ip','cf-connecting-ip','forwarded']) assert.equal(headers[name],undefined,`${name} must be stripped`);
  console.log('PASS session shape/body limits, secure cookie attributes, rendered CSP hash, and proxy header sanitization');
} finally { await new Promise(resolve=>upstream.close(resolve)); }
