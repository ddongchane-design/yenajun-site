# -*- coding: utf-8 -*-
"""주간 금리 동향 — 데이터 출처별 수집 함수.

모두 표준 라이브러리만 쓴다(GitHub Actions에서 설치 없이 돌도록).
각 함수는 [(YYYY-MM-DD, float), ...] 처럼 날짜 오름차순 목록이나 dict를 돌려준다.
"""
import csv
import io
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'


def _get(url, data=None, headers=None, timeout=40, retries=5, ua=UA):
    h = {'User-Agent': ua}
    if headers:
        h.update(headers)
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # 네트워크 흔들림은 잠깐 쉬고 다시
            last = e
            time.sleep(2 * (i + 1))
    raise last


def _d(s):
    return datetime.strptime(s, '%Y-%m-%d').date()


def _iso(d):
    return d.strftime('%Y-%m-%d')


# ───────────────────────── 한국은행 ECOS ─────────────────────────
ECOS_KEY = os.environ.get('ECOS_API_KEY', '')


def ecos(stat, cycle, item, start, end):
    """cycle: D(YYYYMMDD) / M(YYYYMM) / Q(YYYYQn). 날짜는 문자열로 받는다."""
    if not ECOS_KEY:
        raise RuntimeError('ECOS_API_KEY 환경변수가 없어요')
    url = f'https://ecos.bok.or.kr/api/StatisticSearch/{ECOS_KEY}/json/kr/1/1000/{stat}/{cycle}/{start}/{end}/{item}'
    j = json.loads(_get(url).decode('utf-8'))
    rows = j.get('StatisticSearch', {}).get('row', [])
    out = []
    for r in rows:
        t = r['TIME']
        if cycle == 'D':
            k = f'{t[:4]}-{t[4:6]}-{t[6:]}'
        elif cycle == 'M':
            k = f'{t[:4]}-{t[4:6]}'
        else:
            k = t  # 2026Q2
        try:
            out.append((k, float(r['DATA_VALUE'])))
        except ValueError:
            pass
    return out


def ecos_daily(stat, item, asof, days=40):
    a = _d(asof)
    return ecos(stat, 'D', item, (a - timedelta(days=days)).strftime('%Y%m%d'), a.strftime('%Y%m%d'))


# ───────────────────────── 미국 재무부 (국채 CMT) ─────────────────────────
def treasury(asof):
    """{'1 Yr': [(date, v)], '3 Yr': ..., '10 Yr': ...} — 금요일 마감값이 FRED보다 하루 빨리 올라온다."""
    a = _d(asof)
    years = {a.year} | ({a.year - 1} if a.month == 1 else set())
    out = {}
    for y in sorted(years):
        url = ('https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/'
               f'{y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={y}&page&_format=csv')
        txt = _get(url).decode('utf-8-sig')
        for row in csv.DictReader(io.StringIO(txt)):
            m, d_, yy = row['Date'].split('/')
            k = f'{yy}-{m}-{d_}'
            for col in ('1 Yr', '3 Yr', '10 Yr'):
                v = (row.get(col) or '').strip()
                if v:
                    out.setdefault(col, []).append((k, float(v)))
    for col in out:
        out[col].sort()
    return out


# ───────────────────────── FRED (미국·유럽 기준금리) ─────────────────────────
def fred(series_id, asof, days=60):
    a = _d(asof)
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}&cosd={_iso(a - timedelta(days=days))}&coed={asof}'
    txt = _get(url, ua='yenajun-rates/1.0 (+https://yenajun.com)').decode('utf-8-sig')  # FRED는 브라우저 UA면 응답을 안 준다
    out = []
    for row in csv.reader(io.StringIO(txt)):
        if len(row) < 2 or row[0] in ('DATE', 'observation_date'):
            continue
        try:
            out.append((row[0], float(row[1])))
        except ValueError:
            pass
    return out


