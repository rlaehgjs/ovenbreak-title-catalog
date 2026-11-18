# 오븐브레이크 정보 허브 — 로컬 3단계

React + TypeScript + Vite 앱입니다. `.github/workflows/pages.yml`이 이 앱을 빌드해 GitHub Pages(https://rlaehgjs.github.io/ovenbreak-title-catalog/)에 배포합니다.
칭호 도감은 `title-catalog/index.html`을 수정 없이 불러오며 기존 보유 기록(localStorage)을 그대로 씁니다.
BGM 음원은 저장소에 넣지 않고 Cloudflare R2 + Worker(`bgm-worker/`)에서 받습니다. 빌드 시 `VITE_BGM_BASE`로 주소를 지정합니다(없으면 번들된 테스트 3곡만).

## 실행

프로젝트 루트에서 `cd web` 후 `npm run dev`.
주소: http://127.0.0.1:5173/ovenbreak-title-catalog/

처음 설치하거나 다른 PC에서는 Node 24 환경에서 `npm ci` 후 실행하세요.
`npm run build`: TypeScript 검사와 dist 생성. `npm run lint`: 소스 정적 검사.
`npm run preview`: 빌드 결과 확인 (4173 포트).
이 명령들은 업로드/배포를 하지 않습니다.

## 구현 범위

- 공통 헤더, 내비게이션, 대시보드, 푸터, BGM 안내 영역
- HashRouter: /, /titles, /maps, /coupons, /music
- 활성 메뉴 표시, 페이지별 제목, 본문 건너뛰기, 경로 변경 시 초점·스크롤 복원
- 잘못된 경로의 안내 화면
- 반응형 카드와 가로 메뉴

칭호 페이지는 기존 도감과 연결되었습니다. 맵·쿠폰·음악 페이지는 준비 안내 상태입니다.
BGM은 재생 기능이 없는 안내 영역입니다. 이후 라우트 바깥 AudioProvider/AudioHost를 추가합니다.
칭호 페이지는 기존 localStorage 키와 정수 ID 배열을 그대로 사용합니다. 공개 데이터와 기존 저장 형식은 변경하지 않습니다. 로컬 주소의 저장소는 공개 사이트와 별개이므로 공개 사이트의 기록이 로컬에 자동 복사되지는 않습니다.

## 구조

- src/app: 공통 레이아웃과 메뉴 정의
- src/features/dashboard: 홈 화면
- src/shared/FeaturePage.tsx: 기능 연결 전 안내 화면
- src/App.tsx: 라우트
- src/index.css: 공통 반응형 스타일

Vite는 web 폴더만 파일 접근 허용하고 127.0.0.1에서 실행합니다. 원본·비공개 검토 파일을 public에 넣지 마세요.
base는 기존 Pages 저장소 경로와 일치시키되 실제 배포 설정은 연결하지 않았습니다.
기존 루트 .gitignore 때문에 web 폴더 전체는 현재 로컬 전용입니다.

## 검증

2단계: 빌드, lint, 다섯 메뉴의 브라우저 이동과 /music 새로고침, 좁은 화면 레이아웃 확인.
기존 호환성 검증: 프로젝트 루트에서 `python migration/check.py`.


## 칭호 연결 방식

`npm run dev`와 `npm run build` 전에 `sync:catalog`가 실행됩니다. 실행 중 원본 도감을 갱신했다면 `npm run sync:catalog`를 실행하세요.
현재 공개 산출물 title-catalog/index.html을 검증한 후 스타일·마크업·동작 코드를 어댑터로 생성하고, 검증된 이미지 파일만 복사합니다. 비공개 원본·검토 JSON을 읽거나 공개하지 않습니다.

- src/features/titles/TitlesPage.tsx: 지연 로딩된 칭호 페이지, mount/unmount 관리
- src/generated/catalog.ts: 자동 생성한 기존 코드. 직접 편집 금지
- scripts/sync-catalog.mjs: 공개 검증 후 어댑터 생성
- scripts/copy-catalog-images.py: 공개 이미지만 복사하고 더 이상 참조되지 않는 생성 이미지 제거
- scripts/check-catalog.mjs: 기존 실행 코드 전체, 데이터·변경 이력, 카드 스타일 보존 확인

Shadow DOM으로 스타일 및 document 조회를 한정합니다. iframe이나 별도 문서로 이동하지 않습니다.
페이지를 나가면 타이머를 해제하고 대화상자·도감 DOM을 제거합니다. 컴포넌트가 폐기되면 해당 DOM의 이벤트도 함께 폐기됩니다.
StrictMode의 시험용 mount가 변경 내역 확인 기록을 미리 소비하지 않도록 초기화를 취소 가능한 microtask로 예약합니다.
보유 기록은 유지되며 재진입 시 필터·페이지는 기존 도감을 새로 여는 것처럼 기본값입니다.

검사: `npm run check:catalog`, `npm run lint`, `npm run build` 및 프로젝트 루트의 `python migration/check.py`.
실제 브라우저에서 검색, 카드 보유 선택(17점), 다른 페이지 이동·재진입·새로고침 후 복원, 변경 내역에서 2페이지의 대상 카드로 이동을 확인했습니다. 테스트 보유 선택은 해제하여 복원했습니다.

현재는 호환성 우선의 어댑터 단계입니다. domain/storage 로직을 별도 TypeScript 모듈로 재작성하지 않았습니다. 기존 코드가 그대로 포함되는지 자동 검사합니다.
도감 데이터가 포함된 지연 로딩 청크는 약 1.97MB(전송 gzip 약236KB)로 빌드 크기 경고가 있습니다. 홈에서는 로드하지 않으며, 후속 데이터 분리 단계에서 개선할 수 있습니다.
공개 배포 및 GitHub Actions 변경은 하지 않았습니다.


## 4단계 전역 BGM (로컬 전용)

AudioProvider는 HashRouter 바깥에 있으며 실제 audio 요소 한 개를 소유합니다. 페이지와 공통 MiniPlayer는 같은 Context를 사용합니다. 일반 경로 이동은 src/load/play를 호출하지 않습니다. 앱 자체가 해제되면 재생을 정지합니다.

- 테스트 곡: bgm_bonus_ovenbreak_01/02/03, 각 약10.5초 WAV
- 기존 bgm-player/fmod_backend.py 및 게임 soundbank.dls로 렌더링; FMOD DLL은 복사하지 않음
- 재생/일시정지, 이전/다음, 탐색, 음량, 한 곡 반복, 종료 후 다음 곡
- 로딩/파일 오류/자동재생 거부 안내
- 새로고침하면 초기 상태로 돌아가며 자동재생하지 않음
- 설정 영구 저장·즐겨찾기·사용자 큐·셔플은 5단계 범위

재생 파일 재생성: 프로젝트 루트에서 `python web/scripts/render-test-bgm.py` (기존 FMOD SDK와 게임 DLS 필요). 보유 기록 저장소에는 접근하지 않습니다.
현재 오디오는 짧은 재생 지속성 테스트 자료이며 게임 버스 효과·음량·반복 지점과 완전히 동일함을 검증한 것은 아닙니다.
브라우저에서 재생 중 칭호 페이지 이동 전후 시간 7.76→8.14초, paused=false, audio 요소1개를 확인했습니다. 다음 곡·일시정지·탐색 후 다른 경로에서도 상태가 유지됐습니다.
공개 배포는 하지 않았습니다. 향후 배포 단계에서는 테스트 음원의 공개 가능 여부를 별도로 검토하고 빌드 공개 목록에 포함할지 결정해야 합니다.


## 5단계 음악 라이브러리 및 반복 개선

현재 구현은 4단계의 HTMLAudioElement 대신 전역 Web Audio AudioContext 하나를 사용합니다. Provider는 라우터 바깥에 유지되며 페이지 이동은 엔진 생성/정지/재로딩을 하지 않습니다. BufferSource는 곡 선택·재개·탐색 시 새로 만들지만 한 곡 반복은 동일 노드의 loopStart/loopEnd에서 오디오 시계로 진행합니다. 디코딩 캐시는 최대4곡입니다.

- 이름 있는 재생목록 생성/이름 변경/삭제, 곡 추가/제거/위아래 순서 변경
- 즐겨찾기 전용 목록, 음악 이름 검색
- 셔플: 현재 곡을 제외한 나머지를 한 번씩 재생; 반복 끔에서는 소진 후 정지
- 전체 반복: 현재 목록만 다시 순환; 셔플 새 순환에서는 직전 곡을 바로 반복하지 않음
- 한 곡 반복: 엔진 내부 루프. 한 곡만 있는 목록의 전체 반복도 동일 방식
- 이전 버튼은 실제 재생 이력을 우선하고, 뒤로 간 후 다음은 앞으로 이력을 사용
- 재생목록 선택은 일시정지 후 적용. 재생 중 목록에서 곡을 제거해도 현재 곡은 즉시 끊지 않고 다음 선택부터 새 목록 반영
- 빈 목록은 전역 재생/다음/이전 비활성화. 라이브러리에서 곡을 직접 고르면 필요한 경우 전체 곡 목록으로 전환

저장 키: ovenbreak-music-settings-v1 (version=1). 음량/반복/셔플 (예전 smooth 값은 호환용으로 보존하며 음원에 적용하지 않음), 즐겨찾기, 목록 및 순서, 선택된 목록, 마지막 곡과 위치를 저장합니다. 재생 위치는 재생 중 약4초마다, 일시정지·페이지 숨김 시 저장합니다. 새로고침은 일시정지 상태로 복원하며 자동재생하지 않습니다. 셔플의 이미 소진한 순서와 이전/앞으로 이력은 세션 메모리이며 새로고침하면 새 순환입니다.
잘못된 저장값은 정규화하며 읽기/쓰기 실패를 표시합니다. 초기 로딩만으로 저장값을 덮어쓰지 않습니다. 칭호 저장 키에는 접근하지 않습니다.

### 반복 관련 근거와 한계

bgm-player/game-audio-evidence.md의 기존 정적 분석에서 게임은 FMOD 2.03.07의 LOOP_NORMAL 및 setLoopPoints(밀리초)를 사용합니다. 곡별 속도·채널 볼륨·버스 DSP도 있으므로 PCM 테스트 루프를 게임과 동일한 출력이라고 주장하지 않습니다.
2026-11-16 재분석: 세 MIDI는 nominal10.5초의 완곡입니다. 이전 ‘잘린 발췌본’ 설명은 잘못됐습니다. 기존10.528초 WAV에는 믹서 출력 패딩이 포함됐습니다.
게임의 기본 경로는 getLength(MS)/speed를 정수화해 Sound::setLoopPoints(0,MS,end,MS)를 호출합니다 (VA0x6ee6658~0x6ee6678). 현재 세 테스트 곡의 길이는10507ms이며 해당 경로를 FMOD2.03.07에서 적용하면 inclusive endpoint로504337frames@48000Hz입니다.
web/scripts/render-test-bgm.py는 동기 NRT 렌더(init flags3)로 native3주기를 생성하고 첫 주기를 추출합니다. 첫째/둘째 주기의 오차는 최대16bit1LSB이며, 전체 약100만 샘플 중 차이는 각각3/1/7개였습니다. 소스 MIDI/DLS 해시·엔진 버전 및 반복 PCM 검증에 실패하면 중단합니다. 임의 무음 제거와12ms크로스페이드는 삭제했습니다.
WebAudio는48kHz AudioContext에서 원본 샘플을 수정하지 않고 전체 버퍼를 반복합니다. 한 곡 반복은 파일 재요청·JavaScript ended 재시작을 하지 않습니다. 서로 다른 곡 사이의 전체 반복 전환은 완전한 무간격 연결을 보장하지 않습니다.
bgms 설정의 speed0→1배속, loop ptr4=null→기본 반복 경로, 두 곡별 DSP bypass=true까지 데이터→파서→재생 호출을 연결해 확인했습니다. 정적 코드 근거와 설정 해석의 한계는 analysis/bgm-loop-audit/game-loop-evidence.md에 기록합니다. 게임의 Android 출력·DSP·실행 시 속도 및 채널 변화까지 동일하다는 뜻은 아닙니다. 게임 실행 녹음과 동등성 비교는 아직 수행하지 않았습니다.

검증: npm run check:music (저장 호환성·큐·셔플·반복·비동기 경합·샘플 무변형·WAV 경계), npm run build, npm run lint, migration/check.py.
실제 브라우저에서 ‘로컬 테스트 목록’ 생성, 2곡 추가 및 순서 변경, 즐겨찾기, 셔플, 반복 설정, 칭호 페이지 이동 중 재생, 새로고침 후 마지막 곡/3.2초 위치/목록/즐겨찾기/셔플/반복 복원을 확인했습니다. 이 예제 목록은 로컬 브라우저에 남겨 두었습니다. 공개 사이트는 변경하거나 배포하지 않았습니다.
