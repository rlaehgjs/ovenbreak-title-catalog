import { useEffect, useId, useRef } from 'react'
import { trackLength, versionOf, useAudio, type Song } from './AudioProvider'
import { clock } from './model'
import { SpeedPicker } from './SpeedPicker'
// One song can be used by the game with different settings (speed, loop section, effects). The listener picks which one to hear;
// the choice is remembered per song and used by shuffle, playlists and repeat.
const shownUses=4
export function VersionDialog({song,onClose}:{song:Song|null;onClose:()=>void}){
 const p=useAudio(),ref=useRef<HTMLDialogElement>(null),titleId=useId()
 useEffect(()=>{const d=ref.current;if(!d)return;if(song&&!d.open)d.showModal();if(!song&&d.open)d.close()},[song])
 const chosenTrack=song?versionOf(song,p.settings):null,chosen=chosenTrack?.key||''
 const shown=song&&chosenTrack?song.versions.filter(v=>v.speed===chosenTrack.speed):[]
 return <dialog ref={ref} className="version-dialog" aria-labelledby={titleId} onClose={onClose} onClick={e=>{if(e.target===ref.current)onClose()}}>
  {song&&<div>
   <h2 id={titleId}>버전 선택 <small>{song.title}</small></h2>
   {song.names.length>0&&<p>다른 이름: {song.names.join(', ')} (같은 곡)</p>}
   <p>게임에서 이 곡을 쓰는 곳마다 속도·반복 구간·효과가 다를 수 있습니다. 속도는 위 버튼으로, 그 밖의 차이는 아래 목록에서 고릅니다. 고른 버전은 이 곡을 재생할 때마다 사용됩니다.</p>
   <SpeedPicker song={song}/>
   <ol className="version-list">{shown.map(v=>{const i=song.versions.indexOf(v);const current=v.key===chosen,playing=current&&p.track.key===v.key&&p.playing
    return <li key={v.key} className={current?'selected':''}>
     <strong>{i===0?'기본 · ':''}{v.summary}</strong>
     <p>{clock(trackLength(v,p.settings.mode))} · 게임에서 쓰는 곳: {v.uses.slice(0,shownUses).join(', ')}{v.uses.length>shownUses?` 외 ${v.uses.length-shownUses}곳`:''}</p>
     <div className="track-actions">
      <button aria-pressed={current} onClick={()=>p.setVersion(song.id,v.key)}>{current?'✓ 선택됨':'이 버전 선택'}</button>
      <button onClick={()=>p.playVersion(song.id,v.key)} aria-label={`${v.summary} 재생`}>{playing?'처음부터 재생':'재생'}</button>
     </div>
    </li>})}</ol>
   <button className="version-close" onClick={onClose}>닫기</button>
  </div>}
 </dialog>
}