# ───────────────────────── BIS (일본·중국 정책금리, 일별) ─────────────────────────
def bis(country, asof, days=120):
    a = _d(asof)
    url = f'https://stats.bis.org/api/v1/data/WS_CBPOL/D.{country}?startPeriod={_iso(a - timedelta(days=days))}&endPeriod={asof}&format=csv'
    txt = _get(url).decode('utf-8-sig')
    out = []
    for row in csv.DictReader(io.StringIO(txt)):
        try:
            v = float(row['OBS_VALUE'])
        except (ValueError, KeyError):
            continue
        if v == v:  # nan 제외
            out.append((row['TIME_PERIOD'], v))
    out.sort()
    return out


# ───────────────────────── 금융투자협회 채권정보센터 ─────────────────────────
KOFIA_URL = 'https://www.kofiabond.or.kr/proframeWeb/XMLSERVICES/'
EVALUATORS = ['A10002', 'A10003', 'A10004', 'A10005', 'A10006']  # 나이스·한국자산·KIS·에프앤·이지


def _kofia(svc, fn, dto, fields):
    body = ('<?xml version="1.0" encoding="utf-8"?><message><proframeHeader>'
            f'<pfmAppName>BIS-KOFIABOND</pfmAppName><pfmSvcName>{svc}</pfmSvcName><pfmFnName>{fn}</pfmFnName>'
            f'</proframeHeader><systemHeader></systemHeader><{dto}>{fields}</{dto}></message>')
    s = _get(KOFIA_URL, data=body.encode('utf-8'),
             headers={'Content-Type': 'application/xml; charset=UTF-8', 'Referer': 'https://www.kofiabond.or.kr/'}).decode('utf-8')
    rows = []
    for block in re.findall(r'<(?:BISBndSrtPrcDayDTO|BISComDspDatDTO)>(.*?)</(?:BISBndSrtPrcDayDTO|BISComDspDatDTO)>', s, re.S):
        rows.append(dict(re.findall(r'<(\w+)>([^<]*)</\w+>', block)))
    return rows


BOND_MATS = {'1': 'val4', '2': 'val6', '3': 'val8', '4': 'val9', '5': 'val10'}  # 만기(년) → 열 (getHeadList 로 확인)
BOND_KINDS = {'fb2': '금융채 II', 'fb1': '금융채 I'}


def kofia_bond_table(day):
    """금융채 I(은행채)·II(여전채 등) 무보증, 등급별 1~5년물, 평가사 5곳 평균.
    {'fb2': {'AA+': {'1': 4.213, ...}}, 'fb1': {...}} — 결과 없으면 {}."""
    ymd = day.replace('-', '')
    ck = ''.join(f'<val{i + 1}>{c}</val{i + 1}>' for i, c in enumerate(EVALUATORS))
    rows = _kofia('BISBndSrtPrcSrchSO', 'selectDay', 'BISBndSrtPrcDayDTO',
                  f'<standardDt>{ymd}</standardDt><reportCompCd>A20000</reportCompCd><applyGbCd>C00</applyGbCd>{ck}')
    out = {}
    for r in rows:
        cat = r.get('largeCategoryMrk', '')
        kind = next((k for k, name in BOND_KINDS.items() if name + '(' in cat), None)
        if not kind or r.get('typeNmMrk') != '무보증':
            continue
        grade = r.get('creditRnkMrk')
        mats = {}
        for m, col in BOND_MATS.items():
            v = r.get(col, '')
            if v and v != '-':
                mats[m] = float(v)
        if mats:
            out.setdefault(kind, {})[grade] = mats
    return out


def kofia_card_bonds(day):
    """(호환용) 여전채 3년물 등급별 — kofia_bond_table 의 금융채 II 3년."""
    t = kofia_bond_table(day)
    return {g: m['3'] for g, m in t.get('fb2', {}).items() if '3' in m}


def kofia_cp(day, evaluator='A10004'):
    """CP 시가평가 1년물. 회사 엑셀 기준은 KIS자산평가(A10004) 단독."""
    ymd = day.replace('-', '')
    rows = _kofia('BISCPSrtPrcSrchSO', 'listDay', 'BISComDspDatDTO',
                  f'<val21>{ymd}</val21><val22>{evaluator}</val22><val23>T</val23>')
    out = {}
    for r in rows:
        if r.get('val2') == '당일' and r.get('val9') not in (None, '', '-'):
            out[r['val1']] = float(r['val9'])  # val9 = 1년
    return out


