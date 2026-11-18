// Legacy smooth preference is retained for storage compatibility, but no longer alters audio.
export type Repeat = 'off'|'one'|'all'
// 'game': looping tracks repeat their game loop section forever (like in game). 'song': play once to the natural ending.
// Added after v1 records existed: missing/unknown values read as 'game', so stored records stay valid.
export type PlayMode = 'game'|'song'
export type Playlist = {id:string;name:string;tracks:string[]}
// trackId/favorites/playlists hold song ids. versions: chosen version key per song (missing → the song's default version).
export type Settings = {version:1;volume:number;repeat:Repeat;mode:PlayMode;shuffle:boolean;smooth:boolean;favorites:string[];playlists:Playlist[];active:string;trackId:string;position:number;versions:Record<string,string>}
// Catalog facts sanitize needs: old ids (merged names, former per-setting track ids) → song id, and valid version keys per song.
export type Catalog = {alias?:Record<string,string>;versions?:Record<string,string[]>}
export const storageKey='ovenbreak-music-settings-v1'
export function defaults(ids:string[]):Settings{return {version:1,volume:.5,repeat:'off',mode:'game',shuffle:false,smooth:true,favorites:[],playlists:[],active:'all',trackId:ids[0]||'',position:0,versions:{}}}
export function sanitize(raw:unknown,ids:string[],catalog:Catalog={}):Settings{
 const d=defaults(ids);if(!raw||typeof raw!=='object'||(raw as Settings).version!==1)return d
 const r=raw as Settings,song=(x:unknown)=>typeof x==='string'?catalog.alias?.[x]??x:'',valid=(v:unknown)=>Array.isArray(v)?[...new Set(v.map(song).filter(x=>ids.includes(x)))]:[]
 // A record saved before songs were merged may point at a former per-setting track id: keep that choice as the song's version.
 const versions:Record<string,string>={};const keep=(id:string,key:unknown)=>{if(typeof key==='string'&&ids.includes(id)&&catalog.versions?.[id]?.includes(key))versions[id]=key}
 if(r.versions&&typeof r.versions==='object')for(const [id,key] of Object.entries(r.versions))keep(id,key)
 if(typeof r.trackId==='string'&&catalog.alias?.[r.trackId]&&!versions[catalog.alias[r.trackId]])keep(catalog.alias[r.trackId],r.trackId)
 const used=new Set<string>();d.playlists=Array.isArray(r.playlists)?r.playlists.filter(p=>p&&typeof p.id==='string'&&p.id.startsWith('list-')&&!used.has(p.id)&&!!used.add(p.id)&&typeof p.name==='string').slice(0,100).map(p=>({id:p.id,name:p.name.trim().slice(0,60)||'내 재생목록',tracks:valid(p.tracks)})):[]
 return {...d,volume:Number.isFinite(r.volume)?Math.max(0,Math.min(1,r.volume)):d.volume,repeat:['off','one','all'].includes(r.repeat)?r.repeat:d.repeat,mode:r.mode==='song'?'song':'game',shuffle:r.shuffle===true,smooth:r.smooth!==false,favorites:valid(r.favorites),active:['all','favorites',...d.playlists.map(p=>p.id)].includes(r.active)?r.active:'all',trackId:ids.includes(song(r.trackId))?song(r.trackId):d.trackId,position:Number.isFinite(r.position)?Math.max(0,r.position):0,versions}
}
export function queueFor(s:Settings,ids:string[]){return s.active==='all'?ids:s.active==='favorites'?s.favorites:s.playlists.find(p=>p.id===s.active)?.tracks||[]}
export function shuffled(ids:string[],random= Math.random){const a=[...ids];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
// No repeats in a shuffle cycle. A new cycle avoids immediately repeating the last track.
export function nextCycle(ids:string[],current:string,shuffle:boolean,random=Math.random){const a=shuffle?shuffled(ids,random):[...ids];if(shuffle&&a.length>1&&a[0]===current)[a[0],a[1]]=[a[1],a[0]];return a}
export function takeNext(q:string[],current:string,shuffle:boolean,repeat:Repeat,remaining:string[],started:boolean,random=Math.random):{next:string|undefined;remaining:string[];started:boolean}{
 if(!q.length)return {next:undefined,remaining:[],started:false}
 if(!shuffle){const index=q.indexOf(current);return {next:q[index+1]||(repeat==='all'?q[0]:undefined),remaining:[],started:false}}
 let bag=remaining.filter(id=>q.includes(id))
 if(!started)bag=nextCycle(q,current,true,random).filter(id=>id!==current)
 else if(!bag.length&&repeat==='all')bag=nextCycle(q,current,true,random)
 return {next:bag[0],remaining:bag.slice(1),started:true}
}
// Switching play mode keeps the musical moment. The first pass [0,end) is sample-identical in both layouts;
// later game-loop cycles fold back by whole periods; the song ending maps to the loop start.
export function mapPosition(at:number,to:PlayMode,end:number,loop:{start:number;end:number}){
 const period=loop.end-loop.start
 if(to==='song'){let x=at;if(x>=end&&period>0)x-=Math.ceil((x-end+1e-9)/period)*period;return Math.max(0,x)}
 return at>=end?loop.start:at
}
export const clock=(n:number)=>Number.isFinite(n)?`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`:'0:00'
