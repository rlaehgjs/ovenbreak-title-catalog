import { AudioProvider } from './features/music/AudioProvider'
import MusicPage from './features/music/MusicPage'
import CouponsPage from './features/coupons/CouponsPage'
import { lazy, Suspense } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router'
import { AppLayout } from './app/AppLayout'
import { navigation } from './app/navigation'
import { Dashboard } from './features/dashboard/Dashboard'
import { FeaturePage } from './shared/FeaturePage'
const TitlesPage=lazy(()=>import('./features/titles/TitlesPage'))
export default function App(){return <AudioProvider><HashRouter><Routes><Route element={<AppLayout />}><Route index element={<Dashboard />}/>{navigation.slice(1).map(item=><Route path={item.path} element={item.path==='/titles'?<Suspense fallback={<p role="status">칭호 도감을 불러오는 중…</p>}><TitlesPage /></Suspense>:item.path==='/music'?<MusicPage/>:item.path==='/coupons'?<CouponsPage/>:<FeaturePage path={item.path}/>} key={item.path}/>)}<Route path="*" element={<section className="feature-page"><h1>페이지를 찾을 수 없어요</h1><p>주소를 확인하거나 홈에서 다시 시작해 주세요.</p><Link className="text-link" to="/">홈으로 →</Link></section>}/></Route></Routes></HashRouter></AudioProvider>}
