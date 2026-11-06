// Review-only UI acceptance against a LOCAL Admin (disposable test DB seeded by scripts/seed-admin-demo.ts).
//   node scripts/admin-ux-accept.mjs <port>
// 1) real keyboard input (Tab / Enter / Space) through the accordion, locale switch, save and approve;
// 2) two independent browser sessions (A views, B saves, A approves -> refused in Vietnamese).
// Prints PASS/FAIL lines and saves screenshots to docs/admin-ux-review/images/accept-*.png.
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = process.argv[2]
if (!/^\d{4}$/.test(port ?? '')) throw new Error('usage: admin-ux-accept.mjs <port>')
const origin = `http://localhost:${port}`
const fixture = JSON.parse(readFileSync(join(tmpdir(), 'drphynex-admin-ux-fixture.json'), 'utf8'))
const out = new URL('../docs/admin-ux-review/images/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name, detail) }

async function browser(debugPort) {
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ux-acc-'))}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' })
  let list
  for (let i = 0; i < 40 && !list; i++) { try { list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json() } catch { await sleep(250) } }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (m) => { const d = JSON.parse(m.data); pending.get(d.id)?.(d); pending.delete(d.id) }
  const send = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })) })
  const js = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
  const b = {
    send, js,
    go: async (path) => { await send('Page.navigate', { url: origin + path }); await sleep(3800) },
    shot: async (name) => {
      const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      writeFileSync(join(out, `accept-${name}.png`), Buffer.from(result.data, 'base64'))
    },
    key: async (key, code, vk, text) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, text })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
      await sleep(350)
    },
    tab: (shift = false) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 })
      .then(() => send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })).then(() => sleep(250)),
    enter: () => b.key('Enter', 'Enter', 13, '\r'),
    space: () => b.key(' ', 'Space', 32, ' '),
    focus: async (selectorJs) => { await send('Page.bringToFront'); return js(`(()=>{const e=${selectorJs};if(!e)return null;e.focus();return document.activeElement===e})()`) },
    active: () => js(`(()=>{const a=document.activeElement;return a?(a.tagName+':'+(a.getAttribute('aria-label')||a.textContent||a.id||'').trim().slice(0,40)):'none'})()`),
    close: () => { ws.close(); chrome.kill() },
  }
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  return b
}
async function login(b, role) {
  const { email, password } = fixture[role]
  await b.go('/admin/login')
  await b.js(`(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};set(document.querySelector('input[type=email]'),${JSON.stringify(email)});set(document.querySelector('input[type=password]'),${JSON.stringify(password)});document.querySelector('button[type=submit]').click()})()`)
  await sleep(4000)
}
const bannerTab = async (b) => {
  for (let i = 0; i < 30; i++) {
    const done = await b.js(`(()=>{const t=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Banner trang chủ');t?.click();return !!document.querySelector('#field-banners__brand__title')||(!!t&&false)})()`)
    if (done) return true
    await sleep(500)
  }
  return false
}
const approveButton = `[...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Duyệt cấu hình cho'))`
// Toggle button of banner slot N: the slot header is the collapsible whose label (SlotLabel) names it.
const slotToggle = (n) => `[...document.querySelectorAll('.collapsible')].find(c=>c.querySelector('.dx-slot')?.textContent.includes('Banner ${n}'))?.querySelector('button.collapsible__toggle')`
const slotCollapsed = (n) => `(()=>{const t=${slotToggle(n)};return t?.closest('.collapsible')?.classList.contains('collapsible--collapsed')})()`

