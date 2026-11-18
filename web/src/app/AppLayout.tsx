import { MiniPlayer } from '../features/music/MiniPlayer'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { navigation } from './navigation'
export function AppLayout() {
 const { pathname } = useLocation()
 const main = useRef<HTMLElement>(null)
 const first = useRef(true)
 useEffect(()=>{
   document.title = `${navigation.find(item=>item.path===pathname)?.label || '페이지 없음'} · 오븐브레이크 정보 허브`
   if(first.current){first.current=false;return}
   main.current?.focus({preventScroll:true});window.scrollTo({top:0})
 },[pathname])
 return <><a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();main.current?.focus()}}>본문으로 건너뛰기</a><header className="site-header"><div className="header-inner"><Link className="brand" to="/"><span className="brand-icon" aria-hidden="true">✦</span><span>오븐브레이크<small>정보 허브</small></span></Link><span className="local-badge" title="데브시스터즈 공식 사이트가 아닙니다">비공식</span></div><nav aria-label="주 메뉴">{navigation.map(item=><NavLink end={item.path==='/'} to={item.path} key={item.path} className={({isActive})=>isActive?'nav-link active':'nav-link'}>{item.label}</NavLink>)}</nav></header><main id="main-content" ref={main} tabIndex={-1}><Outlet /></main><MiniPlayer /><footer className="site-footer"><strong>COOKIE RUN: OVENBREAK · 비공식 정보 허브</strong><p>이 콘텐츠는 데브시스터즈의 제휴·후원 또는 승인을 받지 않은 콘텐츠입니다.</p><a href="https://policy.devsisters.com/ko/content-policy/" target="_blank" rel="noopener noreferrer">유저 콘텐츠 규정 ↗</a></footer></>
}
