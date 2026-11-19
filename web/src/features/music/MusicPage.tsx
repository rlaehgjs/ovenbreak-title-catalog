import { useState } from 'react'
// Per-viewer page size for the song list (separate from the saved music settings key).
const PAGE_KEY='ovenbreak-music-page-size-v1',PAGE_SIZES=[10,30,50]
// Song kinds (web/scripts/bgm-category.mjs); '기타·미분류' = not certain
const CATEGORIES=['맵','컷신·스토리','로비','이벤트','쿠키 스킬','UI','기타·미분류']
const savedPageSize=()=>{try{const n=Number(localStorage.getItem(PAGE_KEY));return PAGE_SIZES.includes(n)?n:30}catch{return 30}}
import { findSong, songs, trackLength, useAudio, versionOf, type Song } from './AudioProvider'
import { clock } from './model'
import { VersionDialog } from './VersionDialog'
import { SpeedPicker } from './SpeedPicker'
export default function MusicPage(){
 const p=useAudio(),[name,setName]=useState(''),[query,setQuery]=useState(''),[destination,setDestination]=useState(''),[versions,setVersions]=useState<Song|null>(null)
 const active=p.settings.playlists.find(list=>list.id===p.settings.active)
 const target=p.settings.playlists.some(list=>list.id===destination)?destination:p.settings.playlists[0]?.id||''
 const [pageSize,setPageSizeState]=useState(savedPageSize),[page,setPage]=useState(1),[category,setCategory]=useState('')
 const setPageSize=(n:number)=>{setPageSizeState(n);setPage(1);try{localStorage.setItem(PAGE_KEY,String(n))}catch{/* per-viewer convenience only */}}
 const q=query.toLowerCase(),matches=(s:Song)=>[s.title,...s.names].some(n=>n.toLowerCase().includes(q))
 // The list shows the playlist being listened to (all songs / favorites / a playlist), in its play order, narrowed by search.
 const listName=p.settings.active==='all'?'전체 곡':p.settings.active==='favorites'?'즐겨찾기':active?.name||'재생목록'
 const listed=p.queue.map((id,index)=>({song:findSong(id)!,index})).filter(x=>x.song&&matches(x.song)&&(!category||x.song.category===category))
 const pages=Math.max(1,Math.ceil(listed.length/pageSize)),current=Math.min(page,pages),shown=listed.slice((current-1)*pageSize,current*pageSize)
 const inList=p.queue.map(id=>findSong(id)).filter((s):s is Song=>!!s),countOf=(c:string)=>inList.filter(s=>s.category===c).length
 const playingAt=listed.findIndex(x=>x.song.id===p.song.id)
 return <section className="feature-page"><div className="eyebrow">OVENBREAK SOUND ARCHIVE</div><h1>BGM 라이브러리</h1><p className="lead">좋아하는 음악을 모아, 어디서든 이어 들으세요.</p><p>현재 {songs.length}곡을 들을 수 있습니다. 게임에서 같은 곡을 다른 속도로 쓰면 속도 버튼으로, 반복 구간·효과가 다르면 ‘버전’에서 골라 들을 수 있습니다(빠른 속도는 게임처럼 음 높이는 그대로 템포만 빨라집니다). 새로고침하면 마지막 곡·위치를 복원하고 재생 버튼을 기다립니다.</p>
 <section className="music-settings" aria-label="재생목록 관리"><label>듣고 있는 목록<select aria-label="재생목록 선택" value={p.settings.active} onChange={e=>{p.setActive(e.target.value);setPage(1)}}><option value="all">전체 곡</option><option value="favorites">즐겨찾기 ({p.settings.favorites.length})</option>{p.settings.playlists.map(list=><option value={list.id} key={list.id}>{list.name} ({list.tracks.length})</option>)}</select></label><form onSubmit={e=>{e.preventDefault();if(name.trim()){p.createPlaylist(name);setName('')}}}><input aria-label="재생목록 이름" maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="새 재생목록 이름"/><button disabled={!name.trim()}>목록 만들기</button>{active&&<button type="button" disabled={!name.trim()} onClick={()=>{p.renamePlaylist(active.id,name);setName('')}}>현재 목록 이름 변경</button>}</form>{active&&<button onClick={()=>p.deletePlaylist(active.id)}>현재 목록 삭제</button>}<p>재생 방식: ‘BGM 모드’는 게임과 같은 반복 구간을 끊김 없이 계속 반복하고(다음 곡으로 넘어가지 않음), ‘일반 모드’는 반복 없이 곡이 끝나는 곳까지 듣고 다음 곡으로 넘어갑니다. 반복 없이 한 번만 나오는 곡은 두 방식이 같습니다.</p></section>
 <div className="library-tools"><select aria-label="분류" value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">모든 분류 ({inList.length})</option>{CATEGORIES.map(c=><option value={c} key={c}>{c} ({countOf(c)})</option>)}</select><input aria-label="음악 검색" placeholder="음악 이름 검색" value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}}/><select aria-label="곡을 추가할 목록" value={target} disabled={!target} onChange={e=>setDestination(e.target.value)}>{!target&&<option value="">먼저 재생목록을 만들어 주세요</option>}{p.settings.playlists.map(list=><option value={list.id} key={list.id}>{list.name}</option>)}</select></div>
 <div className="list-head"><h2>{listName} <small>{category?`${category} · `:''}{listed.length}곡{q?` (검색 결과)`:''}</small></h2><label>한 페이지에<select aria-label="한 페이지에 보일 곡 수" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{PAGE_SIZES.map(n=><option value={n} key={n}>{n}곡</option>)}</select></label>{playingAt>=0&&<button type="button" onClick={()=>setPage(Math.floor(playingAt/pageSize)+1)}>재생 중인 곡으로</button>}</div>
 <p className="list-note">셔플을 켜면 한 바퀴 안에서 같은 곡을 중복 선택하지 않습니다. ‘전체 반복’은 이 목록을 반복합니다.</p>
 {!listed.length&&<p role="status">{q||category?'조건에 맞는 곡이 없습니다.':'빈 목록입니다. ‘전체 곡’에서 곡을 추가하거나 즐겨찾기를 표시해 주세요.'}</p>}
 <Pager page={current} pages={pages} onPage={setPage}/>
 <div className="track-list">{shown.map(({song,index:i})=>{const v=versionOf(song,p.settings),here=p.song.id===song.id,sameSpeed=song.versions.filter(x=>x.speed===v.speed).length
  return <article className={here?'track selected':'track'} key={song.id}><span className="track-number">{String(i+1).padStart(2,'0')}</span><div><h2>{song.title}</h2><span className="category-chip">{song.category}</span>
   <p>{clock(trackLength(v,p.settings.mode))} · {v.gameLoop?(p.settings.mode==='game'?'구간 반복':'끝까지'):'한 번 재생'} {here&&p.playing?'· 재생 중':''}</p>
   {v.unlisted&&<p className="track-note">{v.event?'현재 게임 설정에서 쓰지 않는 곡입니다(사운드 뱅크에만 있음).':'현재 게임 설정에 없는 예전 곡입니다. 게임 기본 설정(속도 1배, 곡 전체 반복, 효과 없음)으로 렌더했습니다(추정).'}</p>}{song.names.length>0&&<p className="track-note">다른 이름: {song.names.join(', ')}</p>}
   <SpeedPicker song={song}/>
   {sameSpeed>1&&<p className="track-note">버전: {v.summary}</p>}
   <div className="track-actions">{sameSpeed>1&&<button onClick={()=>setVersions(song)} aria-label={`${song.title} 버전 선택 (${sameSpeed}개)`}>버전 {sameSpeed}개 ▾</button>}<button aria-label={song.title+' 즐겨찾기'} aria-pressed={p.settings.favorites.includes(song.id)} onClick={()=>p.favorite(song.id)}>{p.settings.favorites.includes(song.id)?'★ 즐겨찾기':'☆ 즐겨찾기'}</button><button disabled={!target||p.settings.playlists.find(l=>l.id===target)?.tracks.includes(song.id)} onClick={()=>p.addToPlaylist(target,song.id)} aria-label={song.title+' 목록에 추가'}>목록에 추가</button>{active&&<><button aria-label={song.title+' 위로'} disabled={i===0} onClick={()=>p.move(active.id,song.id,-1)}>↑</button><button aria-label={song.title+' 아래로'} disabled={i===p.queue.length-1} onClick={()=>p.move(active.id,song.id,1)}>↓</button><button aria-label={song.title+' 목록에서 제거'} onClick={()=>p.removeFromPlaylist(active.id,song.id)}>제거</button></>}</div></div>
   <button onClick={()=>here&&p.queue.includes(song.id)?p.toggle():p.select(song.id)} aria-label={song.title+(here&&p.playing?' 일시정지':' 재생')}>{here&&p.playing?'일시정지':'재생'}</button></article>})}</div>
 <Pager page={current} pages={pages} onPage={p=>{setPage(p);document.querySelector('.list-head')?.scrollIntoView({block:'start'})}}/>
 <p>즐겨찾기·재생목록·음량·반복·셔플·곡별 버전·마지막 곡과 위치는 이 브라우저에만 저장됩니다. 칭호 보유 기록과는 별도로 관리됩니다.</p>
 <VersionDialog song={versions} onClose={()=>setVersions(null)}/></section>
}

// Page links: first, last, and up to 2 around the current page.
function Pager({page,pages,onPage}:{page:number;pages:number;onPage:(p:number)=>void}){
 if(pages<2)return null
 const nums=[...new Set([1,page-2,page-1,page,page+1,page+2,pages])].filter(n=>n>=1&&n<=pages).sort((a,b)=>a-b)
 return <nav className="pager" aria-label="곡 목록 페이지"><button disabled={page===1} onClick={()=>onPage(page-1)} aria-label="이전 페이지">‹</button>
  {nums.map((n,i)=><span key={n}>{i>0&&n-nums[i-1]>1&&<span className="pager-gap">…</span>}<button aria-current={n===page?'page':undefined} onClick={()=>onPage(n)}>{n}</button></span>)}
  <button disabled={page===pages} onClick={()=>onPage(page+1)} aria-label="다음 페이지">›</button></nav>
}