// ---------- 1. keyboard ----------
const A = await browser(9611)
await login(A, 'editor')
await A.go('/admin/globals/home-page?locale=vi')
check('keyboard: tab "Banner trang chủ" focusable', await A.focus(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Banner trang chủ')`))
await A.enter()
check('keyboard: Enter opens the banner tab', await A.js(`!!document.querySelector('#field-banners__brand__title')`))
check('keyboard: slot 2 toggle has a distinct accessible name', (await A.js(`${slotToggle(2)}.getAttribute('aria-label')`)).includes('Banner 2'), await A.js(`${slotToggle(2)}.getAttribute('aria-label')`))
check('keyboard: slot 2 header focusable', await A.focus(slotToggle(2)))
const before = await A.js(slotCollapsed(2))
await A.space()
await sleep(700)
const afterSpace = await A.js(slotCollapsed(2))
check('keyboard: Space expands accordion slot 2', before === true && afterSpace === false, `collapsed before=${before} after=${afterSpace}`)
await A.shot('slot2-open')
await A.focus(slotToggle(3))
await A.enter()
await sleep(700)
check('keyboard: Enter expands slot 3', (await A.js(slotCollapsed(3))) === false)
await A.enter()
await sleep(700)
check('keyboard: Enter collapses slot 3 again', (await A.js(slotCollapsed(3))) === true)
await A.tab()
console.log('  focus after Tab from slot 3 header:', await A.active())
await A.tab(true)
check('keyboard: Shift+Tab returns to the slot 3 toggle', await A.js(`document.activeElement===${slotToggle(3)}`), await A.active())

// locale switch with the keyboard
check('keyboard: locale selector focusable', await A.focus(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Ngôn ngữ'))`))
await A.enter()
await sleep(500)
console.log('  locale menu items:', await A.js(`JSON.stringify([...document.querySelectorAll('[class*=localizer] button,[class*=localizer] a,[class*=popup] button,[class*=popup] a')].map(x=>x.tagName+':'+x.textContent.trim()).slice(0,8))`))
const picked = await A.focus(`[...document.querySelectorAll('button,a')].find(x=>x.textContent.trim().startsWith('English'))`)
await A.enter()
await sleep(3500)
check('keyboard: locale switched to English with Enter', picked && (await A.js('location.search')).includes('locale=en'), await A.js('location.search'))
await A.go('/admin/globals/home-page?locale=vi')
await bannerTab(A)

// type, save with the keyboard, approve with the keyboard
const stamp = ' k' + Date.now().toString().slice(-5)
await A.focus(`document.querySelector('#field-banners__brand__title')`)
await A.send('Input.insertText', { text: stamp })
await sleep(400)
check('keyboard: approve locked while the form has unsaved text', await A.js(`${approveButton}.disabled`))
check('keyboard: save button focusable', await A.focus(`document.querySelector('#action-save-draft')||[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lưu bản nháp')`))
await A.enter()
await sleep(4000)
const approveState = await A.js(`JSON.stringify({d:${approveButton}.disabled,h:document.getElementById('dx-approval-hint').textContent})`)
check('keyboard: after saving with Enter the approve button is enabled again', JSON.parse(approveState).d === false, approveState)
check('keyboard: approve button focusable', await A.focus(approveButton))
await A.space()
await sleep(4000)
const msg = await A.js(`document.querySelector('.dx-approval__message').textContent`)
check('keyboard: Space approves for tiếng Việt', msg.includes('Đã duyệt cấu hình cho tiếng Việt'), msg)
await A.shot('keyboard-approved')

// ---------- 1b. locale switching while a refresh is in flight ----------
const switchLocale = async (b, name) => {
  await b.focus(`[...document.querySelectorAll('button')].find(x=>x.textContent.includes('Ngôn ngữ'))`)
  await b.enter()
  await sleep(400)
  await b.focus(`[...document.querySelectorAll('button,a')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(name)}))`)
  await b.enter()
}
const panelView = (b) => b.js(`JSON.stringify({loc:new URL(location.href).searchParams.get('locale'),label:(${approveButton})?.textContent,disabled:(${approveButton})?.disabled,hint:document.getElementById('dx-approval-hint')?.textContent})`)
await A.go('/admin/globals/home-page?locale=ko')
await bannerTab(A)
// Slow down ONLY the Vietnamese status reads (4 s) and record every request the panel sends.
await A.js(`(()=>{window.__log=[];const of=window.fetch;window.fetch=(u,o)=>{const url=String(u&&u.url||u);const method=(o&&o.method)||'GET';window.__log.push({url,method,basis:o&&o.headers&&o.headers['x-approval-basis']});if(method==='GET'&&url.includes('/api/globals/home-page?locale=vi')&&url.includes('approvalState')===false&&url.includes('depth=0'))return new Promise(r=>setTimeout(()=>r(of(u,o)),4000));return of(u,o)}})()`)
await switchLocale(A, 'Tiếng Việt') // refresh for vi starts and is slow
await sleep(300)
await switchLocale(A, '한국어') // back to ko before the vi answer is back
await sleep(1800)
const early = JSON.parse(await panelView(A))
check('locale: KO→VI→KO, button label belongs to KO while the VI answer is still pending', early.loc === 'ko' && early.label === 'Duyệt cấu hình cho tiếng Hàn', JSON.stringify(early))
await sleep(5000) // the slow Vietnamese answer arrives now
const late = JSON.parse(await panelView(A))
check('locale: the late VI answer did not change the KO panel', late.loc === 'ko' && late.label === 'Duyệt cấu hình cho tiếng Hàn' && late.disabled === early.disabled && late.hint === early.hint, JSON.stringify(late))
if (late.disabled === false) {
  const koBasis = await A.js(`fetch('/api/globals/home-page?locale=ko&draft=true&depth=0&fallback-locale=none',{credentials:'include'}).then(r=>r.json()).then(j=>j.approvalState&&j.approvalState.basis)`)
  await A.js(`${approveButton}.click()`)
  await sleep(3500)
  const posts = JSON.parse(await A.js('JSON.stringify(window.__log.filter(r=>r.method==="POST"&&r.url.includes("/api/globals/home-page")))'))
  const done = await A.js(`document.querySelector('.dx-approval__message').textContent`)
  check('locale: the approval sent belongs to KO (URL locale and the KO basis)', posts.length === 1 && posts[0].url.includes('locale=ko') && posts[0].basis === koBasis, JSON.stringify(posts.map((p) => p.url)))
  check('locale: KO approved, message names KO', done.includes('tiếng Hàn'), done)
} else {
  check('locale: KO was approvable in this run', false, JSON.stringify(late))
}

// refresh failure after a save, then retry (same document, so the panel keeps running: no navigation)
// Note: switching language in Payload is a full navigation (the panel is rebuilt), so the locale race is
// covered by tests/unit/approval-refresh.spec.ts; here the refresh that follows a save is made to fail.
await A.go('/admin/globals/home-page?locale=ko')
await bannerTab(A)
await A.focus(`document.querySelector('#field-banners__brand__title')`)
await A.send('Input.insertText', { text: ' e' })
await sleep(300)
await A.js(`(()=>{window.__fail=true;const of=window.fetch;window.fetch=(u,o)=>{const url=String(u&&u.url||u);if(window.__fail&&url.includes('/api/globals/home-page?locale=ko&draft=true&depth=0&fallback-locale=none')&&((o&&o.method)||'GET')==='GET'){window.__used=true;return Promise.reject(new TypeError('simulated network failure'))}return of(u,o)}})()`)
await A.focus(`document.querySelector('#action-save-draft')||[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lưu bản nháp')`)
await A.enter()
await sleep(4500)
console.log('  simulated failure was used:', await A.js('window.__used===true'))
const failed = await A.js(`JSON.stringify({disabled:(${approveButton})?.disabled,retry:!![...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Thử đọc lại'))})`)
check('refresh error after save: approval locked (no old data), retry offered', JSON.parse(failed).disabled === true && JSON.parse(failed).retry === true, failed)
await A.js('window.__fail=false') // the network is back; every panel read failed until now
await A.js(`[...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Thử đọc lại'))?.click()`)
await sleep(2500)
const recovered = await A.js(`JSON.stringify({retry:!![...document.querySelectorAll('button')].find(x=>x.textContent.startsWith('Thử đọc lại')),disabled:(${approveButton})?.disabled,label:(${approveButton})?.textContent})`)
check('refresh error after save: retry restores the approve button for the saved text', JSON.parse(recovered).retry === false && JSON.parse(recovered).disabled === false && JSON.parse(recovered).label === 'Duyệt cấu hình cho tiếng Hàn', recovered)

// ---------- 2. two sessions ----------
const B = await browser(9612)
await login(B, 'admin')
await A.go('/admin/globals/home-page?locale=vi')
await bannerTab(A)
// make the page approvable again: A edits+saves so there is something to approve
await A.focus(`document.querySelector('#field-banners__brand__title')`)
await A.send('Input.insertText', { text: ' a' })
await A.focus(`document.querySelector('#action-save-draft')||[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lưu bản nháp')`)
await A.enter()
await sleep(4000)
const aReady = await A.js(`${approveButton}.disabled`)
check('two sessions: A is on a saved page and may approve', aReady === false)
await B.go('/admin/globals/home-page?locale=vi')
await bannerTab(B)
if (await B.js(slotCollapsed(1))) { await B.js(`${slotToggle(1)}.click()`); await sleep(900) }
console.log('  B slot 1 collapsed?', await B.js(slotCollapsed(1)), 'title input:', await B.js(`!!document.querySelector('#field-banners__brand__title')`))
await B.focus(`document.querySelector('#field-banners__brand__title')`)
await B.send('Input.insertText', { text: ' by-B' })
await sleep(500)
console.log('  B typed value:', await B.js(`document.querySelector('#field-banners__brand__title').value+' | active='+document.activeElement?.id`))
await B.focus(`document.querySelector('#action-save-draft')||[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Lưu bản nháp')`)
await B.enter()
await sleep(4000)
console.log('  B saved text:', await B.js(`document.querySelector('#field-banners__brand__title').value`), '| B toast:', await B.js(`[...document.querySelectorAll('.toast-title')].map(t=>t.textContent).join(';')`))
await A.js(`${approveButton}.click()`)
await sleep(3500)
const conflict = await A.js(`JSON.stringify({m:document.querySelector('.dx-approval__message').textContent,p:[...document.querySelectorAll('.dx-pill')].map(p=>p.textContent)})`)
check('two sessions: A approving after B saved is refused in Vietnamese', conflict.includes('Nội dung đã thay đổi kể từ lúc bạn mở trang'), conflict)
await A.shot('two-sessions-conflict')
await A.go('/admin/globals/home-page?locale=vi')
await bannerTab(A)
const reloaded = await A.js(`document.querySelector('#field-banners__brand__title').value`)
check('two sessions: after reload A sees B\'s text', reloaded.includes('by-B'), reloaded)
await A.js(`${approveButton}.click()`)
await sleep(3500)
check('two sessions: after reload A can approve what it now sees', (await A.js(`document.querySelector('.dx-approval__message').textContent`)).includes('Đã duyệt cấu hình cho tiếng Việt'))
A.close()
B.close()
console.log(results.every(Boolean) ? 'ALL PASS' : `FAILURES: ${results.filter((x) => !x).length}`)
process.exitCode = results.every(Boolean) ? 0 : 1
