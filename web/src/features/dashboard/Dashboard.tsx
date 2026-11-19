import { Link } from 'react-router'
import { navigation } from '../../app/navigation'
import { UpdateSummary } from '../updates/UpdatesPage'
export function Dashboard() {
  return <><UpdateSummary/><section aria-labelledby="explore"><div className="section-heading"><h2 id="explore">어떤 이야기를 찾아볼까요?</h2><span>네 가지 공간</span></div><div className="feature-grid">{navigation.slice(1).map((item, i)=><Link className={'feature feature-'+i} to={item.path} key={item.path}><div className="feature-top"><span className="feature-symbol" aria-hidden="true">{item.symbol}</span><span className="tag">{item.path==='/maps'?'준비 중':'이용 가능'}</span></div><h3>{item.label}<span aria-hidden="true">↗</span></h3><p>{item.description}</p></Link>)}</div></section><aside className="notice"><strong>조금씩 넓어지는 오븐브레이크의 세계</strong><p>기존 칭호 도감과 보유 기록은 그대로 유지됩니다. 맵 정보는 준비 중이며, 기능은 순서대로 더해집니다.</p></aside></>
}
