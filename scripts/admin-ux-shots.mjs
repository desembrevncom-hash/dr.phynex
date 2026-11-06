// Review-only: logs in to a LOCAL Admin (disposable test database, seeded by scripts/seed-admin-demo.ts)
// with headless Chrome over the DevTools protocol and saves PNG screenshots.
//   node scripts/admin-ux-shots.mjs <port> <prefix> [role]
// Refuses anything but http://localhost:<port>.
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [port, prefix, role = 'editor'] = process.argv.slice(2)
if (!/^\d{4}$/.test(port ?? '') || !prefix) throw new Error('usage: admin-ux-shots.mjs <port> <prefix> [role]')
const origin = `http://localhost:${port}`
// Random one-shot fixture written by scripts/seed-admin-demo.ts to the OS temp folder (never in the repo).
const fixture = JSON.parse(readFileSync(join(tmpdir(), 'drphynex-admin-ux-fixture.json'), 'utf8'))
const accounts = Object.fromEntries(Object.entries(fixture).map(([r, a]) => [r, [a.email, a.password]]))
const out = new URL('../docs/admin-ux-review/images/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(out, { recursive: true })
const dbg = 9400 + Number(port) % 100
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${dbg}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ux-shots-'))}`,
  '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let list
for (let i = 0; i < 40 && !list; i++) {
  try { list = await (await fetch(`http://127.0.0.1:${dbg}/json`)).json() } catch { await sleep(250) }
}
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); pending.delete(d.id) }
const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
const js = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
const view = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })
const go = async (path) => { await send('Page.navigate', { url: origin + path }); await sleep(3500) }
const shot = async (name, full = true) => {
  const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full })
  writeFileSync(join(out, `${prefix}-${name}.png`), Buffer.from(result.data, 'base64'))
  console.log('saved', `${prefix}-${name}.png`)
}
const click = (text) => js(`(()=>{const e=[...document.querySelectorAll('button,a')].find(x=>x.textContent.includes(${JSON.stringify(text)}));e?.click();return !!e})()`)

await send('Page.enable')
await view(1440, 900)
await go('/admin/login')
const [email, password] = accounts[role]
await js(`(async()=>{const set=(el,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};set(document.querySelector('input[type=email]'),${JSON.stringify(email)});set(document.querySelector('input[type=password]'),${JSON.stringify(password)});document.querySelector('button[type=submit]').click()})()`)
await sleep(4000)
await go('/admin')
await shot(`${role}-dashboard`)
for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
  await view(w, h)
  await go('/admin/globals/home-page?locale=vi')
  await click('Banner trang chủ')
  await sleep(1200)
  await shot(`${role}-banner-${w}`)
  if (w === 1440) console.log(role, 'approval button:', await js(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Duyệt cấu hình cho'));return b?JSON.stringify({disabled:b.disabled,hint:document.getElementById('dx-approval-hint')?.textContent,sharedSectionInputsReadOnly:[...document.querySelectorAll('#field-banners__forma__ctaTarget input, #field-banners__forma__theme input')].length}):'no button'})()`))
}
ws.close()
chrome.kill()
