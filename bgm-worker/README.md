# bgm-worker — R2 음원 배달 (workers.dev 무료 주소)

R2 버킷 `cookierun-ovenbreak-bgm`의 FLAC을 `https://ovenbreak-bgm.<계정>.workers.dev/<파일>`로 내보내는 Cloudflare Worker.
도메인 없이 무료로 쓰기 위한 것 (2026-11-17 결정).

## 동작
- 허용 경로: `*.flac`, `ending/*.flac` (그 밖은 404, 목록 조회 없음). 쿼리(`?v=…`)는 무시.
- CORS 허용: `https://rlaehgjs.github.io`, `http://localhost:*`, `http://127.0.0.1:*`. 다른 사이트의 브라우저 요청은 R2를 읽기 전에 403.
  Origin이 없는 직접 요청(주소창, curl)은 통과 — 막을 수 없으므로 하루 요청 한도가 최종 안전장치.
- GET/HEAD/OPTIONS, Range(206), If-None-Match(304), `Cache-Control: public, max-age=31536000, immutable`.

## 무료 한도 (공식 문서 확인, 2026-11-17)
- Workers Free: 하루 100,000 요청, UTC 자정 초기화. 넘으면 요금 없이 Error 1027.
- R2 Class B(읽기) 무료 월 1,000만 회. Worker 한도(월 최대 약 300만) 안이라 R2 읽기 요금은 생기지 않는 구조(계산).
- `workers.dev`에서는 Cache API가 효과 없다는 문서가 있음 → 캐시 없이 매번 R2에서 읽는다고 가정.
- 플레이어는 곡 파일 전체를 한 번에 받음(`BufferEngine.ts`의 fetch) → 재생 1회 = 요청 1회(끝까지 재생 모드는 끝부분 1회 추가).

## 배포 방법 (둘 중 하나)
1. wrangler: `npx wrangler deploy` (wrangler 설치 필요, Cloudflare 로그인은 사용자가 직접)
2. 대시보드: Workers & Pages → Create → Worker → `src/index.js` 붙여넣기 → Settings → Bindings → R2 bucket, 변수 이름 `BUCKET`

배포 후 웹 빌드에 `VITE_BGM_BASE=https://ovenbreak-bgm.<계정>.workers.dev/` 지정.

## 시험
가짜 R2 버킷으로 로컬 시험(2026-11-17): 전체 200, Range 206·suffix, 304, HEAD, 다른 사이트 403, localhost 허용, preflight 204,
없는 파일·잘못된 경로·목록 404, POST 405 — 통과. 실제 R2·workers.dev에서는 아직 시험 안 함.
`tracks.json`이 참조하는 원격 파일 2,495개 이름이 모두 허용 규칙에 맞음.

## 배포 (2026-11-19)
`https://ovenbreak-bgm.ehgjs6569.workers.dev/` — 대시보드 붙여넣기. 실제 시험: 200(해시 일치)·403·404·405·preflight 204 통과.
실제 R2는 `range` 결과에 `suffix: undefined`를 넣어 줘서 첫 배포에서 Content-Range가 NaN → `typeof r.suffix === 'number'`로 수정, 재배포 후 206·304 시험 통과(2026-11-19). 플레이어는 Range를 쓰지 않아 재생에는 영향 없음.
