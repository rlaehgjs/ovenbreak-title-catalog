import { speedLabel, speedsOf, useAudio, versionAtSpeed, versionOf, type Song } from './AudioProvider'
// Speed option of one song: each speed is the game's own render (tempo changes, pitch stays), chosen like a version.
export function SpeedPicker({song}:{song:Song}){
 const p=useAudio(),speeds=speedsOf(song)
 if(speeds.length<2)return null
 const current=versionOf(song,p.settings)
 return <div className="speed-picker" role="group" aria-label={`${song.title} 재생 속도`}>{speeds.map(s=>{const v=versionAtSpeed(song,s,current)
  return <button key={s} aria-pressed={current.speed===s} title={`게임에서 쓰는 곳: ${v.uses.slice(0,3).join(', ')}${v.uses.length>3?' 외':''}`} onClick={()=>{if(current.speed!==s)p.setVersion(song.id,v.key)}}>{speedLabel(s)}</button>})}</div>
}
