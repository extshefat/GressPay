/** Local-only browser QA. Requests are fulfilled by isolated fixtures, never by a real merchant API. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const WebSocketClient = globalThis.WebSocket || require('next/dist/compiled/ws');
const base = process.env.CHECKOUT_QA_BASE || 'http://127.0.0.1:3100';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Only run against a local QA server.');
const artifacts = process.env.CHECKOUT_QA_ARTIFACTS || '/tmp/gresspay-checkout-review';
mkdirSync(artifacts, { recursive: true });
const targets = await (await fetch(process.env.CHECKOUT_QA_CDP || 'http://127.0.0.1:9222/json')).json();
const target = targets.find(target => target.type === 'page');
assert.ok(target, 'Start an isolated headless Chrome with --remote-debugging-port=9222.');
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const calls = [];
const browserErrors = [];
const handlingRequests = new Set();
let responseStatus = 'PENDING';
let scenario = 'fresh';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)); }, 20000);
    pending.set(id, message => { clearTimeout(timeout); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
}
async function until(expression, label, maxMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) { if (await evaluate(expression)) return; await pause(125); }
  throw new Error(`Timed out waiting for ${label}`);
}
function fixture() {
  const method = (code, name, crypto = false) => ({ code, name, gatewayId: `qa-${code}`, country: crypto ? 'GLOBAL' : 'BD', category: crypto ? 'crypto' : 'mfs', logo: `/methods/${code}.svg`, currency: crypto ? 'USDT' : 'BDT', feePercentage: 0, fixedFee: 0, minAmount: 1, maxAmount: 100000, isEnabled: true, isAutomated: true, requiresTxidInput: code !== 'binance_pay', payableAmount: crypto ? 1.25 : 150, payableCurrency: crypto ? 'USDT' : 'BDT', depositAddressOrNumber: crypto ? 'EXAMPLE-ADDRESS-DO-NOT-PAY' : '01XXXXXXXXX', accountType: 'personal' });
  const methods = [method('bkash', 'bKash'), method('nagad', 'Nagad'), method('rocket', 'Rocket'), method('upay', 'Upay'), method('cellfin', 'Cellfin'), method('binance_pay', 'Binance Pay', true), method('usdt_trc20', 'USDT TRC-20', true)];
  if (scenario === 'auto') methods[0].requiresTxidInput = false;
  return { sessionId: 'qa-checkout', linkId: 'qa-checkout', merchantName: 'QA merchant · যাচাই', merchantVerified: false, orderTitle: 'Browser QA fixture · do not pay', amount: 150, currency: 'BDT', ledgerMode: 'live', availableMethods: methods, verificationMode: scenario === 'auto' ? 'sms_auto' : 'trx_id', requirePayerMatch: true, paymentStatus: 'PENDING', awaitingEvidence: true, submittedMethod: scenario === 'resume' ? 'bkash' : null, submittedGateway: scenario === 'resume' ? 'qa-bkash' : null, submittedTxid: scenario === 'resume' ? 'EXAMPLE1234' : null, expiresAt: new Date(Date.now() + (scenario === 'deadline' ? -1000 : 600000)).toISOString(), createdAt: new Date().toISOString() };
}
async function handleRequest(event) {
  const { request, requestId } = event;
  const pathname = new URL(request.url).pathname;
  const body = request.postData ? JSON.parse(request.postData) : null;
  calls.push({ pathname, method: request.method, body });
  let response;
  if (pathname.endsWith('/init')) response = fixture();
  else if (pathname.endsWith('/verify')) { await pause(250); response = { sessionId: 'qa-checkout', status: 'PENDING', amount: 150, currency: 'BDT', message: 'QA fixture: waiting for matching server evidence.' }; }
  else if (pathname.endsWith('/status')) response = { sessionId: 'qa-checkout', status: responseStatus, amount: 150, currency: 'BDT' };
  else if (pathname.endsWith('/cancel')) response = { ok: true, message: 'QA checkout cancelled.', redirectUrl: '/checkout-preview' };
  else throw new Error(`Unexpected checkout API call ${pathname}`);
  await command('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(response)).toString('base64') });
}
socket.onmessage = event => {
  const message = JSON.parse(String(event.data));
  if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') browserErrors.push(message.params.entry.text);
  if (message.method === 'Fetch.requestPaused') {
    const handling = handleRequest(message.params).catch(async error => {
      browserErrors.push(error.stack);
      await command('Fetch.failRequest', { requestId: message.params.requestId, errorReason: 'Aborted' }).catch(() => {});
    });
    handlingRequests.add(handling);
    void handling.finally(() => handlingRequests.delete(handling));
  }
};
async function clickText(text) {
  await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.getClientRects().length&&!button.disabled&&button.textContent.trim().includes(${JSON.stringify(text)}));if(!button)throw Error('Missing button: '+${JSON.stringify(text)});button.click();})()`);
}
async function input(selector, value) {
  await evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});if(!input)throw Error('Missing input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(100);
}
async function key(key, code = key, modifiers = 0) {
  const windowsVirtualKeyCode = ({ Enter: 13, Escape: 27, Tab: 9, ArrowRight: 39, ArrowLeft: 37 })[key];
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode, text: key === 'Enter' ? '\r' : undefined });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode });
  await pause(100);
}
async function navigate(path) {
  await command('Page.navigate', { url: base + path });
  await until('!!document.querySelector("[data-checkout-phase]")', 'checkout content');
  await evaluate('document.fonts.ready');
}
async function mobilePayment() {
  await until('!!document.querySelector("button[data-rail=bkash]")', 'mobile rails');
  await evaluate('document.querySelector("button[data-rail=bkash]").click()');
  await until('!!document.querySelector("[data-checkout-step=payer]")', 'payer entry');
  assert.equal(await evaluate('!!document.querySelector("[data-checkout-step=verify]")'), false);
  await input('input[type=tel]', '01712345678');
  await clickText('Continue to payment details');
  await until('!!document.querySelector("[data-checkout-step=payment]")', 'receiving details');
  assert.equal(await evaluate('document.body.innerText.includes("01XXXXXXXXX")'), true, 'receiving account visible before waiting');
}
function verifyCalls() { return calls.filter(call => call.pathname.endsWith('/verify')); }
async function snapshot(name) {
  await pause(100);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `horizontal overflow: ${name}`);
  const { cssContentSize } = await command('Page.getLayoutMetrics');
  const { data } = await command('Page.captureScreenshot', { captureBeyondViewport: true, clip: { x: 0, y: 0, width: Math.ceil(cssContentSize.width), height: Math.min(3500, Math.ceil(cssContentSize.height)), scale: 1 } });
  writeFileSync(join(artifacts, `${name}.png`), Buffer.from(data, 'base64'));
}
try {
  await command('Page.enable'); await command('Runtime.enable'); await command('Log.enable');
  await command('Page.bringToFront');
  await command('Browser.grantPermissions', { origin: base, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await command('Fetch.enable', { patterns: [{ urlPattern: `${base}/api/v1/checkout/*`, requestStage: 'Request' }] });
  await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/pay/qa-checkout');
  assert.equal(await evaluate('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase'), 'choosing');
  assert.equal(calls.length, 1, 'creation alone must not start verification requests');
  assert.equal(await evaluate('[...document.querySelectorAll("[role=tab]")].filter(tab=>tab.disabled).length'), 2, 'unconfigured India/bank categories cannot collect payments');
  await evaluate('document.querySelector("[role=tab][aria-selected=true]").focus()');
  await key('ArrowRight');
  assert.equal(await evaluate('document.activeElement.textContent.includes("Crypto")'), true);
  await key('ArrowLeft');
  await mobilePayment();
  assert.equal(verifyCalls().length, 0, 'payer entry and receiving details do not submit a payment');
  await evaluate('[...document.querySelectorAll("button")].find(button=>button.getAttribute("aria-label")?.startsWith("Copy merchant")).focus()');
  await key('Enter');
  await until('document.body.innerText.includes("Copied")', 'visible copy acknowledgement');
  assert.equal(await evaluate('navigator.clipboard.readText()'), '01XXXXXXXXX');
  const initialClock = await evaluate('document.querySelector("[role=timer]").textContent');
  await pause(1100);
  assert.notEqual(await evaluate('document.querySelector("[role=timer]").textContent'), initialClock, 'server deadline countdown advances');
  assert.equal(await evaluate('!!document.querySelector("[data-checkout-step=verify]")'), false, 'TrxID appears only after paying');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await until('document.body.innerText.includes("You are offline")', 'offline feedback');
  assert.equal(await evaluate('document.body.innerText.includes("01XXXXXXXXX")'), true);
  await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await until('!document.body.innerText.includes("You are offline")', 'online recovery');
  await clickText('I have paid');
  await until('!!document.querySelector("[data-checkout-step=verify]")', 'verification step');
  await input('input[autocomplete=off]', 'EXAMPLE1234');
  await evaluate('(()=>{const form=document.querySelector("form[data-checkout-step=verify]");form.requestSubmit();form.requestSubmit()})()');
  await until('!!document.querySelector("section[aria-label^=Server]")', 'server evidence progress');
  assert.equal(verifyCalls().length, 1, 'double submit is suppressed');
  assert.deepEqual(verifyCalls()[0].body, { trx_id: 'EXAMPLE1234', method: 'bkash', gatewayId: 'qa-bkash', sender_number: '01712345678' });
  assert.equal(await evaluate('document.body.innerText.includes("01XXXXXXXXX")'), true, 'receiving details remain visible during verification');
  assert.notEqual(await evaluate('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase'), 'success', 'client action never confirms an unpaid checkout');
  responseStatus = 'COMPLETED'; await clickText('Check status again');
  await until('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase === "success"', 'server-confirmed receipt');
  console.log('PASS creation → category → payer → receiving details/timer → reference → server evidence; offline recovery; exact request; no double submit');

  scenario = 'resume'; responseStatus = 'PENDING';
  await navigate('/pay/qa-checkout?case=resume');
  await until('!!document.querySelector("section[aria-label^=Server]")', 'resumed submission');
  assert.equal(await evaluate('document.body.innerText.includes("01XXXXXXXXX") && document.body.innerText.includes("EXAMPLE1234")'), true, 'resume retains destination and submitted reference');
  console.log('PASS resumed pending payment retains usable receiving details');

  scenario = 'auto';
  await navigate('/pay/qa-checkout?case=auto');
  await mobilePayment();
  const beforeAuto = verifyCalls().length;
  await clickText('I have paid');
  await until('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase === "waiting_sms"', 'SMS auto evidence wait');
  assert.equal(verifyCalls().length, beforeAuto + 1);
  assert.equal(verifyCalls().at(-1).body.trx_id, '');
  assert.equal(verifyCalls().at(-1).body.sender_number, '01712345678');
  assert.equal(await evaluate('document.body.innerText.includes("01XXXXXXXXX")'), true);
  console.log('PASS SMS-auto sends payer context only after I have paid and retains destination');

  scenario = 'fresh';
  await navigate('/pay/qa-checkout?case=crypto');
  await evaluate('[...document.querySelectorAll("[role=tab]")].find(tab=>tab.textContent.includes("Crypto")).click()');
  await evaluate('document.querySelector("button[data-rail=usdt_trc20]").click()');
  await until('!!document.querySelector("[data-checkout-step=payment]")', 'crypto receiving details');
  await clickText('I have paid');
  const beforeCrypto = verifyCalls().length;
  await input('input[autocomplete=off]', 'bad-hash'); await clickText('Verify payment');
  await until('document.body.innerText.includes("64 hexadecimal")', 'inline transaction hash validation');
  assert.equal(verifyCalls().length, beforeCrypto);
  await input('input[autocomplete=off]', 'a'.repeat(64)); await clickText('Verify payment');
  await until('!!document.querySelector("section[aria-label^=Server]")', 'crypto evidence wait');
  assert.equal(verifyCalls().at(-1).body.method, 'usdt_trc20');
  console.log('PASS crypto uses address instructions and validates a hash before making a request');

  scenario = 'deadline'; responseStatus = 'PENDING';
  await navigate('/pay/qa-checkout?case=deadline');
  await until('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase === "confirming_expiry"', 'authoritative deadline check');
  await pause(300);
  assert.notEqual(await evaluate('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase'), 'success');
  responseStatus = 'EXPIRED';
  await clickText('Retry status check');
  await until('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase === "expired"', 'server-confirmed expiry');
  console.log('PASS timer alone cannot confirm or expire a live payment; server response controls final state');
  scenario = 'fresh'; responseStatus = 'PENDING';
  await navigate('/pay/qa-checkout?case=cancel');
  await evaluate('(()=>{const button=document.querySelector("button[aria-label^=Cancel]");button.focus();button.click()})()');
  await until('!!document.querySelector("dialog[open]")', 'cancel dialog');
  for (let i = 0; i < 6; i++) await key('Tab');
  assert.equal(await evaluate('!!document.activeElement.closest("dialog[open]")'), true);
  await key('Escape');
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Cancel checkout');
  await evaluate('(()=>{const button=document.querySelector("button[aria-label^=Cancel]");button.focus();button.click()})()');
  await evaluate('[...document.querySelectorAll("dialog[open] button")].find(button=>button.textContent.trim()==="Cancel checkout").click()');
  await until('document.querySelector("[data-checkout-phase]").dataset.checkoutPhase === "cancelled"', 'server-approved cancellation');
  console.log('PASS cancel focus trap / Escape / focus restoration and cancelled state');

  const beforePreview = calls.length;
  await navigate('/checkout-preview');
  const states = ['choose', 'payer', 'payment', 'verify', 'submitted', 'waiting_sms', 'success', 'expired', 'confirming', 'cancelled', 'failed', 'refunded', 'empty'];
  for (const theme of ['light', 'dark']) {
    await command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.documentElement.classList.toggle('dark',${theme === 'dark'});document.documentElement.style.colorScheme=${JSON.stringify(theme)}`);
    for (const view of states) {
      await evaluate(`(()=>{const select=document.querySelector('select');select.value=${JSON.stringify(view)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await pause(125);
      await snapshot(`${theme}-${view}-1280`);
    }
    for (const width of [320, 360, 390, 768, 1024, 1280, 1536, 1920]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await evaluate("(()=>{const select=document.querySelector('select');select.value='choose';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await snapshot(`${theme}-choose-${width}`);
      await evaluate("(()=>{const select=document.querySelector('select');select.value='payment';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
      await snapshot(`${theme}-payment-${width}`);
    }
  }
  assert.equal(calls.length, beforePreview, 'all preview states are isolated from payment APIs');
  assert.deepEqual(browserErrors, [], 'no browser errors');
  writeFileSync(join(artifacts, 'results.json'), JSON.stringify({ passed: true, widths: [320,360,390,768,1024,1280,1536,1920], themes: ['light','dark'], previewStates: states, requests: calls, browserErrors }, null, 2));
  console.log('PASS all preview states, 8 widths × 2 themes, no horizontal overflow, no preview API calls, no browser errors');
  console.log(`Review artifacts: ${artifacts}`);
} finally {
  await Promise.allSettled([...handlingRequests]);
  await command('Page.navigate', { url: 'about:blank' }).catch(() => {});
  await command('Fetch.disable').catch(() => {});
  socket.close();
}
