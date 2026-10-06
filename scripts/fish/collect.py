# -*- coding: utf-8 -*-
"""노량진수산시장 '오늘의 경락시세'를 받아 수산시장 메뉴 구성기 가격 자료를 만든다.

  python collect.py              # 아직 안 받은 최근 거래일만 받아 갱신 (매일 아침 예약 실행)
  python collect.py --days 15    # 최근 15일 범위를 다시 훑기 (처음 한 번)

출처: 노량진수산주식회사 https://www.susansijang.co.kr/nsis/mim/info/mim9030
 - 공개 페이지(로그인 없음). 하루치가 20줄씩 20~30쪽이라, 쪽 사이에 쉬어 가며 받는다.
 - 경매(도매) 낙찰가다. 소매가는 화면에서 따로 범위로 추정한다.

결과
 fish-menu/data/auction.json  최근 거래일별 원자료 (kg 단위 줄만)  {"days": {"YYYY-MM-DD": [[어종, 산지, 규격, kg, 고가, 저가, 평균], ...]}}
 fish-menu/data/prices.json   어종별 최근 7거래일 물량가중 평균      화면이 읽는 파일
"""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'fish-menu' / 'data'
URL = 'https://www.susansijang.co.kr/nsis/mim/info/mim9030'
KST = timezone(timedelta(hours=9))
KEEP_DAYS = 20        # auction.json 에 남겨 둘 거래일 수
WINDOW = 7            # 평균 낼 최근 거래일 수
PAUSE = 0.4           # 쪽 사이 쉬는 시간(초)
IMPORT = ('일본', '중국', '러시아', '노르웨이', '캐나다', '미국', '칠레', '베트남', '호주', '뉴질랜드', '필리핀', '인도네시아',
          '태국', '대만', '페루', '아르헨티나', '스페인', '모로코', '터키', '튀르키예', '영국', '아이슬란드', '파키스탄', '인도')


def fetch_page(day, page):
    body = urllib.parse.urlencode({'pageIndex': page, 'pageUnit': 20, 'searchYear': day[:4], 'searchMonth': day[5:7],
                                   'searchDate': day[8:10], 'searchItem': ''}).encode()
    req = urllib.request.Request(URL, data=body, headers={'User-Agent': 'Mozilla/5.0 (yenajun.com fish-menu)',
                                                          'Content-Type': 'application/x-www-form-urlencoded'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'ignore')
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3)


def parse(s):
    rows = []
    for tr in re.findall(r'<tr>(.*?)</tr>', s, re.S):
        tds = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', t))).strip() for t in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.S)]
        if len(tds) == 8:
            rows.append(tds)
    m = re.findall(r'(\d+)\s*/\s*(\d+)\s*다음', re.sub(r'<[^>]+>', ' ', s))
    last = int(m[-1][1]) if m else 1
    return rows, last


def num(x):
    try:
        return float(x.replace(',', ''))
    except ValueError:
        return None


def fetch_day(day):
    """그날 kg 단위 낙찰 줄 전부. 경매가 없던 날은 빈 목록."""
    out, page, last = [], 1, 1
    while page <= last:
        rows, last = parse(fetch_page(day, page))
        for name, origin, size, pack, qty, hi, lo, avg in rows:
            if pack != 'kg':
                continue   # S/P(상자)·그물망 단위는 kg 값이 아니라서 뺀다
            q, h, l, a = num(qty), num(hi), num(lo), num(avg)
            if q and a:
                out.append([name, origin, size, q, h, l, a])
        page += 1
        if page <= last:
            time.sleep(PAUSE)
    return out


def summarize(days):
    """어종별 최근 WINDOW 거래일 물량가중 평균 (국산·수입 따로도)."""
    dates = sorted(days)[-WINDOW:]
    agg = {}
    for d in dates:
        for name, origin, size, q, h, l, a in days[d]:
            it = agg.setdefault(name, {'kg': 0.0, 'amt': 0.0, 'lo': None, 'hi': None, 'dates': set(), 'org': {}})
            it['kg'] += q
            it['amt'] += q * a
            it['lo'] = l if it['lo'] is None else min(it['lo'], l)
            it['hi'] = h if it['hi'] is None else max(it['hi'], h)
            it['dates'].add(d)
            side = 'import' if any(origin.startswith(c) for c in IMPORT) else 'domestic'
            o = it['org'].setdefault(side, {'kg': 0.0, 'amt': 0.0})
            o['kg'] += q
            o['amt'] += q * a
    items = {}
    for name, it in sorted(agg.items()):
        rec = {'avg': round(it['amt'] / it['kg']), 'lo': it['lo'], 'hi': it['hi'], 'kg': round(it['kg'], 1),
               'days': len(it['dates']), 'last': max(it['dates'])}
        for side, o in it['org'].items():
            rec[side] = {'avg': round(o['amt'] / o['kg']), 'kg': round(o['kg'], 1)}
        items[name] = rec
    return {'window': [dates[0], dates[-1]] if dates else None, 'trading_days': len(dates), 'items': items}


def main(argv):
    DATA.mkdir(parents=True, exist_ok=True)
    ap = DATA / 'auction.json'
    store = json.loads(ap.read_text(encoding='utf-8')) if ap.exists() else {'days': {}}
    look = int(argv[argv.index('--days') + 1]) if '--days' in argv else 6
    today = datetime.now(KST).date()
    got = []
    for i in range(look, -1, -1):
        d = today - timedelta(days=i)
        if d.weekday() == 6:      # 일요일은 경매 없음
            continue
        ds = d.isoformat()
        if ds in store['days'] and ds != today.isoformat():
            continue              # 이미 받은 지난 날은 다시 안 받는다
        rows = fetch_day(ds)
        if rows:
            store['days'][ds] = rows
            got.append((ds, len(rows)))
        time.sleep(PAUSE)
    store['days'] = {d: store['days'][d] for d in sorted(store['days'])[-KEEP_DAYS:]}
    store['source'] = URL
    ap.write_text(json.dumps(store, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    summary = summarize(store['days'])
    summary.update({'source': '노량진수산주식회사 오늘의 경락시세', 'source_url': URL,
                    'generated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M'),
                    'note': '경매(도매) 낙찰가, kg 단위 거래만, 최근 거래일 물량가중 평균'})
    (DATA / 'prices.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding='utf-8')
    print('새로 받은 날:', got or '없음', '| 평균 구간:', summary['window'], '| 어종', len(summary['items']))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
