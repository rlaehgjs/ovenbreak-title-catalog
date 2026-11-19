// FMOD 전체 렌더 manifest(analysis/bgm-render/out/manifest.json) → src/features/music/tracks.json
//
// tracks.json = 곡(song) 목록. 곡 하나 = 같은 음악(같은 MIDI 파일, 또는 음표가 같은 MIDI)이고, 게임에서 쓰는 설정마다 버전(version)이 있습니다.
// - 곡 id: 기본 버전의 MIDI 이름(기존 대표 트랙 id). 합쳐진 다른 이름과 예전 '@' 변형 id는 aliases (저장된 즐겨찾기·재생목록 호환)
// - 기본 버전(versions[0]): 속도 1배 > 곡 전체 반복 > 게임 'default' 행을 쓰는 대표 설정 > id 순
// - 렌더 결과(PCM)가 완전히 같은 버전은 하나로 합치고, 쓰는 곳(uses)만 모읍니다.
// - 음원: 기본 빌드에는 테스트 3곡만 넣고(public/audio), 나머지는 VITE_BGM_BASE(외부 저장소, 개발용 /bgm-local/)에서 받습니다.
// - '끝까지 재생'용 끝부분(out/endings.json, out/flac/ending/*.flac): 재생 = 본 파일[0:endFrame] + ending 파일
//   (반복 0회 렌더와 샘플 단위로 같음, render_endings.py에서 검증)
// 사용법: node scripts/build-tracks.mjs [manifest 경로]
import {categoryOf} from './bgm-category.mjs'
import {copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(process.argv[2] || join(web, '../analysis/bgm-render/out/manifest.json'))
const out = dirname(manifestPath)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const bundled = new Set(['bgm_bonus_ovenbreak_01', 'bgm_bonus_ovenbreak_02', 'bgm_bonus_ovenbreak_03'])
const read = (name, fallback) => existsSync(join(out, name)) ? JSON.parse(readFileSync(join(out, name), 'utf8')) : fallback
const endings = new Map(read('endings.json', {tracks: []}).tracks.map(e => [e.id, e]))
for (const e of endings.values()) if (e.error) throw Error(`ending render failed for ${e.id}`)
const dupes = read('midi-dupes.json', {same_file: [], same_notes_different_file: []})
if (manifest.sampleRate !== 48000) throw Error('expected 48 kHz renders')

// 같은 음악 묶기: MIDI 파일 이름 → 묶음 키
const group = new Map()
for (const g of [...dupes.same_file, ...dupes.same_notes_different_file.map(x => x.tracks)])
  for (const name of g) group.set(`${name}.mid`, [...g].sort()[0])

const sec = ms => (ms / 1000).toFixed(1).replace(/\.0$/, '')
const loopText = t => t.loopEndFrame === null ? '반복 없음' : t.settings.loop_start_ms === null ? '곡 전체 반복' : `${sec(t.fmod.loop_points_ms[0])}~${sec(t.fmod.loop_points_ms[1])}초 반복`
// FMOD Studio 이벤트 곡(녹음 음원 스트림, render_events.py): 속도·DSP 설정 없이 이벤트 자체의 반복을 따름
const eventLoopText = t => t.loopEndFrame === null ? '반복 없음' : t.loopStartFrame === 0 ? '곡 전체 반복' : `${(t.loopStartFrame / 48000).toFixed(1)}초부터 반복`
const summary = t => t.extra ? `${summaryOf(baseById.get(t.base))} · ${t.label} (환경음은 ${(t.period / 48000 / 60).toFixed(1)}분마다 같은 패턴)` : summaryOf(t)
const eventVariant = t => ({color: ' · 컬러', gray: ' · 흑백'})[t.id.replace(/@event$/, '').slice(t.midi.replace(/\.(mid|event)$/, '').length + 1)] || ''
const summaryOf = t => t.event ? `녹음 음원 (FMOD Studio 이벤트)${eventVariant(t)} · ${eventLoopText(t)}${t.loopExact === false ? ' (근사)' : ''}` : [`속도 ${t.fmod.speed}배`, loopText(t), `리버브 ${t.settings.reverb_bypass ? '끔' : '켬'}`, `컴프레서 ${t.settings.compressor_bypass ? '끔' : '켬'}`].join(' · ')

function ending(t) {
  if (t.loopEndFrame === null) return {}
  const e = endings.get(t.id)
  if (!e) { if (endings.size) throw Error(`missing ending for ${t.id}`); return {} }
  if (!(e.endFrame > 0 && e.endFrame <= t.frames)) throw Error(`bad end frame for ${t.id}`)
  return {endFrame: e.endFrame, ...(e.endingFile ? {ending: `ending/${e.endingFile}?v=${e.endingSha256.slice(0, 12)}`, endingFrames: e.endingFrames} : {})}
}
// 현재 bgms에 없는 예전 곡: 쓰는 곳이 없고, 게임 기본 경로 설정(속도 1, 곡 전체 반복, 효과 없음)으로 렌더한 추정치
const usesOf = t => t.extra ? t.uses : t.unlisted ? [t.event ? '현재 게임 설정에 없음 (뱅크에만 있는 이벤트)' : '현재 게임 설정에 없음 (예전 곡 · 기본 설정으로 렌더, 추정)'] : t.rows.map(r => r.group === '*' ? r.context : r.context && r.context !== 'default' ? `${r.group} · ${r.context}` : r.group)
function version(t) {
  if (t.loopEndFrame !== null && !(t.loopStartFrame >= 0 && t.loopStartFrame < t.loopEndFrame && t.loopEndFrame === t.frames))
    throw Error(`bad loop range for ${t.id}`)
  return {
    key: t.id, src: `${t.file}?v=${t.pcmSha256.slice(0, 12)}`, frames: t.frames,
    loopStartFrame: t.loopStartFrame, loopEndFrame: t.loopEndFrame,
    ...(t.loopEndFrame !== null && t.loopExact === false ? {loopExact: false} : {}),
    ...(bundled.has(t.id) ? {bundled: true} : {}), ...(t.unlisted ? {unlisted: true} : {}), ...(t.event ? {event: true} : {}), ...ending(t),
    ...(speedOf(t) !== 1 ? {speed: speedOf(t)} : {}),
    summary: summary(t), uses: usesOf(t),
  }
}
const speedOf = t => t.event || !t.fmod ? 1 : t.fmod.speed
// 설정은 다르지만 실제 소리가 사실상 같은 버전(analysis/bgm-render/near-identical.json, 차이 -40dB 미만): 대표 버전에 합침
const nearSame = new Map(read('../near-identical.json', {versions: []}).versions.map(v => [v.key, v.into]))
const rank = t => t.extra ? [0, 0, 2.5] : t.event ? [0, 0, 3] : [t.fmod.speed === 1 ? 0 : 1, t.settings.loop_start_ms === null ? 0 : 1, t.primary && t.rows.some(r => r.context === 'default') ? 0 : t.primary ? 1 : 2]
const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return a.id.localeCompare(b.id) }

