# 예나준 (yenajun.com)

빌드 과정 없는 순수 HTML 사이트입니다. GitHub에 올리면 Cloudflare Pages가 자동으로 가져가 배포합니다.

## 폴더 구조

```
/
├── index.html          메인 홈
├── privacy.html        개인정보처리방침 (애드센스 심사에 필요)
├── terms.html          이용약관
├── 404.html            없는 주소로 들어왔을 때
├── baby-name/          아기 이름짓기 (원본: 작명/아기이름짓기 NEW/site)
├── mixed-feeding/      혼합수유 보충량 계산기
├── room-deduction/     방공제 한도 계산기
├── assets/
│   ├── style.css       공통 스타일 (색·글꼴은 맨 위 :root에서 한 번에 변경)
│   ├── logo.svg
│   ├── og-image.jpg    카톡·SNS 공유 미리보기 (1200×630)
│   ├── icons/          도구 아이콘
│   └── img/            히어로 영상·이미지, 이야기 이미지, 404 배경
├── favicon.png / apple-touch-icon.png
├── robots.txt / sitemap.xml
```

## 올리기 전에 바꿀 것

모든 파일에서 대괄호를 찾아 바꿔주세요.

- `[문의 이메일]` → 공개해도 되는 문의용 이메일 (index, privacy, terms에 있음)
- `[운영자 이름]` → privacy.html
- index.html의 "로그인하고 시작하기" 버튼 `href="#"` → 업무용 사이트 주소가 정해지면 변경

## 처음 배포하기 (한 번만)

1. GitHub에서 새 저장소(repository)를 만들고 이 폴더의 파일을 모두 올립니다. (저장소 맨 위에 `index.html`이 있어야 합니다)
2. Cloudflare 대시보드 → Workers & Pages → Pages에서 Git 저장소 연결을 선택하고 1번 저장소를 고릅니다.
3. 빌드 설정: Framework preset `None`, Build command 비워두기, Build output directory `/`
4. 배포가 끝나면 Pages 프로젝트의 Custom domains에서 `yenajun.com`(과 `www.yenajun.com`)을 연결합니다. 도메인을 Cloudflare에서 샀다면 DNS가 자동으로 잡힙니다.

그다음부터는 GitHub에 커밋(push)만 하면 1~2분 안에 사이트에 반영됩니다.

## 새 도구 추가하기

1. 새 폴더를 만듭니다. 예: `loan-calc/index.html`
2. 아이콘을 `assets/icons/`에 넣습니다. (정사각형, 256px 이상 PNG)
3. index.html의 도구 카드(`<a class="tool-card">…</a>`) 하나를 복사해 이름·설명·링크·아이콘을 바꿉니다.
4. sitemap.xml에 주소를 한 줄 추가합니다.

도구 페이지 위쪽에 `<link rel="stylesheet" href="/assets/style.css">`를 넣으면 같은 색·글꼴을 쓸 수 있고,
준비 중 페이지에 있는 `<meta name="robots" content="noindex">` 줄은 실제 도구로 교체할 때 지워주세요.

## 광고 붙이기 (나중에)

- 애드센스 승인 후 받은 스크립트를 각 페이지 `<head>` 안 "광고 스크립트" 주석 자리에 붙여넣습니다.
- index.html의 `<div class="ad-slot">광고 영역</div>`을 광고 단위 코드로 바꿉니다.
- 심사 전에는 도구마다 설명 글(사용법, 알아두면 좋은 점)을 조금씩 채워두면 유리합니다.
