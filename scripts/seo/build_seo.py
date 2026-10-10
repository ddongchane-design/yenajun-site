# -*- coding: utf-8 -*-
"""예나준 SEO 기반 — 모든 페이지의 <head>에 공유 메타태그(og·twitter)와 구조화 데이터(JSON-LD)를 넣고,
도구·가이드별 공유 이미지(1200×630)를 만든다.

  python scripts/seo/build_seo.py            # 메타태그·JSON-LD 갱신 + 없는 공유 이미지만 생성
  python scripts/seo/build_seo.py --images   # 공유 이미지 전부 다시 생성

- <head> 안 `<!-- yn-seo:start -->` ~ `<!-- yn-seo:end -->` 사이를 이 스크립트가 통째로 다시 쓴다. 직접 고치지 말 것.
- 새 도구를 만들면 아래 TOOLS에 한 줄 추가하고 이 스크립트를 다시 돌린다.
- 날짜(작성일·수정일)는 git 커밋 기록에서 가져온다.
"""
import asyncio
import html
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = 'https://yenajun.com'
# 구글 애널리틱스 4 측정 ID (예: 'G-ABC123XYZ'). 넣고 이 스크립트를 다시 돌리면 모든 페이지에 들어가요. 비우면 빠져요.
GA4_ID = 'G-7J20CMXV0R'
OG_DIR = ROOT / 'assets' / 'og'

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# slug: (도구 이름, 분류, schema.org applicationCategory, 아이콘)
TOOLS = {
    'baby-name':      ('아기 이름짓기', '육아', 'LifestyleApplication', 'icon-name.png'),
    'mixed-feeding':  ('혼합수유 보충량 계산기', '육아', 'HealthApplication', 'icon-calc.png'),
    'formula-mix':    ('분유 타는 법 계산기', '육아', 'HealthApplication', 'icon-calc.png'),
    'rsv-antibody':   ('RSV 항체주사 도우미', '육아', 'HealthApplication', 'icon-calc.png'),
    'nub-angle':      ('각도법 판독 도우미', '육아', 'LifestyleApplication', 'icon-calc.png'),
    'lump-sum':       ('고금리 투자 비교 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'robotaxi':       ('로보택시 회수 기간 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'jeonse-wolse':   ('전세 반전세 월세 비교 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'room-deduction': ('방공제 한도 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'avg-down':       ('물타기 평단가 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'p2p-invest':     ('P2P 상품 고르기 계산기', '집과 돈', 'FinanceApplication', 'icon-calc.png'),
    'wedding-gift':   ('축의금 계산기', '일상과 관계', 'LifestyleApplication', 'icon-calc.png'),
    'yuryubun':       ('유류분 계산기', '일상과 관계', 'UtilitiesApplication', 'icon-calc.png'),
    'fish-menu':      ('수산시장 메뉴 구성 계산기', '일상과 관계', 'LifestyleApplication', 'icon-calc.png'),
}
CAT_COLOR = {'육아': '#5E8C6A', '집과 돈': '#1F2A44', '일상과 관계': '#A54E38', '가이드': '#9A6A12', '금리': '#1F2A44'}
ORG = {'@type': 'Organization', '@id': SITE + '/#org', 'name': '예나준', 'url': SITE + '/',
       'logo': SITE + '/assets/logo-512.png', 'email': 'ddongchane@gmail.com'}
AUTHOR = {'@type': 'Person', 'name': '이동찬', 'url': SITE + '/about'}


def git_dates(path):
    out = subprocess.run(['git', 'log', '--follow', '--format=%cI', '--', str(path.relative_to(ROOT))],
                         cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout.split()
    today = datetime.now().astimezone().replace(microsecond=0).isoformat()
    return (out[-1] if out else today), (out[0] if out else today)


def text(s):
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def meta(src, attr, key):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"' % (attr, re.escape(key)), src)
    return html.unescape(m.group(1)) if m else ''


def url_of(rel):
    p = '/' + rel.replace('\\', '/')
    p = re.sub(r'index\.html$', '', p)
    return SITE + re.sub(r'\.html$', '', p)


def faqs(src):
    """<details><summary>질문?</summary><p>답</p> 짝. 질문(물음표)인 것만."""
    out = []
    for q, a in re.findall(r'<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>', src, re.S):
        q, a = text(q), text(a)
        if '?' in q and a:
            out.append({'@type': 'Question', 'name': q,
                        'acceptedAnswer': {'@type': 'Answer', 'text': a}})
    return out


def crumbs(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate(items)]}


def page_info(rel):
    """페이지 종류와 공유 이미지 정보"""
    parts = rel.replace('\\', '/').split('/')
    slug = parts[0] if len(parts) > 1 else ''
    if rel == 'index.html':
        return 'home', None
    if slug in TOOLS:
        return ('guide' if 'guide' in parts else 'tool'), slug
    if slug == 'rates':
        return 'rates', ('issuance' if 'issuance' in parts else 'rates')
    return 'static', rel.replace('.html', '')


def build_graph(rel, src, kind, key, url, title, desc, image):
    published, modified = git_dates(ROOT / rel)
    h1 = text((re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S) or [None, title])[1])
    home = ('예나준', SITE + '/')
    g = []
    if kind == 'home':
        g.append({'@type': 'WebSite', '@id': SITE + '/#website', 'name': '예나준', 'alternateName': 'yenajun',
                  'url': SITE + '/', 'description': desc, 'inLanguage': 'ko-KR', 'publisher': {'@id': ORG['@id']}})
        g.append(dict(ORG, founder=AUTHOR, description=desc))
    elif kind == 'tool':
        name, cat, appcat, _ = TOOLS[key]
        g.append({'@type': 'WebApplication', 'name': name, 'alternateName': title, 'url': url,
                  'description': desc, 'applicationCategory': appcat, 'operatingSystem': 'Any',
                  'browserRequirements': 'JavaScript 필요', 'inLanguage': 'ko-KR', 'isAccessibleForFree': True,
                  'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'KRW'},
                  'image': image, 'datePublished': published, 'dateModified': modified,
                  'author': AUTHOR, 'publisher': {'@id': ORG['@id']}})
        g.append(crumbs([home, (name, url)]))
    elif kind == 'guide':
        name = TOOLS[key][0]
        g.append({'@type': 'Article', 'headline': title[:110], 'description': desc, 'url': url,
                  'mainEntityOfPage': url, 'image': image, 'inLanguage': 'ko-KR',
                  'datePublished': published, 'dateModified': modified,
                  'author': AUTHOR, 'publisher': {'@id': ORG['@id']},
                  'about': {'@type': 'WebApplication', 'name': name, 'url': SITE + '/' + key + '/'}})
        g.append(crumbs([home, (name, SITE + '/' + key + '/'), ('가이드', url)]))
    elif kind == 'rates':
        g.append({'@type': 'WebPage', 'name': title, 'url': url, 'description': desc, 'inLanguage': 'ko-KR',
                  'image': image, 'dateModified': modified, 'author': AUTHOR, 'publisher': {'@id': ORG['@id']}})
        trail = [home, ('주간 금리 동향', SITE + '/rates/')]
        if key == 'issuance':
            trail.append(('금융채 발행 동향', url))
        g.append(crumbs(trail))
    else:
        typ = 'AboutPage' if key == 'about' else 'WebPage'
        g.append({'@type': typ, 'name': title, 'url': url, 'description': desc, 'inLanguage': 'ko-KR',
                  'publisher': {'@id': ORG['@id']}})
        g.append(crumbs([home, (h1 or title, url)]))
    fq = faqs(src)
    if fq and kind in ('tool', 'guide'):
        g.append({'@type': 'FAQPage', 'mainEntity': fq})
    if kind != 'home':
        g.append(dict(ORG))  # publisher @id가 가리킬 대상
    return {'@context': 'https://schema.org', '@graph': g}


def og_image_for(kind, key):
    if kind == 'tool':
        return f'{SITE}/assets/og/{key}.png'
    if kind == 'guide':
        return f'{SITE}/assets/og/{key}-guide.png'
    if kind == 'rates':
        return f'{SITE}/assets/og/{key}.png'
    return f'{SITE}/assets/og-image.jpg'


def process(rel):
    p = ROOT / rel
    src = p.read_text(encoding='utf-8')
    kind, key = page_info(rel)
    url = url_of(rel)
    title_tag = text((re.search(r'<title>(.*?)</title>', src, re.S) or [None, ''])[1])
    title = meta(src, 'property', 'og:title') or re.sub(r'\s*\|\s*예나준$', '', title_tag)
    desc = meta(src, 'name', 'description')
    ogdesc = meta(src, 'property', 'og:description') or desc
    image = og_image_for(kind, key)
    otype = 'article' if kind == 'guide' else 'website'

    # 기존 og·twitter 메타와 예전 블록을 지우고 한 블록으로 다시 넣는다
    src = re.sub(r'\n?[ \t]*<!-- yn-seo:start.*?<!-- yn-seo:end -->', '', src, flags=re.S)
    src = re.sub(r'\n?[ \t]*<!-- 공유 미리보기[^>]*-->', '', src)
    src = re.sub(r'\n?[ \t]*<meta\s+(property="og:[^"]+"|name="twitter:[^"]+")[^>]*>', '', src)
    graph = build_graph(rel, src, kind, key, url, title, desc, image)
    e = lambda s: html.escape(s, quote=True)
    block = [
        '<!-- yn-seo:start (scripts/seo/build_seo.py가 만듦 — 직접 고치지 말 것) -->',
        f'<meta property="og:type" content="{otype}">',
        '<meta property="og:site_name" content="예나준">',
        '<meta property="og:locale" content="ko_KR">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(ogdesc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
        *([f'<script async src="https://www.googletagmanager.com/gtag/js?id={GA4_ID}"></script>',
           '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}'
           f"gtag('js',new Date());gtag('config','{GA4_ID}');</script>"] if GA4_ID else []),
        '<script type="application/ld+json">',
        json.dumps(graph, ensure_ascii=False, indent=1).replace('</', '<\\/'),
        '</script>',
        '<!-- yn-seo:end -->',
    ]
    i = src.index('</head>')
    src = src[:i].rstrip() + '\n' + '\n'.join(block) + '\n' + src[i:]
    p.write_text(src, encoding='utf-8', newline='')
    return kind, key, title, image


# ---------- 공유 이미지 ----------
OG_HTML = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@900&family=IBM+Plex+Sans+KR:wght@500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#FAF6EF;font-family:'IBM Plex Sans KR',sans-serif;color:#1F2A44;overflow:hidden}
.c{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
.chip{align-self:flex-start;background:COLOR;color:#fff;font-weight:600;font-size:26px;padding:8px 22px;border-radius:999px}
h1{font-family:'Noto Serif KR',serif;font-weight:900;font-size:SIZEpx;line-height:1.28;margin-top:34px;max-width:760px;word-break:keep-all;letter-spacing:-.01em}
p{font-size:28px;color:#4E5568;line-height:1.55;margin-top:22px;max-width:740px;word-break:keep-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.foot{margin-top:auto;display:flex;align-items:center;gap:14px;font-size:26px;font-weight:600}
.foot img{width:44px;height:44px}
.foot small{font-weight:500;color:#4E5568;font-size:22px;margin-left:10px}
.tile{position:absolute;right:72px;top:50%;transform:translateY(-50%);width:270px;height:270px;border-radius:56px;background:#fff;
  border:2px solid #EAE2D4;display:flex;align-items:center;justify-content:center;box-shadow:0 24px 50px -30px rgba(31,42,68,.45)}
.tile img{width:190px;height:190px;border-radius:40px}
.bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:COLOR}
</style></head><body><div class="bar"></div><div class="c">
<span class="chip">CHIP</span><h1>TITLE</h1><p>DESC</p>
<div class="foot"><img src="LOGO">예나준 · yenajun.com<small>무료 · 로그인 없이 바로</small></div></div>
<div class="tile"><img src="ICON"></div></body></html>"""


async def make_images(jobs, force):
    from playwright.async_api import async_playwright
    OG_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={'width': 1200, 'height': 630})
        for out, chip, color, title, desc, icon in jobs:
            if out.exists() and not force:
                continue
            longest = max(len(x) for x in title.split(chr(10)))
            size = 64 if longest <= 12 else 56 if longest <= 16 else 48
            h = (OG_HTML.replace('COLOR', color).replace('CHIP', html.escape(chip)).replace('SIZE', str(size))
                 .replace('TITLE', html.escape(title).replace(chr(10), '<br>')).replace('DESC', html.escape(desc))
                 .replace('LOGO', (ROOT / 'assets' / 'logo-512.png').as_uri())
                 .replace('ICON', (ROOT / 'assets' / 'icons' / icon).as_uri()))
            tmp = OG_DIR / '_tmp.html'
            tmp.write_text(h, encoding='utf-8')
            await pg.goto(tmp.as_uri(), wait_until='networkidle')
            await pg.evaluate('document.fonts.ready')
            await pg.screenshot(path=str(out), type='png')
            print('  이미지', out.name)
        (OG_DIR / '_tmp.html').unlink(missing_ok=True)
        await b.close()


def card_desc(slug):
    home = (ROOT / 'index.html').read_text(encoding='utf-8')
    m = re.search(r'<a class="tool-card" href="/%s/">.*?<div class="tool-body">\s*<strong>.*?</strong>\s*<span>(.*?)</span>' % re.escape(slug), home, re.S)
    return text(m.group(1)) if m else ''


def main():
    force = '--images' in sys.argv
    files = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True,
                           encoding='utf-8').stdout.split()
    files = [f for f in files if not f.startswith('404')]
    # 새로 만든(아직 커밋 안 한) 도구 페이지도 포함
    for slug in TOOLS:
        for f in (f'{slug}/index.html', f'{slug}/guide/index.html'):
            if (ROOT / f).exists() and f not in files:
                files.append(f)
    jobs = []
    for rel in sorted(files):
        kind, key, title, image = process(rel)
        print(f'{kind:6s} {rel}')
        if kind == 'tool':
            name, cat, _, icon = TOOLS[key]
            jobs.append((OG_DIR / f'{key}.png', cat, CAT_COLOR[cat], name, card_desc(key), icon))
        elif kind == 'guide':
            src = (ROOT / rel).read_text(encoding='utf-8')
            raw = re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1)
            h1 = chr(10).join(text(x) for x in re.split(r'<br\s*/?>', raw))
            jobs.append((OG_DIR / f'{key}-guide.png', TOOLS[key][0] + ' 가이드', CAT_COLOR['가이드'], h1,
                         meta(src, 'property', 'og:description'), TOOLS[key][3]))
        elif kind == 'rates':
            src = (ROOT / rel).read_text(encoding='utf-8')
            fixed = {'rates': '기준금리·국채·예금 금리와 환율, 이번 주 금리가 움직인 이유를 한눈에 정리해요.',
                     'issuance': '은행채·여전채가 이번 주 얼마나, 몇 % 금리로 발행됐는지 정리해요.'}[key]
            jobs.append((OG_DIR / f'{key}.png', '매주 월요일 업데이트', CAT_COLOR['금리'], title.split(' — ')[0],
                         fixed, 'icon-calc.png'))
    asyncio.run(make_images(jobs, force))


if __name__ == '__main__':
    main()
