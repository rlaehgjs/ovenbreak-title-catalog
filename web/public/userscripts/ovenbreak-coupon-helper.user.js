// ==UserScript==
// @name         쿠오븐 쿠폰 도우미
// @namespace    https://rlaehgjs.github.io/ovenbreak-title-catalog/
// @version      0.1.3
// @description  쿠오븐 사이트에서 고른 ID들을 공식 쿠폰 페이지에 차례로 입력합니다. 기본은 입력만 하고 '상품 받기'는 직접 누릅니다.
// @match        https://www.cookierun.com/*/coupon*
// @match        https://cookierun.com/*/coupon*
// @grant        none
// @inject-into  page
// @sandbox      raw
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict'

  // 작업을 보낼 수 있는 쿠오븐 사이트 주소. 다른 곳에서 온 메시지는 무시한다.
  const ALLOWED_ORIGINS = [
    'https://rlaehgjs.github.io',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
  ]
  const AUTO_MAX = 5 // 자동 클릭은 시험용: 한 번에 최대 5개, 나머지는 직접 누르기
  const SUBMIT_TIMEOUT_MS = 30000

  // 공식 페이지의 알림 문구 → 결과 종류 (page-data의 cp_alert_* 한국어/영어)
  const RESULTS = [
    ['success', ['상품 지급이 완료되었습니다', 'Done!']],
    ['used', ['이미 사용된 쿠폰입니다', 'already been redeemed']],
    ['expired', ['사용 기간이 만료된 쿠폰입니다', 'has expired']],
    ['duplicate', ['이미 같은 종류의 쿠폰을 등록', 'redeemed a coupon already']],
    ['too_many', ['너무 많은 쿠폰을 입력', 'Too many failed attempts']],
    ['global_limit', ['선착순 쿠폰이 마감', 'No more uses left']],
    ['try_again', ['입력 정보를 다시 한번 확인', 'check your input information']],
    ['server_error', ['서버에서 알 수 없는 응답', 'Server error']],
    ['unavailable', ['쿠폰입력 웹사이트를 이용할 수 없습니다', 'unavailable at this time']],
  ]
  // 이 결과가 나오면 남은 계정 전체를 멈춘다 (쿠폰 자체 문제 또는 시도 제한)
  const STOP_ALL = new Set(['expired', 'global_limit', 'too_many', 'unavailable'])
  // 이 결과가 나오면 자동 클릭을 끄고 사람이 직접 누르게 한다
  const STOP_AUTO = new Set(['try_again', 'server_error', 'timeout', 'unknown'])

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const classify = (text) => {
    for (const [kind, needles] of RESULTS) if (needles.some((n) => text.includes(n))) return kind
    return 'unknown'
  }

  // React가 값 변경을 알아차리도록 원래 setter로 넣고 input 이벤트를 보낸다
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  const setInput = (input, value) => {
    valueSetter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  // React가 입력칸에 연결됐는지 (연결 전에 넣은 값은 하이드레이션 때 지워진다)
  const reactProps = (input) => {
    const key = Object.keys(input).find((k) => k.startsWith('__reactProps') || k.startsWith('__reactEventHandlers'))
    return key ? input[key] : null
  }
  const waitHydrated = async () => {
    for (let i = 0; i < 80; i++) {
      const form = findForm()
      if (form && reactProps(form.idInput) && reactProps(form.codeInput)) { await sleep(500); return true }
      await sleep(250)
    }
    // React 정보가 안 보이면(격리 실행 등) 화면이 안정될 때까지 기다린 뒤 진행
    return !!findForm()
  }
  // 값을 넣고 React 상태에 실제로 들어갔는지 확인 (최대 5번)
  const fill = async (form, idValue, codeValue) => {
    if (!reactProps(form.idInput)) {
      setInput(form.codeInput, codeValue)
      setInput(form.idInput, idValue)
      await sleep(300)
      return form.idInput.value === idValue && form.codeInput.value === codeValue
    }
    for (let i = 0; i < 5; i++) {
      if (reactProps(form.codeInput)?.value !== codeValue) setInput(form.codeInput, codeValue)
      if (reactProps(form.idInput)?.value !== idValue) setInput(form.idInput, idValue)
      await sleep(150)
      if (reactProps(form.idInput)?.value === idValue && reactProps(form.codeInput)?.value === codeValue) return true
    }
    return false
  }
  const findForm = () => {
    const form = document.querySelector('form')
    if (!form) return null
    const idInput = form.querySelector('input[maxlength="9"]')
    const codeInput = form.querySelector('input[maxlength="16"]')
    const button = form.querySelector('button')
    return idInput && codeInput && button ? { idInput, codeInput, button } : null
  }

  // ---- 작은 진행 상황 창 ----
  const panel = document.createElement('div')
  panel.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(360px,calc(100vw - 32px));max-height:60vh;overflow:auto;' +
    'background:#fffdf7;color:#26332c;border:2px solid #315648;border-radius:12px;padding:12px 14px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 6px 30px #0003'
  const title = document.createElement('strong')
  title.textContent = '쿠오븐 쿠폰 도우미'
  const status = document.createElement('div')
  status.style.margin = '6px 0'
  const log = document.createElement('ol')
  log.style.cssText = 'margin:6px 0;padding-left:20px'
  const stopBtn = document.createElement('button')
  stopBtn.textContent = '중지'
  stopBtn.style.cssText = 'font:inherit;border:1px solid #315648;background:#f5f8ef;border-radius:6px;padding:4px 10px;cursor:pointer'
  panel.append(title, status, log, stopBtn)
  const showStatus = (text) => { status.textContent = text }
  const addLog = (text) => { const li = document.createElement('li'); li.textContent = text; log.append(li) }

  const LOG = (...a) => console.info('[쿠오븐 쿠폰 도우미]', ...a)
  document.body.append(panel)
  LOG('실행됨', location.href, 'opener:', !!window.opener)
  if (!window.opener) {
    showStatus('도우미는 실행됐지만, 이 창은 쿠오븐 사이트에서 열린 창이 아니에요(연결 정보 없음). 쿠오븐 쿠폰 메뉴의 버튼으로 열어 주세요.')
    stopBtn.remove()
    setTimeout(() => panel.remove(), 10000)
    return
  }
  showStatus('도우미 실행됨 — 공식 페이지 준비를 기다리는 중…')
  let opener = null
  let openerOrigin = ''
  let running = false
  let stopped = false
  const send = (msg) => { if (opener) opener.postMessage(msg, openerOrigin) }
  stopBtn.onclick = () => { stopped = true; showStatus('중지했어요.') }

  // 알림창은 작업 중에만 가로채서 문구를 읽는다
  const realAlert = window.alert
  let pendingAlert = null
  window.alert = function (message) {
    if (running && pendingAlert) { const r = pendingAlert; pendingAlert = null; r(String(message)); return }
    return realAlert.call(window, message)
  }
  const waitAlert = () => new Promise((resolve) => {
    const timer = setTimeout(() => { pendingAlert = null; resolve(null) }, SUBMIT_TIMEOUT_MS)
    pendingAlert = (text) => { clearTimeout(timer); resolve(text) }
  })

  const run = async (job) => {
    const form = findForm()
    if (!form) { send({ type: 'ovb-coupon:done', jobId: job.jobId, reason: 'form-not-found' }); return }
    running = true
    let auto = !!job.auto
    const delay = Math.max(2000, Number(job.delayMs) || 3000)
    const ids = job.ids.slice()
    for (let i = 0; i < ids.length; i++) {
      if (stopped) break
      const id = ids[i]
      if (auto && i >= AUTO_MAX) { auto = false; addLog(`자동 클릭은 ${AUTO_MAX}개까지라 여기서부터 직접 눌러 주세요.`) }
      if (!(await fill(form, id, job.code))) {
        addLog(`${id}: 입력칸에 값을 넣지 못했어요. 여기서 멈춰요.`)
        send({ type: 'ovb-coupon:result', jobId: job.jobId, id, code: job.code, kind: 'unknown', message: '도우미가 입력칸에 값을 넣지 못함' })
        stopped = true
        break
      }
      const alertPromise = waitAlert()
      if (auto) {
        showStatus(`(${i + 1}/${ids.length}) ${id} — ${delay / 1000}초 뒤 자동으로 제출해요`)
        await sleep(delay)
        if (stopped) { pendingAlert = null; break }
        form.button.click()
      } else {
        showStatus(`(${i + 1}/${ids.length}) ${id} — '상품 받기'를 눌러 주세요`)
        form.button.scrollIntoView({ block: 'center' })
      }
      const text = await alertPromise
      const kind = text === null ? 'timeout' : classify(text)
      addLog(`${id}: ${text ?? '응답 없음(시간 초과)'}`)
      send({ type: 'ovb-coupon:result', jobId: job.jobId, id, code: job.code, kind, message: text ?? '' })
      if (STOP_ALL.has(kind)) { addLog('이 결과는 남은 계정에도 같으니 여기서 멈춰요.'); stopped = true; break }
      if (auto && STOP_AUTO.has(kind)) { auto = false; addLog('예상 밖 결과라 자동 클릭을 끄고, 남은 계정은 직접 누르게 할게요.') }
      await sleep(500)
    }
    running = false
    stopBtn.remove()
    showStatus(stopped ? '멈췄어요. 이 창은 닫아도 돼요.' : '모두 처리했어요. 이 창은 닫아도 돼요.')
    send({ type: 'ovb-coupon:done', jobId: job.jobId, reason: stopped ? 'stopped' : 'finished' })
  }

  window.addEventListener('message', (event) => {
    if (!ALLOWED_ORIGINS.includes(event.origin) || event.source !== window.opener) return
    const job = event.data
    if (!job || job.type !== 'ovb-coupon:job' || running) return
    if (!/^[A-Z0-9]{16}$/.test(job.code) || !Array.isArray(job.ids) || !job.ids.every((id) => /^[A-Z0-9]{9}$/.test(id))) return
    opener = event.source
    LOG('작업 받음', event.origin, job.ids.length + '개')
    openerOrigin = event.origin
    run(job)
  })

  // 폼이 그려지면 쿠오븐 사이트에 준비됐다고 알린다 (허용된 주소로만 전달됨)
  const announce = async () => {
    if (!(await waitHydrated())) { showStatus('공식 페이지의 입력칸을 찾지 못했어요. 페이지 구조가 바뀌었을 수 있어요.'); LOG('입력칸 없음'); return }
    showStatus('공식 페이지 준비됨 — 쿠오븐 사이트에 연결하는 중…')
    for (let i = 0; i < 60 && !opener; i++) {
      for (const origin of ALLOWED_ORIGINS) {
        try { window.opener.postMessage({ type: 'ovb-coupon:ready', version: '0.1.3' }, origin) } catch { /* 다른 주소면 무시 */ }
      }
      if (i === 0) LOG('준비 신호 보냄', ALLOWED_ORIGINS)
      await sleep(1000)
    }
    if (!opener) { showStatus('쿠오븐 사이트에서 답이 없어요. 쿠오븐 탭이 열려 있는지, 주소가 127.0.0.1:5173 / localhost:5173 / github.io 중 하나인지 확인해 주세요.'); LOG('작업 못 받음') }
  }
  announce()
})()
