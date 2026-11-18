import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import allTracks from './tracks.json'
import { BufferEngine } from './BufferEngine'
import { defaults, sanitize, storageKey, queueFor, takeNext, mapPosition, type Settings, type Repeat, type PlayMode } from './model'
// Full library audio lives outside the bundle (VITE_BGM_BASE). Without it only the bundled test tracks are listed.
const remoteBase=import.meta.env.VITE_BGM_BASE as string|undefined
const sampleRate=48000
// tracks.json lists songs; each song has one version per distinct game setting (speed, loop section, effects).
// endFrame/ending: "끝까지 재생" = render[0:endFrame] + ending file (loop-count-0 render remainder). Absent for one-shot versions.
type RawVersion={key:string;src:string;frames:number;loopStartFrame:number|null;loopEndFrame:number|null;loopExact?:boolean;bundled?:boolean;endFrame?:number;ending?:string;endingFrames?:number;summary:string;uses:string[];unlisted?:boolean;event?:boolean;speed?:number}
type RawSong={id:string;names?:string[];aliases?:string[];versions:RawVersion[]}
export type Track=Omit<RawVersion,'speed'>&{speed:number;songId:string;duration:number;songDuration:number;sampleRate:number;gameLoop:boolean}
export type Song={id:string;title:string;names:string[];versions:Track[]}
export const songs:Song[]=(allTracks as RawSong[]).map(s=>({id:s.id,title:s.id,names:s.names||[],versions:s.versions.filter(v=>remoteBase||v.bundled).map(v=>({...v,songId:s.id,duration:v.frames/sampleRate,songDuration:v.endFrame!==undefined?(v.endFrame+(v.endingFrames||0))/sampleRate:v.frames/sampleRate,sampleRate,gameLoop:v.loopEndFrame!==null,speed:v.speed??1}))})).filter(s=>s.versions.length)
const songById=new Map(songs.map(s=>[s.id,s]))
export const findSong=(id:string)=>songById.get(id)
const catalog={alias:Object.fromEntries((allTracks as RawSong[]).flatMap(s=>(s.aliases||[]).map(a=>[a,s.id]))),versions:Object.fromEntries(songs.map(s=>[s.id,s.versions.map(v=>v.key)]))}
export const audioBase=remoteBase||import.meta.env.BASE_URL+'audio/'
export const loopRange=(t:Track)=>t.loopStartFrame!==null&&t.loopEndFrame!==null?{start:t.loopStartFrame/t.sampleRate,end:t.loopEndFrame/t.sampleRate}:null
const songMode=(t:Track,mode:PlayMode)=>mode==='song'&&t.gameLoop&&t.endFrame!==undefined
const positionIn=(t:Track,at:number,to:PlayMode)=>t.gameLoop&&t.endFrame!==undefined?mapPosition(at,to,t.endFrame/t.sampleRate,loopRange(t)!):at
const ids=songs.map(s=>s.id)
// Length of what plays: game mode = intro + one loop cycle file, song mode = up to the natural ending.
export const trackLength=(t:Track,mode:PlayMode)=>songMode(t,mode)?t.songDuration:t.duration
// The chosen version of a song (missing or unknown choice → the default, versions[0]).
export const versionOf=(song:Song,s:Settings)=>song.versions.find(v=>v.key===s.versions[song.id])||song.versions[0]
// Game speed (tempo, same pitch) is a separate render per speed; the screen shows it as a speed option of one song.
export const speedsOf=(song:Song)=>[...new Set(song.versions.map(v=>v.speed))].sort((a,b)=>a-b)
export const versionAtSpeed=(song:Song,speed:number,current:Track)=>current.speed===speed?current:song.versions.find(v=>v.speed===speed)!
export const speedLabel=(speed:number)=>speed===1?'기본 속도':`${Number(speed.toFixed(3))}배`
function initial(){try{const raw=localStorage.getItem(storageKey);return {settings:raw?sanitize(JSON.parse(raw),ids,catalog):defaults(ids),warning:''}}catch{return {settings:defaults(ids),warning:'음악 설정을 읽지 못했습니다. 이 창에서는 사용할 수 있지만 저장 설정을 확인해 주세요.'}}}
function usePlayer(){
 const [loaded]=useState(initial),[settings,setSettings]=useState(loaded.settings),[warning,setWarning]=useState(loaded.warning)
 const saved=useRef(settings),[engine]=useState(()=>new BufferEngine()),[tick,setTick]=useState(0)
 const cycleStarted=useRef(false),order=useRef<string[]>([]),history=useRef<string[]>([]),forward=useRef<string[]>([]),lastSave=useRef(0),dirty=useRef(false)
 const end=useRef<()=>void>(()=>{})
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify(saved.current));setWarning('');dirty.current=false}catch{setWarning('음악 설정을 저장하지 못했습니다. 현재 창에서만 유지됩니다.')}}
 function change(patch:Partial<Settings>){saved.current={...saved.current,...patch};setSettings(saved.current);dirty.current=true;persist()}
 function position(){return engine.duration?engine.position():saved.current.position}
 function snapshot(){saved.current={...saved.current,position:position()};dirty.current=true;persist()}
 function queue(){return queueFor(saved.current,ids)}
 function current(){return versionOf(songById.get(saved.current.trackId)!,saved.current)}
 // Game mode: looping tracks never end (their section repeats). Otherwise repeat applies to the whole track.
 function isLoop(){return (saved.current.mode==='game'&&current().gameLoop)||saved.current.repeat==='one'||(saved.current.repeat==='all'&&queue().length===1&&queue()[0]===saved.current.trackId)}
 function resetOrder(){cycleStarted.current=false;order.current=[];forward.current=[]}
 async function start(at=saved.current.position){engine.setVolume(saved.current.volume);engine.setLoop(isLoop());const track=current(),song=songMode(track,saved.current.mode);const promise=engine.play(audioBase+track.src,at,song?null:loopRange(track),song?{at:track.endFrame!,url:track.ending?audioBase+track.ending:undefined}:null);setTick(t=>t+1);await promise;setTick(t=>t+1)}
 function pause(){engine.pause();snapshot();setTick(t=>t+1)}
 function go(id:string,remember=true){if(!ids.includes(id))return;if(remember&&id!==saved.current.trackId)history.current.push(saved.current.trackId);engine.pause();engine.duration=0;change({trackId:id,position:0});void start(0)}
 function advance(delta:number,automatic=false){
  const s=saved.current,q=queue();if(!q.length){pause();return}
  if(delta<0){const previous=history.current.pop();if(previous&&q.includes(previous)){forward.current.push(s.trackId);go(previous,false);return}const index=q.indexOf(s.trackId);const target=index>0?q[index-1]:s.repeat==='all'?q[q.length-1]:q[0];go(target,false);return}
  const future=forward.current.pop();if(future&&q.includes(future)){go(future);return}
  if(automatic&&isLoop()){void start(0);return}
  const result=takeNext(q,s.trackId,s.shuffle,s.repeat,order.current,cycleStarted.current)
  order.current=result.remaining;cycleStarted.current=result.started
  const next=result.next
  if(next)go(next);else pause()
 }
 end.current=()=>advance(1,true)
 useEffect(()=>{
  engine.onEnd=()=>end.current()
  const timer=window.setInterval(()=>{setTick(t=>t+1);if(engine.playing&&Date.now()-lastSave.current>4000){lastSave.current=Date.now();snapshot()}},250)
  const save=()=>{if(engine.playing||dirty.current)snapshot()}
  const visibility=()=>{if(document.visibilityState==='hidden')save()}
  window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',visibility)
  return ()=>{window.clearInterval(timer);window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',visibility);engine.close()}
 // The engine and saved settings refs outlive route components.
 },[engine])
 function setActive(active:string){pause();change({active});history.current=[];resetOrder();const q=queue();if(!q.includes(saved.current.trackId)){engine.duration=0;change({trackId:q[0]||saved.current.trackId,position:0})}}
 function updatePlaylist(id:string,list:string[]){change({playlists:saved.current.playlists.map(p=>p.id===id?{...p,tracks:list}:p)});resetOrder();engine.setLoop(isLoop())}
 void tick
 const song=songById.get(settings.trackId)!,track=versionOf(song,settings)
 // Choosing a version restarts the current song from the top in that version; other songs just remember the choice.
 function chooseVersion(id:string,key:string,play:boolean){
  const target=songById.get(id);if(!target?.versions.some(v=>v.key===key))return
  const isCurrent=id===saved.current.trackId,was=engine.playing||engine.loading
  change({versions:{...saved.current.versions,[id]:key}})
  if(play&&!isCurrent){if(!queue().includes(id))change({active:'all'});resetOrder();history.current=[];go(id,false);return}
  if(isCurrent){engine.pause();engine.duration=0;change({position:0});if(was||play)void start(0);else setTick(t=>t+1)}
 }
 return {settings,warning,song,track,playing:engine.playing,loading:engine.loading,error:engine.error,time:position(),duration:engine.duration||trackLength(track,settings.mode),queue:queue(),
 setVersion:(id:string,key:string)=>chooseVersion(id,key,false),playVersion:(id:string,key:string)=>chooseVersion(id,key,true),
 toggle:()=>{if(engine.playing||engine.loading)pause();else if(queue().length)void start()},select:(id:string)=>{if(!queue().includes(id))change({active:'all'});resetOrder();history.current=[];go(id,false)},step:(delta:number)=>advance(delta),
 seek:(value:number)=>{const v=Math.max(0,Math.min(value,engine.duration||trackLength(current(),saved.current.mode)));if(engine.duration)engine.seek(v);change({position:v});setTick(t=>t+1)},
 setVolume:(volume:number)=>{change({volume});engine.setVolume(volume)},setRepeat:(repeat:Repeat)=>{change({repeat});engine.setLoop(isLoop())},
 setMode:(mode:PlayMode)=>{if(mode===saved.current.mode)return;const was=engine.playing||engine.loading,at=positionIn(current(),position(),mode);engine.pause();engine.duration=0;change({mode,position:at});if(was)void start(at);else setTick(t=>t+1)},setShuffle:(shuffle:boolean)=>{change({shuffle});resetOrder()},setActive,
 favorite:(id:string)=>{const favorites=saved.current.favorites.includes(id)?saved.current.favorites.filter(x=>x!==id):[...saved.current.favorites,id];change({favorites});resetOrder();engine.setLoop(isLoop())},
 createPlaylist:(name:string)=>{const p={id:'list-'+crypto.randomUUID(),name:name.trim().slice(0,60)||'내 재생목록',tracks:[]};change({playlists:[...saved.current.playlists,p]});setActive(p.id)},
 renamePlaylist:(id:string,name:string)=>change({playlists:saved.current.playlists.map(p=>p.id===id?{...p,name:name.trim().slice(0,60)||p.name}:p)}),
 deletePlaylist:(id:string)=>{if(saved.current.active===id)setActive('all');change({playlists:saved.current.playlists.filter(p=>p.id!==id)})},
 addToPlaylist:(id:string,track:string)=>{const p=saved.current.playlists.find(p=>p.id===id);if(p&&!p.tracks.includes(track))updatePlaylist(id,[...p.tracks,track])},
 removeFromPlaylist:(id:string,track:string)=>{const p=saved.current.playlists.find(p=>p.id===id);if(p)updatePlaylist(id,p.tracks.filter(t=>t!==track))},
 move:(id:string,track:string,delta:number)=>{const p=saved.current.playlists.find(p=>p.id===id);if(!p)return;const list=[...p.tracks],index=list.indexOf(track),to=index+delta;if(index<0||to<0||to>=list.length)return;[list[index],list[to]]=[list[to],list[index]];updatePlaylist(id,list)},
 }
}
type Player=ReturnType<typeof usePlayer>
const Context=createContext<Player|null>(null)
export function useAudio(){const value=useContext(Context);if(!value)throw Error('Missing audio provider');return value}
export function AudioProvider({children}:{children:ReactNode}){const value=usePlayer();return <Context.Provider value={value}>{children}</Context.Provider>}
