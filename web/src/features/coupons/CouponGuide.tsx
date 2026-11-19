// Step-by-step help for people with no development background. Collapsed by default so returning users are not slowed down.
export function CouponGuide({scriptUrl,officialUrl}:{scriptUrl:string;officialUrl:string}){
 return <section className="coupon-guide" aria-labelledby="coupon-guide-title">
  <h2 id="coupon-guide-title">처음이신가요? 따라 하기 안내</h2>
  <p>방법은 두 가지예요. <strong>A. 설치 없이 복사·붙여넣기</strong>는 바로 쓸 수 있고, <strong>B. 쿠폰 도우미 설치</strong>는 한 번만 설치하면 여러 계정을 훨씬 빠르게 입력할 수 있어요.</p>

  <details>
   <summary>준비: 내 사용자 ID 찾기 (9자리)</summary>
   <ol>
    <li>쿠키런: 오븐브레이크를 켜고 로비에서 <strong>설정(톱니바퀴)</strong>을 눌러요.</li>
    <li><strong>쿠폰 입력</strong> 창이나 계정 정보에 보이는 <strong>사용자 ID</strong>(영문·숫자 9자리)를 확인해요.</li>
    <li>이 페이지 아래 <strong>계정 ID</strong> 칸에 그 9자리를 입력하고 <strong>추가</strong>를 눌러요. 별명(예: 본계정, 부계정)은 적어도 되고 안 적어도 돼요.</li>
   </ol>
   <p>계정은 최대 30개까지 저장할 수 있어요. 저장한 ID는 이 기기의 이 브라우저에만 남고, 다른 곳으로 보내지지 않아요.</p>
  </details>

  <details>
   <summary>A. 설치 없이 쓰기 (복사·붙여넣기) — 휴대폰도 가능</summary>
   <ol>
    <li>아래 <strong>쿠폰</strong> 칸에 쿠폰 번호 16자리를 넣고 <strong>추가</strong>를 눌러요. 띄어쓰기나 '-'는 자동으로 빠져요.</li>
    <li><a className="text-link" href={officialUrl} target="_blank" rel="noopener noreferrer">공식 쿠폰 페이지</a>를 새 탭으로 열어요.</li>
    <li>이 페이지에서 <strong>ID 복사</strong>를 누르고, 공식 페이지의 사용자 ID 칸에 붙여 넣어요(길게 누르기 → 붙여넣기, PC는 Ctrl+V).</li>
    <li>같은 방법으로 <strong>번호 복사</strong> → 공식 페이지 쿠폰 번호 칸에 붙여 넣고 <strong>상품 받기</strong>를 눌러요.</li>
    <li>계정이 여러 개면 3~4번을 계정마다 반복해요. 보상은 게임 안에서 확인할 수 있어요.</li>
   </ol>
  </details>

  <details>
   <summary>B. 쿠폰 도우미 설치하기 (PC 크롬·엣지·파이어폭스)</summary>
   <p>쿠폰 도우미는 공식 쿠폰 페이지에 ID와 쿠폰 번호를 대신 넣어 주는 작은 프로그램(유저스크립트)이에요. 브라우저 확장 프로그램 <strong>Tampermonkey</strong> 위에서 동작해요.</p>
   <ol>
    <li><a className="text-link" href="https://www.tampermonkey.net/" target="_blank" rel="noopener noreferrer">Tampermonkey 공식 사이트</a>에 들어가면 쓰는 브라우저에 맞는 설치 버튼이 나와요. 눌러서 브라우저 스토어에서 <strong>추가</strong>해요.</li>
    <li><strong>크롬·엣지는 한 가지 설정이 더 필요해요.</strong> 주소창에 <code>chrome://extensions</code>(엣지는 <code>edge://extensions</code>)를 입력해 열고,
     Tampermonkey의 <strong>세부정보</strong>를 눌러 <strong>사용자 스크립트 허용</strong>을 켜요. 그 항목이 안 보이면 화면 오른쪽 위(엣지는 왼쪽 아래)의 <strong>개발자 모드</strong>를 켜요.</li>
    <li>이 링크를 눌러요: <a className="text-link" href={scriptUrl}>쿠폰 도우미 설치</a>. Tampermonkey 설치 화면이 열리면 <strong>설치</strong>를 눌러요. (설치 화면 대신 글자만 보이면 1~2번을 다시 확인해 주세요.)</li>
    <li>이 페이지로 돌아와 새로고침해요. 계정 ID와 쿠폰을 추가하고, 아래 <strong>등록하기</strong>에서 쿠폰을 고른 뒤 <strong>공식 페이지 열고 … 계정 등록</strong>을 눌러요.</li>
    <li>공식 쿠폰 페이지가 새 창으로 열리고, 오른쪽 아래에 <strong>쿠오븐 쿠폰 도우미</strong> 상자가 떠요. 도우미가 ID와 번호를 넣어 두면 내가 <strong>상품 받기</strong>를 눌러요. 다음 계정도 같은 방식으로 이어져요.</li>
    <li>결과(지급 완료, 이미 사용 등)는 이 페이지 표에 자동으로 기록돼요. 이미 받은 계정은 다음에 자동으로 빠져요.</li>
   </ol>
  </details>

  <details>
   <summary>안 될 때 확인할 것</summary>
   <ul>
    <li><strong>공식 페이지 창이 안 열려요</strong> → 브라우저가 팝업을 막은 거예요. 주소창 오른쪽의 팝업 차단 표시를 눌러 이 사이트의 팝업을 허용해 주세요.</li>
    <li><strong>도우미 상자가 안 떠요</strong> → Tampermonkey 아이콘을 눌러 '쿠오븐 쿠폰 도우미'가 켜져 있는지, 크롬·엣지라면 '사용자 스크립트 허용'이 켜져 있는지 확인해 주세요. 그래도 안 되면 A 방법(복사·붙여넣기)을 쓰면 돼요.</li>
    <li><strong>ID나 번호를 입력해도 추가가 안 눌려요</strong> → 한글 입력 상태일 수 있어요. 한/영 키를 눌러 영문으로 바꿔 주세요. 자릿수(ID 9자리, 쿠폰 16자리)도 확인해 주세요.</li>
    <li><strong>'시도 너무 많음'이 떠요</strong> → 잘못된 번호를 여러 번 넣으면 공식 서버가 잠시 막아요. 시간이 지난 뒤 다시 해 주세요.</li>
    <li><strong>'같은 종류 등록함'</strong> → 그 계정은 같은 종류의 쿠폰을 이미 받았다는 뜻이에요. 정상이에요.</li>
   </ul>
   <p>휴대폰 브라우저는 대부분 Tampermonkey를 쓸 수 없어서 A 방법을 권해요.</p>
  </details>
 </section>
}
