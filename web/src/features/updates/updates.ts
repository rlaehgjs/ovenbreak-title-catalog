import catalogReleases from '../../generated/releases.json'
// Update history shown on the home page and on #/updates.
// - Game updates: title additions come from the reviewed catalog's release history (scripts/sync-catalog.mjs → generated/releases.json);
//   BGM additions are written here when a device sync finds new songs.
// - Site updates: written by hand, newest first.

export type NoteSection={heading:string;items:string[]}
export type GameUpdate={version:string;date:string;subtitle?:string;sections:NoteSection[];titles:{name:string;number:number;condition:string}[];changedTitles:number;removedTitles:number;bgm:{id:string;note?:string}[];bgmNote?:string}
export type SiteUpdate={date:string;title:string;items:string[]}

// Official update notes, summarized by hand (keyed by game version). subtitle = one-line summary shown under the version.
const gameNotes:Record<string,{subtitle:string;sections:NoteSection[]}>={
 '14.412':{subtitle:'슬라이드맛 쿠키 등장, 모든 용감한 우리들에게! 2부',sections:[
  {heading:'새 쿠키·펫',items:[
   '슬라이드맛 쿠키: 항상 슬라이드 자세로 달리고, 슬라이드를 꾹 누르면 장애물을 부숨',
   '멈추지 마요 펫: 마요네즈 별젤리 생성',
  ]},
  {heading:'타이틀 이벤트',items:['모든 용감한 우리들에게! 2부 (11/13 09:00 ~ 11/27 08:00)']},
  {heading:'픽업',items:[
   '네온 키튼 보컬 슬라이드맛 쿠키 (슈퍼에픽 스킨, ~12/30)',
   '끝없이 슬라이드! 젤리 세트 (에픽, ~12/30)',
  ]},
  {heading:'밸런스·수정',items:['최신형 파프북: 데이터 숫자 젤리 점수 증가']},
  {heading:'예정·알려진 문제',items:[
   '11/27 마이쿠키 [초강력 전자석] 하향 예정',
   '어둠마녀 쿠키 이어달리기 시 종료 문제 (임시로 길드전 사용 제한)',
  ]},
  {heading:'기타',items:['젬 교환소: 스위트 아카이브 코드 센터 맵 메이커 테마 추가']},
 ]},
}

// New songs found by device sync (analysis/device-sync), keyed by game version.
const gameBgm:Record<string,{songs:{id:string;note?:string}[];note:string}>={
 '14.412':{note:'10월 말에 받은 음악 데이터와 비교해 새로 확인된 곡입니다.',songs:[
  {id:'bgm_cutscene_land02_mysterious'},
  {id:'bgm_sweet_archive_square_1113',note:'bgm_trial_bravelord와 같은 음악 (BGM 라이브러리에서는 그 곡의 버전으로 들을 수 있어요)'},
 ]},
}

export const gameUpdates:GameUpdate[]=catalogReleases.releases.map(r=>({version:r.version,date:r.date,subtitle:gameNotes[r.version]?.subtitle,sections:gameNotes[r.version]?.sections||[],titles:r.added,changedTitles:r.changed,removedTitles:r.removed,bgm:gameBgm[r.version]?.songs||[],bgmNote:gameBgm[r.version]?.note}))

export const siteUpdates:SiteUpdate[]=[
 {date:'2026-11-19',title:'정보 허브 다듬기',items:[
  '홈 화면에 업데이트 내역을 추가했어요.',
  '쿠폰 입력: 계정을 최대 30개까지 저장할 수 있고, 처음 쓰는 분을 위한 따라 하기 안내를 넣었어요.',
  'BGM 플레이어: 휴대폰에서 더 작게 보이도록 줄이고, 재생 방식 이름을 ‘BGM 모드 / 일반 모드’로 바꿨어요.',
  '음악 하루 제공량이 다 찼을 때 안내 문구가 나와요.',
  '새 아이콘으로 바꾸고, 개인정보처리방침과 이용약관을 추가했어요.',
 ]},
 {date:'2026-11-19',title:'오븐브레이크 정보 허브 공개',items:[
  '칭호 도감을 정보 허브로 옮겼어요. 기존 보유 기록은 그대로 이어져요.',
  'BGM 라이브러리: 게임 음악 1,037곡을 게임과 같은 소리·반복 구간으로 들을 수 있어요. 속도 버튼과 버전 선택도 있어요.',
  '쿠폰 입력: 계정 ID와 쿠폰을 모아 두고 공식 쿠폰 페이지에서 차례로 등록할 수 있어요.',
 ]},
 {date:'2026-11-16',title:'칭호 도감 14.412 반영',items:[
  '14.412 버전 데이터로 칭호 도감을 갱신했어요.',
  '버전별 추가 칭호 기록과 새 버전 표시, 도움말과 칭호 바로가기를 추가했어요.',
 ]},
 {date:'2026-11-15',title:'칭호 도감 데이터 갱신',items:['칭호 목록과 획득 조건을 최신 내용으로 고쳤어요.']},
 {date:'2026-11-09',title:'칭호 도감 공개',items:[
  '칭호 도감을 처음 공개했어요. 보유한 칭호를 표시하면 이 브라우저에 저장돼요.',
  '페이지당 표시 개수 선택, 최신순 정렬, 칭호 이미지의 특수 문자 표시 등을 다듬었어요.',
 ]},
]

export const latestGame=gameUpdates[0]
export const latestSite=siteUpdates[0]
