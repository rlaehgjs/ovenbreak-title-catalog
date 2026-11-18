import { Link } from 'react-router'
import { navigation } from '../app/navigation'
export function FeaturePage({ path }: { path: string }) {
 const item = navigation.find(item=>item.path===path)!
 const notes: Record<string,string> = {
 '/titles':'기존 칭호 이미지, 검색·필터·정렬, 보유 기록과 점수 계산을 유지하며 연결할 예정이에요.',
 '/maps':'맵별 정보를 편하게 찾아볼 수 있도록 데이터와 표시 방식을 준비하고 있어요.',
 '/coupons':'쿠폰 확인과 공식 등록 페이지 이용을 돕는 기능을 준비하고 있어요.',
 '/music':'어느 페이지에서도 이어 들을 수 있는 음악 라이브러리와 공통 플레이어를 준비하고 있어요.',
 }
 return <section className="feature-page"><div className="eyebrow">OVENBREAK ARCHIVE</div><h1>{item.label}</h1><p className="lead">{item.description}</p><div className="empty-panel"><span className="empty-symbol" aria-hidden="true">{item.symbol}</span><span className="tag">연결 준비 중</span><h2>곧 이곳에서 만나요</h2><p>{notes[path]}</p><Link className="text-link" to="/">홈으로 돌아가기 →</Link></div></section>
}