def kofia_latest(fn, day, back=10):
    """휴일이면 하루씩 당겨서 값이 있는 날을 찾는다. (값, 실제날짜)"""
    d = _d(day)
    for _ in range(back):
        if d.weekday() < 5:
            v = fn(_iso(d))
            if v:
                return v, _iso(d)
        d -= timedelta(days=1)
    return {}, None


# ───────────────────────── 저축은행중앙회 정기예금 공시 ─────────────────────────
def fsb_deposits(day, months='12'):
    """조회일 기준 모든 저축은행 정기예금 상품. 2026-01-22 이후만 이 화면에서 제공."""
    y, m, d_ = day.split('-')
    data = {"REG_DATE": day, "CHG_DATE": day, "AREA": "", "SELECT_YEAR": y, "SELECT_MONTH": m, "SELECT_DAY": d_,
            "TB_SEQ1": "", "TB_SEQ2": "", "TB_SEQ3": "", "ORDERBY": "", "JOIN_LOCATION": "1|2|3|4|5|9",
            "CHK_MONTH": months, "END_NUM": "100000", "START_NUM": "1", "SEARCH_CODE": "DAN",
            "SEARCH_SELECT_IN": "", "SEARCH_TEXT_IN": ""}
    body = '_JSON_=' + urllib.parse.quote(urllib.parse.quote(json.dumps(data, separators=(',', ':'), ensure_ascii=False)))
    raw = _get('https://www.fsb.or.kr/ratedepo_0100_01.jct', data=body.encode('utf-8'),
               headers={'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://www.fsb.or.kr/ratedepo_0100.act'})
    j = json.loads(raw.decode('utf-8'))
    out = []
    for r in j.get('REC', []):
        def f(k):
            v = r.get(k)
            try:
                return float(v)
            except (TypeError, ValueError):
                return None
        out.append({
            'bank': (r.get('BANK_NAME') or '').strip(),
            'product': (r.get('PRODUCT_NAME') or '').strip(),
            'channels': (r.get('JOIN_LOCATION') or '').replace(' ', ''),
            'base': f(f'JUNG_{months}M_DAN'),
            'max': f(f'TOP_{months}M_DAN'),
            'changed': (r.get('CHG_DATE') or '')[:10],
            'url': (r.get('PRODUCT_URL') or r.get('URL') or '').strip(),
        })
    return out


CHANNELS = {'1': '영업점', '2': '인터넷', '3': '스마트폰', '4': '모집인', '5': '전화', '9': '기타'}
_EXCLUDE = ('회전', '특판', 'e-', 'm-', 'E-', 'M-', '모바일', '앱', '비대면', '인터넷', '스마트', '디지털')


def basic_product(products):
    """은행의 '창구 기본 정기예금' 하나 고르기: 영업점 가입 가능, 이름에 정기예금, 특수상품 제외, 이름이 가장 짧은 것.
    9/23 회사 엑셀 5곳(SBI·OK·한국투자·웰컴·애큐온)과 일치 확인."""
    cand = [p for p in products if '1' in p['channels'].split(',') and '정기예금' in p['product']
            and not any(x in p['product'] for x in _EXCLUDE) and p['base'] is not None]
    if not cand:
        cand = [p for p in products if '1' in p['channels'].split(',') and p['base'] is not None]
    if not cand:
        return None
    return sorted(cand, key=lambda p: (len(p['product']), p['product']))[0]


# ───────────────────────── 금융감독원 저축은행 핵심경영지표(총자산) ─────────────────────────
ALIAS = {'에스비아이': 'SBI', '오케이': 'OK', '디비': 'DB', '비엔케이': 'BNK', '디에이치': 'DH', '아이비케이': 'IBK',
         '제이티': 'JT', '제이티친애': 'JT친애', '케이비': 'KB', '엔에이치': 'NH', '오에스비': 'OSB', '에이치비': 'HB',
         '씨케이': 'CK', '키움예스': '키움YES'}


