# 칭호 도감

쿠키런: 오븐브레이크 칭호를 분류·등급·획득 가능 여부로 살펴보는 비공식 도감입니다.

- 칭호 이미지와 애니메이션, 설명, 히든 여부, 기간 및 예외 안내
- 보유 칭호 선택과 점수 계산, 필터 및 정렬
- 데이터 기준: 14.412 버전(2026-11-09)

## 실행

Python 3가 있다면 저장소 폴더에서 다음 명령으로 실행합니다.

```sh
python -m http.server 8000 --directory title-catalog
```

브라우저에서 http://localhost:8000 을 엽니다. 별도 빌드나 패키지 설치는 필요하지 않습니다.

## GitHub Pages

저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 설정합니다.
`main`에 푸시하면 검증 후 `title-catalog` 폴더가 배포됩니다. Actions에서 수동 실행할 수도 있습니다.

## 데이터 갱신

로컬 추출·렌더링 작업으로 생성한 `title-catalog/index.html`과 `title-catalog/images`를 함께 갱신한 뒤 검증합니다.

```sh
python scripts/check_public_site.py
git status --short
git add title-catalog/index.html title-catalog/images
git commit -m "Update title catalog"
git push
```

이 저장소에는 공개 화면과 사용하는 이미지만 포함합니다. 추출 원본, 분석 자료, 렌더러와 압축 파일은 `.gitignore`로 제외합니다. 표시 시작 시간이 미래인 칭호는 HTML 데이터와 이미지에서 모두 제외한 뒤 커밋해야 합니다. 배포 검증은 미래 시작일과 누락·불필요 이미지를 검사하지만, 푸시된 파일 자체의 공개를 되돌려 주지는 않으므로 커밋 전에도 실행하세요.

## 보유 기록

보유 기록은 브라우저의 localStorage에 저장되며 서버나 GitHub에 전송하지 않습니다. 브라우저·기기·접속 주소가 바뀌면 기록이 공유되지 않습니다. 로컬 파일에서 체크한 기록도 GitHub Pages 주소로 자동 이전되지 않습니다. 사이트 데이터를 삭제하면 기록도 삭제됩니다.

게임 이미지와 명칭의 권리는 각 권리자에게 있습니다.
