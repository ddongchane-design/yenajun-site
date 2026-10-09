# -*- coding: utf-8 -*-
"""예나준 사이트 점검 (E2E) — 실제 배포된 사이트를 브라우저로 열어 보고 문제를 찾는다.

  python scripts/check/site_check.py                # https://yenajun.com 점검
  python scripts/check/site_check.py --base http://localhost:8765 --report report.md

점검 항목
  1. 사이트맵의 모든 페이지: 열리는지(200), 제목·h1·canonical·애드센스 스크립트가 있는지,
     페이지 안에서 자바스크립트 오류가 나지 않는지, 구조화 데이터(JSON-LD)가 올바른 JSON인지
  2. 계산기: 기본값으로 결과 숫자가 화면에 나오는지
  3. 링크: 페이지 안의 내부 링크가 모두 열리는지
  4. 자동 갱신 데이터: 금리(주 1회)·수산시장 시세(매일)가 오래되지 않았는지

문제가 하나라도 있으면 종료 코드 1 (GitHub Actions에서 실패로 표시되고 이슈가 열림).
"""
import argparse
import asyncio
import json
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

KST = timezone(timedelta(hours=9))

# 계산기별로 "기본값만으로 숫자가 나와야 하는 곳". 파일·사진·생년월일처럼 사람이 넣어야 결과가 나오는
# 도구는 None — 열리고 오류가 없는지만 본다.
TOOLS = {
    '/lump-sum/': '#verdict',
    '/jeonse-wolse/': '#result',
    '/room-deduction/': '#verdict',
    '/yuryubun/': '#result',
    '/avg-down/': 'main, body',
    '/formula-mix/': 'main, body',
    '/fish-menu/': 'main, body',
    '/rates/': '#kpis, main, body',
    '/baby-name/': None,     # 성·생년월일 입력 필요
    '/nub-angle/': None,     # 초음파 사진 필요
    '/p2p-invest/': None,    # 엑셀 업로드 필요
    '/rsv-antibody/': None,  # 생년월일 입력 필요
    '/wedding-gift/': None,  # 관계·예식장 선택 필요
    '/mixed-feeding/': None, # 체중·월령 입력 필요
}
# 다른 회사 스크립트(광고·폰트·후원 위젯)에서 나는 오류는 우리 문제가 아니라 뺀다
THIRD_PARTY = ('googlesyndication', 'doubleclick', 'adtrafficquality', 'googleads', 'google.com/recaptcha',
               'fonts.g', 'gstatic', 'buymeacoffee', 'googletagmanager', 'google-analytics', 'cloudflareinsights')


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': 'yenajun-site-check/1.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def status_of(url):
    try:
        req = urllib.request.Request(url, method='GET', headers={'User-Agent': 'yenajun-site-check/1.0'})
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception as e:  # 연결 실패
        return f'{type(e).__name__}'


def sitemap_urls(base):
    _, body = fetch(base + '/sitemap.xml')
    locs = re.findall(r'<loc>([^<]+)</loc>', body.decode('utf-8'))
    # 사이트맵은 운영 주소로 적혀 있으니, 로컬 점검이면 주소 앞부분만 바꿔 연다
    return [base + urlparse(u).path for u in locs]


async def check_page(ctx, url, base, problems, links, info):
    path = urlparse(url).path
    pg = await ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(f'JS 오류: {e}'))

    def on_console(msg):
        if msg.type != 'error':
            return
        src = (msg.location or {}).get('url', '') or ''
        if any(t in src or t in msg.text for t in THIRD_PARTY):
            return
        errors.append(f'콘솔 오류: {msg.text[:160]}')
    pg.on('console', on_console)
    try:
        resp = await pg.goto(url, wait_until='load', timeout=45000)
        await pg.wait_for_timeout(1500)  # 데이터(json) 읽고 계산할 시간
    except Exception as e:
        problems.append(f'{path} — 열리지 않음: {type(e).__name__}')
        await pg.close()
        return
    if not resp or resp.status >= 400:
        problems.append(f'{path} — HTTP {resp.status if resp else "응답 없음"}')
    meta = await pg.evaluate("""() => ({
        title: document.title.trim(),
        h1: (document.querySelector('h1')||{}).textContent || '',
        canonical: (document.querySelector('link[rel=canonical]')||{}).href || '',
        ads: !!document.querySelector('script[src*="adsbygoogle.js"]'),
        desc: (document.querySelector('meta[name=description]')||{}).content || '',
        ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
        hrefs: [...document.querySelectorAll('a[href]')].map(a => a.href),
        words: document.body.innerText.replace(/\\s+/g, '').length,
    })""")
    if not meta['title']:
        problems.append(f'{path} — <title> 없음')
    if not meta['h1'].strip():
        problems.append(f'{path} — h1 없음')
    if not meta['desc']:
        problems.append(f'{path} — 검색 설명(meta description) 없음')
    if not meta['ads']:
        problems.append(f'{path} — 애드센스 스크립트 없음')
    want = 'https://yenajun.com' + path
    if meta['canonical'] and meta['canonical'].rstrip('/') != want.rstrip('/'):
        problems.append(f'{path} — canonical이 다른 주소를 가리킴: {meta["canonical"]}')
    for i, raw in enumerate(meta['ld']):
        try:
            json.loads(raw)
        except Exception as e:
            problems.append(f'{path} — 구조화 데이터 {i + 1}번째가 올바른 JSON이 아님: {e}')
    info.append((path, meta['words'], len(meta['ld'])))

    sel = TOOLS.get(path, 'skip')
    if sel not in ('skip', None):
        txt = ''
        for s in sel.split(', '):
            el = await pg.query_selector(s)
            if el:
                txt = (await el.inner_text()).strip()
                break
        if not re.search(r'\d', txt):
            problems.append(f'{path} — 기본값으로 결과 숫자가 안 나옴 ({sel})')
    for e in errors:
        problems.append(f'{path} — {e}')
    for h in meta['hrefs']:
        p = urlparse(h)
        if p.scheme in ('http', 'https') and p.netloc in (urlparse(base).netloc, 'yenajun.com'):
            links.setdefault(base + p.path, set()).add(path)
    await pg.close()