def norm_bank(n):
    n = n.replace('상호저축은행', '').replace('저축은행', '').replace(' ', '').strip()
    return ALIAS.get(n, n)


def fss_assets():
    """(기준일, {은행: 총자산(백만원)}) 최신 분기."""
    h = {'Referer': 'https://fine.fss.or.kr/'}
    info = _get('https://fisis.fss.or.kr/fss/wa/fsv051_getReportInfo.do?rc=SDCE001&callback=cb', headers=h).decode('utf-8')
    info = json.loads(info[info.index('(') + 1:info.rindex(')')])
    my = info['dateValue'][-1]
    s = _get(f'https://fisis.fss.or.kr/fss/wa/fsv050_getReportData.do?rc=SDCE001&my={my}&callback=cb', headers=h).decode('utf-8')
    j = json.loads(s[s.index('(') + 1:s.rindex(')')])
    out = {}
    for r in re.findall(r'<tr[^>]*>(.*?)</tr>', j['DATA'], re.S):
        c = [re.sub(r'<[^>]+>|\s+', ' ', x).strip() for x in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)]
        if len(c) >= 2 and '저축은행' in c[0] and c[0] != '저축은행':
            try:
                out[norm_bank(c[0])] = float(c[1].replace(',', ''))
            except ValueError:
                pass
    return j.get('DATE', '').replace('.', '-'), out


# ───────────────────────── 은행연합회 COFIX ─────────────────────────
def cofix(year):
    """[(공시일, 대상월, 신규취급액, 잔액, 신잔액)]"""
    url = f'https://portal.kfb.or.kr/fingoods/cofix.php?BasicYear={year}'
    s = _get(url).decode('cp949', errors='replace')
    t = re.sub(r'(?s)<script.*?</script>|<style.*?</style>', '', s)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    out = []
    for m in re.finditer(r'(\d{4})/(\d{2})/(\d{2}) (\d{4})/(\d{2}) (\d+\.\d+) (\d+\.\d+) (\d+\.\d+)', t):
        out.append((f'{m[1]}-{m[2]}-{m[3]}', f'{m[4]}-{m[5]}', float(m[6]), float(m[7]), float(m[8])))
    return sorted(set(out))


# ───────────────────────── 기준금리: 적용일 → 결정(발표)일 ─────────────────────────
# FRED·BIS 자료는 '적용일'에 값이 바뀐다. 보고서는 결정일 기준이 맞아서 되돌려 계산한다.
#   미국 연준: 결정 다음 날 적용 → 하루 전 평일
#   유럽 ECB: 목요일 결정, 다음 주 수요일 적용 → 6일 전
#   일본은행: 결정 다음 영업일 적용 → 일본 휴일을 건너 직전 영업일
# (2024~2026년 실제 결정일 9건과 대조 확인)
def _prev_business_day(d, hol):
    d -= timedelta(days=1)
    while d.weekday() >= 5 or d in hol:
        d -= timedelta(days=1)
    return d


def policy_decisions(series, bank):
    """[(적용일, 값)] → (결정일 기준 [(날짜, 값)], [(결정일, 적용일, 이전값, 새값)])."""
    try:
        import holidays
        jp = holidays.JP(years=range(2015, 2040))
    except Exception:  # 라이브러리가 없으면 주말만 건너뜀
        jp = set()
    changes, prev = [], None
    for k, v in series:
        if prev is not None and v != prev:
            e = _d(k)
            if bank == 'fed':
                dd = _prev_business_day(e, set())
            elif bank == 'ecb':
                dd = e - timedelta(days=6)
            elif bank == 'boj':
                dd = _prev_business_day(e, jp)
            else:
                dd = e
            changes.append((_iso(dd), k, prev, v))
        prev = v
    if not series:
        return series, changes
    out = []
    for k, v in series:
        # 결정일 이후·적용일 이전 구간은 새 값으로 본다
        for dd, e, old, new in changes:
            if dd <= k < e:
                v = new
        out.append((k, v))
    # 결정일 자체가 자료에 없으면(주말 등) 그날 값을 넣어 둔다
    have = {k for k, _ in out}
    for dd, e, old, new in changes:
        if dd not in have:
            out.append((dd, new))
    out.sort()
    return out, changes


