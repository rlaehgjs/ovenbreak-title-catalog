import { useState } from 'react'
import { Link } from 'react-router'
import { useAudio, type Song } from './AudioProvider'
import { clock, type PlayMode, type Repeat } from './model'
import { VersionDialog } from './VersionDialog'
export { clock }
// Compact global player. Buttons use short labels (full meaning in aria-label/title) so it stays small on phones.
export function MiniPlayer(){const p=useAudio(),[versions,setVersions]=useState<Song|null>(null),busy=p.playing||p.loading
 return <aside className="music-dock player-dock" aria-label="전역 BGM 플레이어">
  <div className="player-info"><strong>{p.song.title}</strong>{p.song.versions.length>1&&<button className="version-chip" onClick={()=>setVersions(p.song)} aria-label={`버전 선택: ${p.track.summary}`} title={p.track.summary}><span>{p.track.summary}</span> ▾</button>}<p role="status">{p.error||p.warning||(p.loading?'불러오는 중…':p.playing?'재생 중':'일시정지')}</p></div>
  <div className="player-controls">
   <button onClick={()=>p.step(-1)} aria-label="이전 곡" title="이전 곡" disabled={!p.queue.length}>{'⏮︎'}</button>
   <button className="player-main" disabled={!p.queue.length&&!busy} onClick={p.toggle} aria-label={busy?'일시정지':'재생'} title={busy?'일시정지':'재생'}>{busy?'⏸︎':'▶︎'}</button>
   <button onClick={()=>p.step(1)} aria-label="다음 곡" title="다음 곡" disabled={!p.queue.length}>{'⏭︎'}</button>
   <button aria-pressed={p.settings.shuffle} aria-label="셔플" title={`셔플 ${p.settings.shuffle?'켜짐':'꺼짐'}`} onClick={()=>p.setShuffle(!p.settings.shuffle)}>셔플</button>
   <select aria-label="재생 방식" title="BGM 모드: 게임처럼 반복 구간을 끊김 없이 계속 반복 / 일반 모드: 반복 없이 곡 끝까지 듣고 다음 곡" value={p.settings.mode} onChange={e=>p.setMode(e.target.value as PlayMode)}><option value="game">BGM 모드</option><option value="song">일반 모드</option></select>
   <select aria-label="반복 모드" value={p.settings.repeat} onChange={e=>p.setRepeat(e.target.value as Repeat)}><option value="off">반복 끔</option><option value="one">한 곡 반복</option><option value="all">전체 반복</option></select>
  </div>
  <div className="player-seek"><span>{clock(p.time)} / {clock(p.duration)}</span><input type="range" aria-label="재생 위치" min="0" max={p.duration} step="0.1" value={Math.min(p.time,p.duration)} onChange={e=>p.seek(Number(e.target.value))}/><label className="player-volume">음량 <input type="range" aria-label="음량" min="0" max="1" step="0.01" value={p.settings.volume} onChange={e=>p.setVolume(Number(e.target.value))}/></label></div>
  <Link className="player-library" to="/music">라이브러리 ↗</Link><VersionDialog song={versions} onClose={()=>setVersions(null)}/>
 </aside>}