def check_data(base, problems, notes):
    now = datetime.now(KST)
    try:
        _, body = fetch(base + '/rates/data/latest.json')
        asof = datetime.strptime(json.loads(body)['asof'], '%Y-%m-%d').replace(tzinfo=KST)
        age = (now - asof).days
        notes.append(f'금리 자료 기준일 {asof:%Y-%m-%d} ({age}일 전)')
        if age > 10:  # 주 1회 갱신 + 주말 여유
            problems.append(f'금리 자료가 {age}일째 갱신 안 됨 (기준일 {asof:%Y-%m-%d}) — rates-weekly 워크플로 확인')
    except Exception as e:
        problems.append(f'금리 자료(rates/data/latest.json)를 읽지 못함: {e}')
    try:
        _, body = fetch(base + '/fish-menu/data/prices.json')
        gen = datetime.strptime(json.loads(body)['generated_at'][:10], '%Y-%m-%d').replace(tzinfo=KST)
        age = (now - gen).days
        notes.append(f'수산시장 시세 갱신일 {gen:%Y-%m-%d} ({age}일 전)')
        if age > 4:  # 매일(일요일 제외) 갱신 + 연휴 여유
            problems.append(f'수산시장 시세가 {age}일째 갱신 안 됨 — fish-prices 워크플로 확인')
    except Exception as e:
        problems.append(f'수산시장 시세(fish-menu/data/prices.json)를 읽지 못함: {e}')


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='https://yenajun.com')
    ap.add_argument('--report', default='')
    a = ap.parse_args()
    base = a.base.rstrip('/')
    problems, notes, info, links = [], [], [], {}

    urls = sitemap_urls(base)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1100, 'height': 900}, locale='ko-KR')
        for u in urls:
            await check_page(ctx, u, base, problems, links, info)
        # 사이트맵에 없는 계산기가 있으면 알려 줌
        listed = {urlparse(u).path for u in urls}
        for t in TOOLS:
            if t not in listed:
                problems.append(f'{t} — 사이트맵에 없음')
        await b.close()

    broken = []
    for link, froms in sorted(links.items()):
        st = status_of(link)
        if st != 200:
            broken.append(f'{urlparse(link).path} → {st} (있는 곳: {", ".join(sorted(froms)[:3])})')
    problems += [f'깨진 링크: {x}' for x in broken]
    check_data(base, problems, notes)

    thin = [f'{p} ({w:,}자)' for p, w, _ in info if w < 1500]
    no_ld = [p for p, _, n in info if n == 0]
    now = datetime.now(KST)
    lines = [f'# 예나준 사이트 점검 — {now:%Y-%m-%d %H:%M} KST', '',
             f'- 점검한 페이지 {len(info)}개 / 내부 링크 {len(links)}개',
             *[f'- {n}' for n in notes],
             '',
             f'## 문제 {len(problems)}건', *([f'- {x}' for x in problems] or ['- 없음 ✅']),
             '', '## 참고 (실패로 치지 않음)',
             f'- 글자 수 1,500자 미만 페이지: {", ".join(thin) or "없음"}',
             f'- 구조화 데이터 없는 페이지: {", ".join(no_ld) or "없음"}']
    report = '\n'.join(lines)
    print(report)
    if a.report:
        open(a.report, 'w', encoding='utf-8').write(report + '\n')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