def latest_on_or_before(series, asof):
    """[(date, v)] 에서 asof 이하의 마지막 값. (date, v) 또는 (None, None)."""
    best = (None, None)
    for k, v in series:
        if k <= asof:
            best = (k, v)
    return best


# ───────────────────────── 예탁결제원 SEIBro 금융채 발행 ─────────────────────────
SEIBRO_URL = 'https://seibro.or.kr/websquare/engine/proworks/callServletService.jsp'
# 채권 종류 코드 → 큰 묶음
SEIBRO_GROUP = {'110521': '은행채', '110531': '은행채', '110541': '여전채', '110542': '여전채', '110543': '여전채',
                '110544': '여전채', '110511': '통안채'}


def seibro_issues(start, end):
    """발행일 start~end(YYYY-MM-DD) 금융채 발행 종목. 만기가 아직 안 된 종목만 나온다(SEIBro 제약)."""
    params = dict(ISSU_DT_START=start.replace('-', ''), ISSU_DT_END=end.replace('-', ''), XPIR_DT_START='', XPIR_DT_END='',
                  ISSUCO_CUSTNO='', ISIN='', CUST_SORT_NO='', SELECT_XPIR_DT_START='', SELECT_XPIR_DT_END='',
                  COUPON_RATE1='', COUPON_RATE2='', CREDIT_GRD_CD='', RANK_TPCD='', PAGE_ON_CNT='3000', PAGE_NUM='1',
                  INT_PAY_TPCD='', SECN_DTAIL_KACD='')
    body = ('<reqParam action="issuSecnPListEL1" task="ksd.safe.bip.cnts.bone.process.FbondIssuSecnPTask">'
            + ''.join(f'<{k} value="{v}"/>' for k, v in params.items()) + '</reqParam>')
    s = _get(SEIBRO_URL, data=body.encode('utf-8'),
             headers={'Content-Type': 'application/xml; charset=UTF-8',
                      'Referer': 'https://seibro.or.kr/websquare/control.jsp?w2xPath=/IPORTAL/user/bond/BIP_CNTS03016V.xml&menuNo=100'},
             timeout=90).decode('utf-8')
    out = []
    for block in re.findall(r'<result>(.*?)</result>', s, re.S):
        r = dict(re.findall(r'<(\w+) value="([^"]*)"', block))
        if not r.get('ISIN'):
            continue

        def num(k):
            try:
                return float(r.get(k) or '')
            except ValueError:
                return None
        idt, xdt = r.get('ISSU_DT', ''), r.get('XPIR_DT', '')
        years = None
        if len(idt) == 8 and len(xdt) == 8:
            years = round((datetime.strptime(xdt, '%Y%m%d') - datetime.strptime(idt, '%Y%m%d')).days / 365.25, 2)
        out.append({
            'issuer': r.get('REP_SECN_NM', ''), 'name': r.get('KOR_SECN_NM', ''), 'isin': r['ISIN'],
            'kind': r.get('SECN_DTAIL', ''), 'kind_cd': r.get('SECN_DTAIL_KACD', ''),
            'group': SEIBRO_GROUP.get(r.get('SECN_DTAIL_KACD', ''), '기타'),
            'issued': f'{idt[:4]}-{idt[4:6]}-{idt[6:]}' if len(idt) == 8 else idt,
            'maturity': f'{xdt[:4]}-{xdt[4:6]}-{xdt[6:]}' if len(xdt) == 8 else xdt, 'years': years,
            'amount': num('FIRST_ISSU_AMT'), 'coupon': num('COUPON_RATE'), 'int_kind': r.get('INT_KIND', ''),
            'grade': (r.get('KIS_APLI_CREDIT_GRD_CD_NM') or '').split('(')[0], 'senior': r.get('RANK_TPCD') == '1',
        })
    return out
