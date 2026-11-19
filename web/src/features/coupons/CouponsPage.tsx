import { useEffect, useRef, useState } from 'react'
import { CouponGuide } from './CouponGuide'

// 이 브라우저에만 저장 (서버로 보내지 않음). ID는 공식 쿠폰 페이지에만 전달된다.
const STORAGE_KEY = 'ovenbreak-coupon-helper-v1'
const OFFICIAL_ORIGINS = ['https://www.cookierun.com', 'https://cookierun.com']
// 끝의 / 가 없으면 서버가 /ko/coupon/ 으로 넘기면서 ?code= 를 버린다 (2026-11-18 확인)
const OFFICIAL_URL = 'https://www.cookierun.com/ko/coupon/'
const SCRIPT_URL = `${import.meta.env.BASE_URL}userscripts/ovenbreak-coupon-helper.user.js`
const AUTO_MAX = 30
const MAX_ACCOUNTS = 30

type Account = { id: string; label: string }
type Coupon = { code: string; memo: string; addedAt: string }
type Result = { kind: string; message: string; at: string }
type Store = { accounts: Account[]; coupons: Coupon[]; results: Record<string, Record<string, Result>> }

const KIND_LABEL: Record<string, string> = {
  success: '지급 완료', used: '이미 사용', expired: '기간 만료', duplicate: '같은 종류 등록함',
  too_many: '시도 너무 많음', global_limit: '선착순 마감', try_again: '입력 정보 확인',
  server_error: '서버 오류', unavailable: '웹 입력 불가', timeout: '응답 없음', unknown: '알 수 없음',
}
const DONE_KINDS = new Set(['success', 'used', 'duplicate'])

const filterValue = (value: string) => value.replace(/\s|\W|_/g, '').toUpperCase()
const HANGUL = /[ㄱ-ㅎㅏ-ㅣ가-힣]/
// 입력 중에는 글자를 지우지 않는다 (한글 입력 모드에서 글자가 사라져 입력이 안 되는 것처럼 보이는 문제)
function InputHint({ raw, value, size, what, exists }: { raw: string; value: string; size: number; what: string; exists: boolean }) {
  if (!raw) return null
  if (exists) return <p className="coupon-hint warn">이미 목록에 있어요: <code>{value}</code></p>
  if (HANGUL.test(raw)) return <p className="coupon-hint warn">한글이 섞여 있어요. 한/영 키로 영문 입력으로 바꿔 주세요.</p>
  return <p className={`coupon-hint${value.length > size ? ' warn' : ''}`}>{what} <code>{value || '—'}</code> ({value.length}/{size}자리)</p>
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as Partial<Store>
      return { accounts: s.accounts ?? [], coupons: s.coupons ?? [], results: s.results ?? {} }
    }
  } catch { /* 저장소를 쓸 수 없으면 빈 상태로 시작 */ }
  return { accounts: [], coupons: [], results: {} }
}

type Run = { jobId: string; code: string; ids: string[]; state: 'waiting' | 'running' | 'no-script' | 'done'; note?: string }

