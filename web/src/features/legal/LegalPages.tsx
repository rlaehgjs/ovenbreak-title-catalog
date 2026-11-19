// Privacy policy and terms (2026-11-19). Plain description of what this static site actually does; review when features change.
const CONTACT='https://github.com/rlaehgjs/ovenbreak-title-catalog/issues'
const EFFECTIVE='2026년 11월 19일'

export function PrivacyPage(){
 return <section className="feature-page legal-page">
  <div className="eyebrow">PRIVACY</div>
  <h1>개인정보처리방침</h1>
  <p className="updated">시행일: {EFFECTIVE}</p>
  <p>오븐브레이크 정보 허브(이하 ‘이 사이트’)는 개인이 운영하는 쿠키런: 오븐브레이크 팬 사이트입니다. 이 사이트는 회원가입·로그인이 없고, 이용자의 개인정보를 서버로 수집하거나 보관하지 않습니다.</p>

  <h2>1. 수집하는 개인정보</h2>
  <p>이 사이트는 이름, 연락처, 계정 정보 등 개인정보를 수집하지 않습니다. 광고, 방문 분석 도구, 추적 쿠키도 사용하지 않습니다.</p>

  <h2>2. 이용자의 기기(브라우저)에만 저장되는 정보</h2>
  <p>편의를 위해 아래 정보는 이용자의 브라우저 저장소(localStorage)에만 저장되며, 이 사이트의 서버나 운영자에게 전송되지 않습니다.</p>
  <table><thead><tr><th scope="col">기능</th><th scope="col">저장되는 내용</th></tr></thead><tbody>
   <tr><td>칭호 도감</td><td>보유 표시한 칭호 목록, 마지막으로 확인한 업데이트</td></tr>
   <tr><td>BGM 라이브러리</td><td>즐겨찾기, 재생목록, 음량, 재생 방식, 곡별 버전 선택, 마지막 곡과 위치</td></tr>
   <tr><td>쿠폰 입력</td><td>이용자가 입력한 게임 사용자 ID(9자리)와 별명, 쿠폰 번호와 메모, 등록 결과</td></tr>
  </tbody></table>
  <p>이 정보는 브라우저의 사이트 데이터 삭제 기능으로 언제든 지울 수 있고, 쿠폰 입력 화면의 ‘삭제’ 버튼으로 항목별로 지울 수도 있습니다. 다른 기기나 브라우저와는 공유되지 않습니다.</p>

  <h2>3. 쿠폰 입력 기능</h2>
  <p>쿠폰 등록은 데브시스터즈의 공식 쿠폰 페이지(cookierun.com)에서 이뤄집니다. 이용자가 고른 사용자 ID와 쿠폰 번호는 이용자의 브라우저 안에서 공식 페이지로만 전달되며, 이 사이트의 서버를 거치지 않습니다. 공식 페이지에서 처리되는 정보는 데브시스터즈의 개인정보처리방침을 따릅니다.</p>

  <h2>4. 외부 서비스</h2>
  <p>이 사이트는 GitHub Pages(사이트 제공)와 Cloudflare(음악 파일 전송)를 이용합니다. 이 서비스들은 사이트를 제공하고 보안을 유지하기 위해 접속 IP 주소, 브라우저 정보 같은 기술 정보를 처리할 수 있으며, 각 회사의 개인정보처리방침을 따릅니다. 운영자는 요청 수 같은 통계만 확인하며, 개인을 식별할 수 있는 정보를 따로 수집·보관하지 않습니다.</p>

  <h2>5. 문의와 변경</h2>
  <p>문의는 <a className="text-link" href={CONTACT} target="_blank" rel="noopener noreferrer">GitHub 저장소 이슈</a>로 남겨 주시거나, 디시인사이드 쿠키런 갤러리의 ‘팀쩔’ 닉네임으로 부탁드립니다. 이 방침이 바뀌면 이 페이지에 시행일과 함께 알립니다.</p>
 </section>
}

export function TermsPage(){
 return <section className="feature-page legal-page">
  <div className="eyebrow">TERMS</div>
  <h1>이용약관</h1>
  <p className="updated">시행일: {EFFECTIVE}</p>

  <h2>1. 사이트 성격</h2>
  <p>이 사이트는 쿠키런: 오븐브레이크를 좋아하는 개인이 비영리로 운영하는 팬 사이트입니다. 이 콘텐츠는 데브시스터즈의 제휴·후원 또는 승인을 받지 않은 콘텐츠이며,
   <a className="text-link" href="https://policy.devsisters.com/ko/content-policy/" target="_blank" rel="noopener noreferrer">데브시스터즈 유저 콘텐츠 규정</a>에 따라 상업적 사용 금지, 면책 조항, 윤리 준수, 서비스 약관 준수, 침해 금지를 지킵니다.
   이 서비스 출시 전 데브시스터즈 고객센터 문의를 통해, 상업적 목적이 아닐 경우 공식 채널에서 확인할 수 있는 리소스를 사용할 수 있다는 확인을 받았습니다.</p>

  <h2>2. 저작권</h2>
  <p>게임 이름, 이미지, 음악 등 쿠키런: 오븐브레이크의 자료에 대한 권리는 데브시스터즈에 있습니다. 이 사이트의 음악은 개인 감상용으로 제공되며, 내려받아 재배포하거나 상업적으로 이용할 수 없습니다.</p>

  <h2>3. 정보의 정확성</h2>
  <p>칭호, 음악 등 이 사이트의 정보는 게임 업데이트에 따라 실제와 다를 수 있으며, 운영자는 정확성이나 완전성을 보장하지 않습니다. 정확한 내용은 게임과 공식 채널에서 확인해 주세요.</p>

  <h2>4. 쿠폰 입력 기능</h2>
  <p>쿠폰 입력 기능과 쿠폰 도우미는 공식 쿠폰 페이지에 입력하는 과정을 돕는 도구입니다. 쿠폰 등록과 보상 지급은 데브시스터즈가 처리하며, 이용자는 데브시스터즈의 이용약관을 지켜야 합니다. 본인이 이용 권한을 가진 계정에만 사용해 주세요.</p>

  <h2>5. 서비스 변경과 중단</h2>
  <p>이 사이트는 무료로 제공되며, 기능이 예고 없이 바뀌거나 중단될 수 있습니다. 음악 파일 전송에는 하루 제공량이 있어, 제공량이 모두 쓰이면 다음 날 오전 9시(한국 시간)까지 음악을 들을 수 없을 수 있습니다.</p>

  <h2>6. 책임의 제한</h2>
  <p>운영자는 이 사이트 이용으로 생긴 손해에 대해 법령이 허용하는 범위에서 책임을 지지 않습니다.</p>

  <h2>7. 문의</h2>
  <p>문의나 권리 침해 신고는 <a className="text-link" href={CONTACT} target="_blank" rel="noopener noreferrer">GitHub 저장소 이슈</a>로 남겨 주시거나, 디시인사이드 쿠키런 갤러리의 ‘팀쩔’ 닉네임으로 부탁드립니다. 확인 후 필요한 조치를 하겠습니다.</p>
 </section>
}
