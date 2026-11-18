// 쿠오븐 BGM 음원 배달 Worker: R2 버킷(cookierun-ovenbreak-bgm)의 FLAC만 읽기 전용으로 내보냅니다.
// - 주소: https://<worker>.<계정>.workers.dev/<파일>.flac  (?v=… 같은 쿼리는 무시, 브라우저 캐시 구분용)
// - 허용 파일: 최상위 *.flac, ending/*.flac 만 (그 밖의 경로·목록 조회는 404)
// - CORS: 아래 ORIGINS에 있는 사이트만 (브라우저 밖의 직접 다운로드는 막지 못함 → 하루 요청 한도가 최종 안전장치)
// - Range 요청 지원(206), 조건부 요청(ETag → 304) 지원
// 무료 플랜: 하루 10만 요청을 넘으면 요금 대신 Error 1027로 멈춤 (UTC 자정 초기화)

const ORIGINS = [
  'https://rlaehgjs.github.io',
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
]
const KEY = /^(ending\/)?[A-Za-z0-9_\-@.()]+\.flac$/

function allowedOrigin(origin) {
  if (!origin) return null
  return ORIGINS.some(o => (typeof o === 'string' ? o === origin : o.test(origin))) ? origin : null
}

function cors(headers, origin) {
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, ETag')
  }
  headers.append('Vary', 'Origin')
  return headers
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request.headers.get('Origin'))
    // 허용하지 않은 사이트에서 온 브라우저 요청은 R2를 읽기 전에 거절 (Origin이 없는 직접 요청은 통과)
    if (request.headers.has('Origin') && !origin) return new Response('Forbidden', { status: 403, headers: { Vary: 'Origin' } })
    if (request.method === 'OPTIONS') {
      const h = cors(new Headers(), origin)
      if (origin) {
        h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        h.set('Access-Control-Allow-Headers', 'Range')
        h.set('Access-Control-Max-Age', '86400')
      }
      return new Response(null, { status: origin ? 204 : 403, headers: h })
    }
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response('Method Not Allowed', { status: 405, headers: cors(new Headers({ Allow: 'GET, HEAD, OPTIONS' }), origin) })

    let key
    try { key = decodeURIComponent(new URL(request.url).pathname.slice(1)) } catch { key = '' }
    if (!KEY.test(key)) return new Response('Not Found', { status: 404, headers: cors(new Headers(), origin) })

    const obj = request.method === 'HEAD'
      ? await env.BUCKET.head(key)
      : await env.BUCKET.get(key, { range: request.headers, onlyIf: request.headers })
    if (!obj) return new Response('Not Found', { status: 404, headers: cors(new Headers(), origin) })

    const h = new Headers()
    obj.writeHttpMetadata(h)
    h.set('Content-Type', 'audio/flac')
    h.set('ETag', obj.httpEtag)
    h.set('Accept-Ranges', 'bytes')
    h.set('Cache-Control', 'public, max-age=31536000, immutable')
    cors(h, origin)

    if (request.method === 'HEAD') {
      h.set('Content-Length', String(obj.size))
      return new Response(null, { headers: h })
    }
    if (!('body' in obj)) return new Response(null, { status: 304, headers: h }) // onlyIf 불일치 (If-None-Match 등)

    const r = obj.range
    if (r && request.headers.has('Range')) {
      // 실제 R2는 suffix 키를 값 없이(undefined) 넣어 돌려줌 → 'suffix' in r 대신 숫자인지로 판단 (2026-11-19 확인)
      const suffix = typeof r.suffix === 'number'
      const start = suffix ? obj.size - r.suffix : r.offset ?? 0
      const length = suffix ? r.suffix : r.length ?? obj.size - start
      h.set('Content-Range', `bytes ${start}-${start + length - 1}/${obj.size}`)
      h.set('Content-Length', String(length))
      return new Response(obj.body, { status: 206, headers: h })
    }
    h.set('Content-Length', String(obj.size))
    return new Response(obj.body, { headers: h })
  },
}