export default function CouponsPage() {
  const [store, setStore] = useState<Store>(load)
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [selectedCode, setSelectedCode] = useState(() => load().coupons[0]?.code ?? '')
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [auto, setAuto] = useState(false)
  const [delaySec, setDelaySec] = useState(3)
  const [run, setRun] = useState<Run | null>(null)
  const [copied, setCopied] = useState('')
  const popup = useRef<Window | null>(null)
  const runRef = useRef<Run | null>(null)
  runRef.current = run

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) } catch { /* 저장 실패는 무시 */ }
  }, [store])

  const coupon = store.coupons.find(c => c.code === selectedCode)
  const resultsFor = (code: string) => store.results[code] ?? {}
  const isPicked = (id: string) => picked[id] ?? !DONE_KINDS.has(resultsFor(selectedCode)[id]?.kind ?? '')
  const targets = store.accounts.filter(a => isPicked(a.id)).map(a => a.id)

  // 공식 페이지(유저스크립트)와 메시지 주고받기
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!OFFICIAL_ORIGINS.includes(event.origin) || event.source !== popup.current) return
      const data = event.data as { type?: string; id?: string; code?: string; kind?: string; message?: string; jobId?: string; reason?: string }
      const current = runRef.current
      if (!current || !data?.type) return
      if (data.type === 'ovb-coupon:ready' && (current.state === 'waiting' || current.state === 'no-script')) {
        popup.current?.postMessage({ type: 'ovb-coupon:job', jobId: current.jobId, code: current.code, ids: current.ids, auto, delayMs: delaySec * 1000 }, event.origin)
        setRun({ ...current, state: 'running' })
      } else if (data.type === 'ovb-coupon:result' && data.jobId === current.jobId && data.id && data.code === current.code) {
        const { id, code } = data
        setStore(s => ({ ...s, results: { ...s.results, [code]: { ...s.results[code], [id]: { kind: data.kind ?? 'unknown', message: data.message ?? '', at: new Date().toISOString() } } } }))
      } else if (data.type === 'ovb-coupon:done' && data.jobId === current.jobId) {
        setRun({ ...current, state: 'done', note: data.reason === 'form-not-found' ? '공식 페이지에서 입력칸을 찾지 못했어요. 페이지 구조가 바뀌었을 수 있어요.' : data.reason === 'stopped' ? '중간에 멈췄어요.' : '모두 처리했어요.' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [auto, delaySec])

  const start = () => {
    if (!coupon || targets.length === 0) return
    const next: Run = { jobId: crypto.randomUUID(), code: coupon.code, ids: targets, state: 'waiting' }
    setRun(next)
    // 쿠폰 번호는 공식 페이지가 지원하는 ?code= 로 넘기고, ID는 주소에 넣지 않고 메시지로만 보낸다
    popup.current = window.open(`${OFFICIAL_URL}?code=${coupon.code}`, 'ovb-coupon-official')
    setTimeout(() => {
      if (runRef.current?.jobId === next.jobId && runRef.current.state === 'waiting') setRun({ ...next, state: 'no-script' })
    }, 12000)
  }

  const idValue = filterValue(newId)
  const codeValue = filterValue(newCode)
  const full = store.accounts.length >= MAX_ACCOUNTS
  const idOk = !full && idValue.length === 9 && !HANGUL.test(newId) && !store.accounts.some(a => a.id === idValue)
  const codeOk = codeValue.length === 16 && !HANGUL.test(newCode) && !store.coupons.some(c => c.code === codeValue)
  const addAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!idOk) return
    setStore(s => ({ ...s, accounts: [...s.accounts, { id: idValue, label: newLabel.trim() }] }))
    setNewId(''); setNewLabel('')
  }
  const addCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeOk) return
    setStore(s => ({ ...s, coupons: [{ code: codeValue, memo: newMemo.trim(), addedAt: new Date().toISOString() }, ...s.coupons] }))
    setSelectedCode(codeValue); setNewCode(''); setNewMemo('')
  }
  const removeAccount = (id: string) => setStore(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) }))
  const removeCoupon = (code: string) => {
    setStore(s => { const results = { ...s.results }; delete results[code]; return { ...s, coupons: s.coupons.filter(c => c.code !== code), results } })
    if (selectedCode === code) setSelectedCode('')
  }
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text) } catch { setCopied('') }
  }

  const busy = run?.state === 'waiting' || run?.state === 'running'

  return (
    <section className="feature-page coupon-page">
      <div className="eyebrow">OVENBREAK ARCHIVE</div>
      <h1>쿠폰 입력</h1>
      <p className="lead">계정 ID와 쿠폰을 모아 두고, 공식 쿠폰 페이지에서 차례로 등록해요.</p>

      <div className="coupon-notice">
        <p>입력한 ID와 쿠폰은 <strong>이 브라우저에만</strong> 저장돼요. 등록은 데브시스터즈 공식 페이지(cookierun.com)에서 이뤄지고, 이 사이트는 ID를 어디에도 보내지 않아요.</p>
        <p>공식 페이지에 자동으로 입력하려면 브라우저에 <a className="text-link" href={SCRIPT_URL}>쿠폰 도우미 유저스크립트</a>를 설치해야 해요 (Tampermonkey·Violentmonkey).</p>
      </div>

      <CouponGuide scriptUrl={SCRIPT_URL} officialUrl={OFFICIAL_URL} />

      <div className="coupon-grid">
        <section className="coupon-card">
          <h2>계정 ID <small>{store.accounts.length}/{MAX_ACCOUNTS}</small></h2>
          <form onSubmit={addAccount} className="coupon-form">
            <input aria-label="사용자 ID (9자리)" placeholder="사용자 ID 9자리" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={newId} onChange={e => setNewId(e.target.value)} />
            <input aria-label="별명 (선택)" placeholder="별명 (선택)" maxLength={20} value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <button disabled={!idOk}>추가</button>
          </form>
          {full && <p className="coupon-hint warn">계정은 최대 {MAX_ACCOUNTS}개까지 등록할 수 있어요. 새로 넣으려면 기존 계정을 삭제해 주세요.</p>}
          <InputHint raw={newId} value={idValue} size={9} what="저장될 ID" exists={store.accounts.some(a => a.id === idValue)} />
          {store.accounts.length === 0 ? <p>아직 등록한 계정이 없어요.</p> : (
            <ul className="coupon-list">
              {store.accounts.map(a => (
                <li key={a.id}>
                  <span><code>{a.id}</code>{a.label && <small> {a.label}</small>}</span>
                  <span className="coupon-row-actions">
                    <button type="button" onClick={() => copy(a.id)}>{copied === a.id ? '복사됨' : 'ID 복사'}</button>
                    <button type="button" onClick={() => removeAccount(a.id)} aria-label={`${a.id} 삭제`}>삭제</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="coupon-card">
          <h2>쿠폰</h2>
          <form onSubmit={addCoupon} className="coupon-form">
            <input aria-label="쿠폰 번호 (16자리)" placeholder="쿠폰 번호 16자리" autoComplete="off" autoCapitalize="characters" spellCheck={false} value={newCode} onChange={e => setNewCode(e.target.value)} />
            <input aria-label="메모 (선택)" placeholder="메모 (선택)" maxLength={40} value={newMemo} onChange={e => setNewMemo(e.target.value)} />
            <button disabled={!codeOk}>추가</button>
          </form>
          <InputHint raw={newCode} value={codeValue} size={16} what="저장될 번호" exists={store.coupons.some(c => c.code === codeValue)} />
          {store.coupons.length === 0 ? <p>아직 등록한 쿠폰이 없어요.</p> : (
            <ul className="coupon-list">
              {store.coupons.map(c => {
                const done = Object.values(resultsFor(c.code)).filter(r => DONE_KINDS.has(r.kind)).length
                return (
                  <li key={c.code} className={c.code === selectedCode ? 'selected' : ''}>
                    <label>
                      <input type="radio" name="coupon" checked={c.code === selectedCode} onChange={() => { setSelectedCode(c.code); setPicked({}) }} />
                      <span><code>{c.code}</code>{c.memo && <small> {c.memo}</small>}<small className="coupon-progress"> 완료 {done}/{store.accounts.length}</small></span>
                    </label>
                    <span className="coupon-row-actions">
                      <button type="button" onClick={() => copy(c.code)}>{copied === c.code ? '복사됨' : '번호 복사'}</button>
                      <button type="button" onClick={() => removeCoupon(c.code)} aria-label={`${c.code} 삭제`}>삭제</button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="coupon-card coupon-run">
        <h2>등록하기 {coupon && <small><code>{coupon.code}</code></small>}</h2>
        {!coupon ? <p>위에서 쿠폰을 골라 주세요.</p> : store.accounts.length === 0 ? <p>계정 ID를 먼저 추가해 주세요.</p> : (<>
          <table className="coupon-table">
            <thead><tr><th scope="col">대상</th><th scope="col">계정</th><th scope="col">결과</th></tr></thead>
            <tbody>
              {store.accounts.map(a => {
                const r = resultsFor(coupon.code)[a.id]
                return (
                  <tr key={a.id}>
                    <td><input type="checkbox" aria-label={`${a.id} 대상에 넣기`} checked={isPicked(a.id)} disabled={busy} onChange={e => setPicked(p => ({ ...p, [a.id]: e.target.checked }))} /></td>
                    <td><code>{a.id}</code>{a.label && <small> {a.label}</small>}</td>
                    <td>{r ? <span className={`coupon-kind kind-${r.kind}`} title={r.message}>{KIND_LABEL[r.kind] ?? r.kind}</span> : <span className="coupon-kind">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <fieldset className="coupon-mode" disabled={busy}>
            <legend>공식 페이지에서</legend>
            <label><input type="radio" name="mode" checked={!auto} onChange={() => setAuto(false)} /> ID만 차례로 입력하고, '상품 받기'는 내가 누르기 (권장)</label>
            <label><input type="radio" name="mode" checked={auto} onChange={() => setAuto(true)} /> 자동으로 누르기 — 시험용, 최대 {AUTO_MAX}개</label>
            {auto && <label className="coupon-delay">제출 간격 <input type="number" min={2} max={30} value={delaySec} onChange={e => setDelaySec(Math.min(30, Math.max(2, Number(e.target.value) || 3)))} />초</label>}
            {auto && <p>공식 페이지는 보이지 않는 reCAPTCHA로 사람인지 판단해요. 자동 클릭은 실패할 수 있고, 예상 밖 결과가 나오면 자동 클릭을 끄고 직접 누르게 바뀌어요. 데브시스터즈 이용약관에 어긋날 수 있으니 사용에 주의해 주세요.</p>}
          </fieldset>

          <button type="button" className="coupon-start" disabled={busy || targets.length === 0} onClick={start}>
            공식 페이지 열고 {targets.length}개 계정 등록
          </button>
          {run && (
            <p className="coupon-run-status" role="status">
              {run.state === 'waiting' && '공식 페이지를 여는 중이에요…'}
              {run.state === 'running' && '공식 페이지 창에서 진행 중이에요. 진행 상황은 그 창 오른쪽 아래에 보여요.'}
              {run.state === 'no-script' && <>공식 페이지에서 아직 응답이 없어요. 공식 창 오른쪽 아래에 '쿠오븐 쿠폰 도우미' 창이 떴는지 확인해 주세요. 창이 없으면 유저스크립트가 실행되지 않은 거예요(Tampermonkey의 '사용자 스크립트 허용' 확인). 이 탭은 계속 기다리니 늦게 연결돼도 괜찮아요. 설치 없이 쓰려면 'ID 복사' 버튼으로 하나씩 붙여 넣어 주세요.</>}
              {run.state === 'done' && run.note}
            </p>
          )}
        </>)}
      </section>
    </section>
  )
}
