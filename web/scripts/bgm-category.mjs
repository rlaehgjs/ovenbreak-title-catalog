// BGM category (2026-11-19, user decision): 맵 / 컷신·스토리 / 로비 / 이벤트 / 쿠키 스킬 / UI / 기타·미분류.
// - 맵: map, trial(쿠키 트레이닝 맵), bonustime·bonus, theme 곡 중 트레이닝 맵에 쓰이는 것
// - 컷신·스토리: cutscene, chronicle, storyMode
// - 로비: lobby, lobbyskin, 게임 모드(길드·팀전·서바이벌·레이드 등)
// - 이벤트: event, limitedevent, milestone, minigame·arcade
// - 쿠키 스킬: …_skill
// - UI: ui, shop, gacha, jingle, tutorial, preview, result
// - 기타·미분류: 위 규칙으로 확실하지 않은 곡
// Order: the song id (developer naming) first; if the id says nothing, where the game uses it (bgms groups), when every use agrees.
export const CATEGORIES = ['맵', '컷신·스토리', '로비', '이벤트', '쿠키 스킬', 'UI', '기타·미분류']
const OTHER = '기타·미분류'

const byId = [
  [/^(cutscene|custcene|chronicle|storymode)/, '컷신·스토리'],
  [/^theme_brixity/, '컷신·스토리'],
  [/^theme_neo_sugarteara/, '이벤트'],
  [/^theme_(martial_tournament|starfruit_calm)/, OTHER],
  [/(^|_)skill(\d|_|$)/, '쿠키 스킬'],
  // map BGM named by episode/stage (also reused in cutscenes, but the map is the origin)
  [/^(ovenbreak\d+_tm\d|original_episode|memories\d+_stage)/, '맵'],
  [/^mycookie_/, 'UI'],
  [/^(map|trial|bonustime|bonus|training|theme)(_|-|\d|$)/, '맵'],
  [/^(lobbyskin|lobby|innerlobby|guild|teamfight|tofw|survivalrun|raidrun|battlerun|customrun|dual_run|explore_raid)(_|-|\d|$)/i, '로비'],
  [/^(event|limitedevent|milestone|minigame|arcade|circus_minigame|circusevent)(_|-|\d|$)/, '이벤트'],
  [/^(ui|shop|gacha|jingle|tutorial|preview|randomrun_result|result)(_|-|\d|$)/, 'UI'],
]

// Uses: '<group> · <context>' or '<group>' or a bare context like 'cookie0175skill'
const byUse = u => {
  const g = u.split(' · ')[0].replace(/^bgm_/i, '').toLowerCase()
  if (/^cookie\d+skill$/.test(g)) return '쿠키 스킬'
  if (/^jukebox/.test(g)) return null // jukebox can pick any song: says nothing about the kind
  if (/^(map|bonustime|stealrun|infinitejump)/.test(g)) return '맵'
  if (/^(cutscene|storymode|chronicle|anniversary_cutscene)/.test(g)) return '컷신·스토리'
  if (/^(lobby|lobbyskin|guild|teamfight|tofw|raid|survival)/.test(g)) return '로비'
  if (/^(event|milestone|arcade|limitedevent|seasonal|prescriptionevent|wish|roomescape|dressup|find|cookieroid|mapmaker|pillowfight|mini|gachabox|sandwichevent|vote|fashionevent|tycoonevent|cellvisualnovel|timesquareevent|silhouetteevent|glassmaze|kingdomeventbattle|quizevent|ui_quizevent)/.test(g)) return '이벤트'
  if (/^(ui|shop|gacha|skingacha|jingle|tutorial|preview|schedule)/.test(g)) return 'UI'
  return null
}

export function categoryOf(song) {
  const id = song.id.replace(/^bgm_/i, '').toLowerCase()
  for (const [re, cat] of byId) if (re.test(id)) return {category: cat, by: 'id'}
  const cats = new Set(song.versions.flatMap(v => v.uses).map(byUse).filter(Boolean))
  if (cats.size === 1) return {category: [...cats][0], by: 'uses'}
  return {category: OTHER, by: cats.size ? 'mixed' : 'none'}
}