// 이벤트 곡: 같은 이름의 MIDI 곡이 있으면 그 곡의 버전(1005 맵 1~4번처럼 MIDI판·녹음판), _color/_gray는 기본 이름의 곡으로
// 렌더에 실패한 이벤트(반복 구조 미해결)는 목록에서 빼고 알림
const allEvents = read('events.json', {tracks: []}).tracks, events = allEvents.filter(e => !e.error)
if (allEvents.length > events.length) console.warn(`skipped ${allEvents.length - events.length} failed event renders: ${allEvents.filter(e => e.error).map(e => e.id).join(', ')}`)
const midiNames = new Set(manifest.tracks.map(t => t.midi))
const eventTracks = events.map(e => {
  const name = e.id.replace(/@event$/, ''), base = name.replace(/_(color|gray)$/, '')
  const midi = midiNames.has(`${name}.mid`) ? `${name}.mid` : midiNames.has(`${base}.mid`) ? `${base}.mid` : `${name}.event`
  if (e.endFrame !== undefined) endings.set(e.id, e)
  return {...e, event: true, midi, primary: false}
})
// BGM + 환경음 합성 버전(render_ambience_mix.py): 기본 곡의 설정을 이어받고 요약에 환경음 표시, 끝까지 재생은 기본 곡의 끝부분 사용
const baseById = new Map(manifest.tracks.map(t => [t.id, t]))
const extraTracks = read('extras.json', {tracks: []}).tracks.map(e => {
  const base = baseById.get(e.base); if (!base) throw Error(`extra base missing ${e.base}`)
  endings.set(e.id, e)
  return {...base, ...e, primary: false, extra: true, unlisted: false, loopExact: true}
})
const bySong = new Map()
for (const t of [...manifest.tracks, ...eventTracks, ...extraTracks]) {
  const k = group.get(t.midi) || t.midi
  bySong.set(k, [...(bySong.get(k) || []), t])
}
const songs = []
for (const list of bySong.values()) {
  list.sort(cmp)
  const versions = [], byPcm = new Map()
  for (const t of list) {
    const same = byPcm.get(t.pcmSha256)  // 렌더 결과가 완전히 같으면 한 버전으로 (키는 aliases로 찾음)
    if (same) { same.uses = [...new Set([...same.uses, ...usesOf(t)])]; continue }
    const into = nearSame.has(t.id) && versions.find(v => v.key === nearSame.get(t.id))
    if (nearSame.has(t.id) && !into) throw Error(`near-identical target missing for ${t.id}`)
    if (into) { into.uses = [...new Set([...into.uses, ...usesOf(t)])]; continue }
    const v = version(t); byPcm.set(t.pcmSha256, v); versions.push(v)
  }
  // 요약이 같은 버전(효과 세부값·악기별 음량만 다름)은 구분 표시
  const seenSummary = new Map()
  for (const v of versions) {
    const n = (seenSummary.get(v.summary) || 0) + 1; seenSummary.set(v.summary, n)
    if (n > 1) v.summary += ` · 세부 효과/악기 음량 다름 (${n})`
  }
  const id = list[0].id.split('@')[0]
  const names = [...new Set(list.map(t => t.id.split('@')[0]))].filter(n => n !== id)
  const aliases = list.map(t => t.id).filter(x => x !== id)
  const song = {id, ...(names.length ? {names} : {}), ...(aliases.length ? {aliases} : {}), versions}
  songs.push({...song, category: categoryOf(song).category})
}
songs.sort((a, b) => (!!b.versions[0].bundled - !!a.versions[0].bundled) || a.id.localeCompare(b.id))
const ids = new Set(), keys = new Set()
for (const s of songs) {
  if (ids.has(s.id)) throw Error(`duplicate song id ${s.id}`); ids.add(s.id)
  for (const v of s.versions) { if (keys.has(v.key)) throw Error(`duplicate version ${v.key}`); keys.add(v.key) }
}
for (const s of songs) for (const a of s.aliases || []) if (ids.has(a)) throw Error(`alias ${a} collides with a song id`)
for (const id of bundled) if (!songs.some(s => s.id === id && s.versions.length === 1 && s.versions[0].bundled)) throw Error(`bundled song ${id} must be a single bundled version`)

mkdirSync(join(web, 'public/audio/ending'), {recursive: true})
for (const v of songs.flatMap(s => s.versions).filter(v => v.bundled))
  for (const f of [v.src, v.ending].filter(Boolean).map(x => x.split('?')[0]))
    copyFileSync(join(out, 'flac', f), join(web, 'public/audio', f))
writeFileSync(join(web, 'src/features/music/tracks.json'), JSON.stringify(songs) + '\n')
const versions = songs.flatMap(s => s.versions)
console.log(`tracks.json: ${songs.length} songs, ${versions.length} versions (${songs.filter(s => s.versions.length > 1).length} songs with several), ` +
  `${manifest.tracks.length + eventTracks.length + extraTracks.length - versions.length} identical renders merged, ${songs.filter(s => s.names).length} songs with other names, ${versions.filter(v => v.unlisted).length} unlisted, ${eventTracks.length} event renders, ${extraTracks.length} ambience mixes, ${versions.filter(v => v.endFrame !== undefined).length} with endings`)
