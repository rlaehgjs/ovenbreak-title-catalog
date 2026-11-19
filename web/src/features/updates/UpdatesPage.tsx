import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { gameUpdates, latestGame, latestSite, siteUpdates, type GameUpdate, type SiteUpdate } from './updates'

const gameCounts=(u:GameUpdate)=>[u.titles.length?`칭호 ${u.titles.length}개`:'',u.bgm.length?`BGM ${u.bgm.length}곡`:''].filter(Boolean).join(' · ')||'추가 없음'

// Home page middle section: the latest game and site update in short; the cards open the full history.
export function UpdateSummary(){
 const titles=latestGame.titles.map(t=>`칭호 ‘${t.name}’`),songs=latestGame.bgm.map(b=>`BGM ${b.id}`)
 // show both kinds in the short list: up to 2 titles, then songs, then the rest
 const gameNames=[...titles.slice(0,songs.length?2:3),...songs.slice(0,1),...titles.slice(songs.length?2:3),...songs.slice(1)]
 return <section aria-labelledby="updates-title">
  <div className="section-heading"><h2 id="updates-title">업데이트 내역</h2><Link className="text-link" to="/updates">전체 보기 →</Link></div>
  <div className="update-grid">
   <Link className="update-card" to="/updates?show=game">
    <span className="tag">게임 업데이트</span>
    <h3>{latestGame.version} <small>{latestGame.date}</small></h3>
    {latestGame.subtitle&&<p className="update-subtitle">{latestGame.subtitle}</p>}
    <p className="update-count">{gameCounts(latestGame)} 추가</p>
    <ul>{gameNames.slice(0,3).map(n=><li key={n}>{n}</li>)}{gameNames.length>3&&<li>외 {gameNames.length-3}개</li>}</ul>
    <span className="update-more">상세 내역과 이전 버전 보기 →</span>
   </Link>
   <Link className="update-card" to="/updates?show=site">
    <span className="tag">사이트 업데이트</span>
    <h3>{latestSite.title} <small>{latestSite.date}</small></h3>
    <ul>{latestSite.items.slice(0,3).map(i=><li key={i}>{i}</li>)}{latestSite.items.length>3&&<li>외 {latestSite.items.length-3}가지</li>}</ul>
    <span className="update-more">상세 내역과 이전 업데이트 보기 →</span>
   </Link>
  </div>
 </section>
}

function GameEntry({u,open}:{u:GameUpdate;open:boolean}){
 return <details className="update-entry" open={open}>
  <summary><strong>{u.version}</strong> <small>{u.date}</small> <span>{gameCounts(u)}</span>{u.subtitle&&<em className="update-subtitle">{u.subtitle}</em>}</summary>
  {u.sections.map(sec=><div key={sec.heading}><h3>{sec.heading}</h3><ul>{sec.items.map(i=><li key={i}>{i}</li>)}</ul></div>)}
  {u.titles.length>0&&<><h3>새 칭호 <small className="update-note">(칭호 도감 기준)</small></h3><table className="update-table"><thead><tr><th scope="col">도감 번호</th><th scope="col">칭호</th><th scope="col">획득 조건</th></tr></thead><tbody>
   {u.titles.map(t=><tr key={t.number}><td>{t.number}</td><td>{t.name}</td><td className="update-condition">{t.condition}</td></tr>)}
  </tbody></table></>}
  {(u.changedTitles>0||u.removedTitles>0)&&<p>바뀐 칭호 {u.changedTitles}개, 빠진 칭호 {u.removedTitles}개</p>}
  {u.bgm.length>0&&<><h3>새 BGM</h3>{u.bgmNote&&<p className="update-note">{u.bgmNote}</p>}<ul>{u.bgm.map(b=><li key={b.id}><code>{b.id}</code>{b.note&&<small> — {b.note}</small>}</li>)}</ul></>}
  <p className="update-links"><Link className="text-link" to="/titles">칭호 도감 열기 →</Link> <Link className="text-link" to="/music">BGM 라이브러리 열기 →</Link></p>
 </details>
}

function SiteEntry({u,open}:{u:SiteUpdate;open:boolean}){
 return <details className="update-entry" open={open}>
  <summary><strong>{u.title}</strong> <small>{u.date}</small></summary>
  <ul>{u.items.map(i=><li key={i}>{i}</li>)}</ul>
 </details>
}

export function UpdatesPage(){
 const [params]=useSearchParams(),show=params.get('show')
 useEffect(()=>{if(show)document.getElementById(`updates-${show}`)?.scrollIntoView({block:'start'})},[show])
 return <section className="feature-page updates-page">
  <div className="eyebrow">UPDATES</div>
  <h1>업데이트 내역</h1>
  <p className="lead">게임 버전별로 새로 들어온 칭호와 음악, 그리고 이 사이트의 변경 사항을 모았어요.</p>
  <section id="updates-game" aria-labelledby="updates-game-title"><h2 id="updates-game-title">게임 업데이트</h2>
   {gameUpdates.map((u,i)=><GameEntry u={u} open={i===0} key={u.version}/>)}
  </section>
  <section id="updates-site" aria-labelledby="updates-site-title"><h2 id="updates-site-title">사이트 업데이트</h2>
   {siteUpdates.map((u,i)=><SiteEntry u={u} open={i===0} key={u.date+u.title}/>)}
  </section>
 </section>
}
