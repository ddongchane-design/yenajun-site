# -*- coding: utf-8 -*-
"""주간 금리 동향 수집기.

  python collect.py weekly                 # 지난 영업일 기준으로 이번 주 값을 받아 rates/data/ 갱신
  python collect.py weekly --asof 2026-10-02
  python collect.py backfill 2026-09-18 2026-09-23 ...   # 지정한 날짜들로 history.json 다시 만들기

값은 모두 '%'(예: 3.937) 또는 원 단위 숫자로 저장하고, 표시 자릿수는 SERIES의 dp로 정한다.
"""
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import sources as S

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'rates' / 'data'
KST = timezone(timedelta(hours=9))
FSB_FROM = '2026-01-22'  # 저축은행중앙회 현재 화면이 제공하는 첫 날

# (id, 이름, 그룹, 표시 소수자리, 단위)
SERIES = [
    ('kr_base', '한국 (BOK)', 'policy', 2, '%'),
    ('us_fed', '미국 (Fed, 상단)', 'policy', 2, '%'),
    ('ecb', '유럽 (ECB)', 'policy', 2, '%'),
    ('boj', '일본 (BOJ)', 'policy', 2, '%'),
    ('pboc', '중국 (PBOC, LPR 1년)', 'policy', 2, '%'),
    ('ktb1', '국고채 1년', 'gov', 3, '%'),
    ('ktb3', '국고채 3년', 'gov', 3, '%'),
    ('ktb10', '국고채 10년', 'gov', 3, '%'),
    ('ust1', '미국채 1년', 'gov', 2, '%'),
    ('ust3', '미국채 3년', 'gov', 2, '%'),
    ('ust10', '미국채 10년', 'gov', 2, '%'),
    ('call', '콜금리 (1일)', 'money', 3, '%'),
    ('cd91', 'CD (91일)', 'money', 2, '%'),
    ('cofix', 'COFIX (신규취급액)', 'money', 2, '%'),
    ('corp_bbb', '회사채 3년 BBB-', 'corp', 3, '%'),
    ('corp_aa', '회사채 3년 AA-', 'corp', 3, '%'),
    ('card_A0', '여전채 3년 A0', 'card', 3, '%'),
    ('card_A+', '여전채 3년 A+', 'card', 3, '%'),
    ('card_AA-', '여전채 3년 AA-', 'card', 3, '%'),
    ('card_AA+', '여전채 3년 AA+', 'card', 3, '%'),
    ('cp_A3', 'CP 1년 A3', 'cp', 2, '%'),
    ('cp_A2+', 'CP 1년 A2+', 'cp', 2, '%'),
    ('cp_A1', 'CP 1년 A1', 'cp', 2, '%'),
    ('cp_A3-', 'CP 1년 A3-', 'cp', 2, '%'),  # 아래 4개는 화면 필터에서 골라 보는 추가 등급
    ('cp_A3+', 'CP 1년 A3+', 'cp', 2, '%'),
    ('cp_A2-', 'CP 1년 A2-', 'cp', 2, '%'),
    ('cp_A2', 'CP 1년 A2', 'cp', 2, '%'),
    ('sb_avg', '상위 5개 평균', 'savings', 2, '%'),
    ('sb_1', '자산 1위', 'savings', 2, '%'),
    ('sb_2', '자산 2위', 'savings', 2, '%'),
    ('sb_3', '자산 3위', 'savings', 2, '%'),
    ('sb_4', '자산 4위', 'savings', 2, '%'),
    ('sb_5', '자산 5위', 'savings', 2, '%'),
    ('kospi', '코스피', 'market', 2, 'pt'),
    ('kosdaq', '코스닥', 'market', 2, 'pt'),
    ('usdkrw', '원/미국달러', 'market', 1, '원'),
    ('cnykrw', '원/위안', 'market', 2, '원'),
    ('jpykrw', '원/일본엔 (100엔)', 'market', 2, '원'),
    ('eurkrw', '원/유로', 'market', 2, '원'),
    ('household', '가계신용', 'macro', 1, '십억원'),
    ('m2', 'M2 (평잔, 원계열)', 'macro', 1, '십억원'),
]

GROUPS = [
    ('policy', '중앙은행 기준금리', '각국 중앙은행 발표, 일별 기준'),
    ('gov', '국채 금리', '한국은행 ECOS · 미국 재무부'),
    ('money', '콜금리 · CD · COFIX', '한국은행 ECOS · 은행연합회'),
    ('corp', '회사채 3년물', '한국은행 ECOS (금융투자협회 최종호가수익률)'),
    ('card', '여전채 민평금리 (3년물)', '금융투자협회 채권정보센터 · 평가사 5곳 평균'),
    ('cp', '기업어음(CP) 1년물', '금융투자협회 채권정보센터 · KIS자산평가'),
    ('savings', '저축은행 정기예금 (1년, 창구 기본상품)', '저축은행중앙회 · 자산순위는 금융감독원'),
    ('market', '국내 증시 · 환율', '한국은행 ECOS (한국거래소 종가 · 서울외국환중개 매매기준율)'),
    ('macro', '가계부채 · 통화량', '한국은행 ECOS (분기)'),
]

# 저축은행 상위 5곳을 FSB 화면이 없는 날(2026-01-22 이전)에 쓰는 고정 순서 — 회사 엑셀과 같은 5곳
SB_FALLBACK = ['SBI', 'OK', '한국투자', '웰컴', '애큐온']


def last_business_day(today=None):
    """일요일·월요일에 돌리면 직전 금요일. 실제 휴일은 각 출처의 '그날 이하 마지막 값'으로 자연히 걸러진다."""
    d = (today or datetime.now(KST).date()) - timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.strftime('%Y-%m-%d')


def _quarter_ready(q, asof, lag_days=55):
    """'2026Q2' 자료가 asof 시점에 이미 발표됐을지(분기말 + 약 55일)."""
    y, n = int(q[:4]), int(q[-1])
    end = date(y, 3 * n, 30 if n in (2, 3) else 31)
    return end + timedelta(days=lag_days) <= datetime.strptime(asof, '%Y-%m-%d').date()


class Collector:
    def __init__(self, asofs):
        self.asofs = sorted(asofs)
        self.lo = (datetime.strptime(self.asofs[0], '%Y-%m-%d') - timedelta(days=60)).strftime('%Y-%m-%d')
        self.hi = self.asofs[-1]
        self.cache = {}
        self.errors = []

    def _once(self, key, fn):
        if key not in self.cache:
            try:
                self.cache[key] = fn()
            except Exception as e:
                self.errors.append(f'{key}: {type(e).__name__} {e}')
                self.cache[key] = None
        return self.cache[key]

    # 긴 구간을 한 번에 받아 두고 날짜별로 꺼내 쓴다
    def ecos_d(self, stat, item):
        return self._once(('ecos', stat, item), lambda: S.ecos(stat, 'D', item, self.lo.replace('-', ''), self.hi.replace('-', ''))) or []

    def treasury(self):
        def run():
            out = {}
            for y in range(int(self.lo[:4]), int(self.hi[:4]) + 1):
                part = S.treasury(f'{y}-12-31' if y < int(self.hi[:4]) else self.hi)
                for k, v in part.items():
                    out.setdefault(k, []).extend(v)
            return {k: sorted(set(v)) for k, v in out.items()}
        return self._once('treasury', run) or {}

    # 기준금리는 '적용일'이 기준일보다 뒤일 수 있어서 항상 오늘까지 받는다
    def _today(self):
        return datetime.now(KST).strftime('%Y-%m-%d')

    def fred(self, sid):
        days = (datetime.strptime(self._today(), '%Y-%m-%d') - datetime.strptime(self.lo, '%Y-%m-%d')).days + 5
        return self._once(('fred', sid), lambda: S.fred(sid, self._today(), days=days)) or []

    def bis(self, c):
        days = (datetime.strptime(self._today(), '%Y-%m-%d') - datetime.strptime(self.lo, '%Y-%m-%d')).days + 5
        return self._once(('bis', c), lambda: S.bis(c, self._today(), days=days)) or []

    def cofix(self):
        def run():
            rows = []
            for y in range(int(self.lo[:4]), int(self.hi[:4]) + 1):
                rows += S.cofix(y)
            return sorted(set(rows))
        return self._once('cofix', run) or []

    def ecos_q(self, stat, item):
        return self._once(('ecosq', stat, item), lambda: S.ecos(stat, 'Q', item, f'{int(self.lo[:4]) - 1}Q1', f'{self.hi[:4]}Q4')) or []

    def ecos_m(self, stat, item):
        return self._once(('ecosm', stat, item), lambda: S.ecos(stat, 'M', item, f'{int(self.lo[:4]) - 1}01', self.hi[:4] + '12')) or []

    def policy(self, asof):
        """중앙은행 기준금리 5개. 미국·유럽·일본은 결정(발표)일 기준으로 되돌려서 쓴다."""
        out = {}
        for sid, raw, bank in [('kr_base', self.ecos_d('722Y001', '0101000'), None), ('pboc', self.bis('CN'), None),
                               ('us_fed', self.fred('DFEDTARU'), 'fed'), ('ecb', self.fred('ECBMRRFR'), 'ecb'),
                               ('boj', self.bis('JP'), 'boj')]:
            ser, chg = S.policy_decisions(raw, bank) if bank else (raw, [])
            d, v = S.latest_on_or_before(ser, asof)
            if v is None:
                continue
            out[sid] = {'v': v, 'd': d}
            last = [c for c in chg if c[0] <= asof]
            if last:
                dd, e, old, new = last[-1]
                if (datetime.strptime(asof, '%Y-%m-%d') - datetime.strptime(dd, '%Y-%m-%d')).days <= 31:
                    out[sid]['note'] = f'{int(dd[5:7])}/{int(dd[8:])} 결정 · {int(e[5:7])}/{int(e[8:])} 적용'
        return out

    def snapshot(self, asof, with_savings_detail=False):
        """{series_id: {'v': 값, 'd': 그 값의 날짜}}"""
        out = {}
        pick = S.latest_on_or_before

        def put(sid, series):
            d, v = pick(series, asof)
            if v is not None:
                out[sid] = {'v': v, 'd': d}

        out.update(self.policy(asof))
        for sid, item in [('ktb1', '010190000'), ('ktb3', '010200000'), ('ktb10', '010210000'),
                          ('call', '010101000'), ('cd91', '010502000'),
                          ('corp_aa', '010300000'), ('corp_bbb', '010320000')]:
            put(sid, self.ecos_d('817Y002', item))
        put('kospi', self.ecos_d('802Y001', '0001000'))
        put('kosdaq', self.ecos_d('802Y001', '0089000'))
        for sid, item in [('usdkrw', '0000001'), ('cnykrw', '0000053'), ('jpykrw', '0000002'), ('eurkrw', '0000003')]:
            put(sid, self.ecos_d('731Y001', item))  # 매매기준율
        t = self.treasury()
        for sid, col in [('ust1', '1 Yr'), ('ust3', '3 Yr'), ('ust10', '10 Yr')]:
            put(sid, t.get(col, []))
        cf = [r for r in self.cofix() if r[0] <= asof]
        if cf:
            out['cofix'] = {'v': cf[-1][2], 'd': cf[-1][0], 'note': f'{cf[-1][1]} 대상월'}

        bt, cd = self.bonds(asof)
        for g in ('A0', 'A+', 'AA-', 'AA+'):
            v = bt.get('fb2', {}).get(g, {}).get('3')
            if v is not None:
                out[f'card_{g}'] = {'v': v, 'd': cd}
        cp, cpd = self._once(('cp', asof), lambda: S.kofia_latest(S.kofia_cp, asof)) or ({}, None)
        for g in ('A1', 'A2+', 'A2', 'A2-', 'A3+', 'A3', 'A3-'):
            if g in cp:
                out[f'cp_{g}'] = {'v': cp[g], 'd': cpd}

        hh = [(q, v) for q, v in self.ecos_q('151Y001', '1000000') if _quarter_ready(q, asof)]
        if hh:
            out['household'] = {'v': hh[-1][1], 'd': hh[-1][0]}
        m2 = [(m, v) for m, v in self.ecos_m('161Y006', 'BBHA00') if m[5:] in ('03', '06', '09', '12')]
        m2 = [(f'{m[:4]}Q{int(m[5:]) // 3}', v) for m, v in m2]
        m2 = [(q, v) for q, v in m2 if _quarter_ready(q, asof)]
        if m2:
            out['m2'] = {'v': m2[-1][1], 'd': m2[-1][0]}

        detail = None
        if asof >= FSB_FROM:
            detail = self.savings(asof, full=with_savings_detail)
            if detail:
                for i, b in enumerate(detail['top5'], 1):
                    out[f'sb_{i}'] = {'v': b['base'], 'd': detail['asof'], 'name': b['bank'], 'product': b['basic_product']}
                out['sb_avg'] = {'v': round(sum(b['base'] for b in detail['top5']) / len(detail['top5']), 4), 'd': detail['asof']}
        return out, detail

    def bonds(self, asof):
        """금융채 I·II 등급×만기 표와 실제 날짜(휴일이면 앞당김)."""
        return self._once(('bonds', asof), lambda: S.kofia_latest(S.kofia_bond_table, asof)) or ({}, None)

    def assets(self):
        return self._once('fss', S.fss_assets) or ('', {})

    def savings(self, asof, full=False):
        prods = self._once(('fsb', asof), lambda: S.fsb_deposits(asof))
        if not prods:
            return None
        adate, assets = self.assets()
        by_bank = {}
        for p in prods:
            by_bank.setdefault(p['bank'], []).append(p)
        banks = []
        for name, ps in by_bank.items():
            bp = S.basic_product(ps)
            rates = [p['max'] for p in ps if p['max'] is not None]
            banks.append({
                'bank': name,
                'assets': assets.get(S.norm_bank(name)),
                'basic_product': bp['product'] if bp else None,
                'base': bp['base'] if bp else None,
                'best': max(rates) if rates else None,
                'products': sorted(({'product': p['product'], 'channels': [S.CHANNELS.get(c, c) for c in p['channels'].split(',') if c],
                                     'base': p['base'], 'max': p['max'], 'changed': p['changed'], 'url': p['url']} for p in ps),
                                   key=lambda x: -(x['max'] or 0)) if full else None,
            })
        banks.sort(key=lambda b: -(b['assets'] or 0))
        for i, b in enumerate(banks, 1):
            b['rank'] = i if b['assets'] else None
        top5 = [b for b in banks if b['base'] is not None and b['assets']][:5]
        return {'asof': asof, 'assets_asof': adate, 'banks': banks, 'top5': top5}


def quarterly(asof, c):
    """엑셀 8·9번 표용: 2021년 1분기부터 발표된 분기 값 전부."""
    out = {}
    try:
        hh = S.ecos('151Y001', 'Q', '1000000', '2021Q1', f'{asof[:4]}Q4')
        out['household'] = [[q, v] for q, v in hh if _quarter_ready(q, asof)]
        m2 = S.ecos('161Y006', 'M', 'BBHA00', '202101', asof[:4] + '12')
        m2 = [(f'{m[:4]}Q{int(m[5:]) // 3}', v) for m, v in m2 if m[5:] in ('03', '06', '09', '12')]
        out['m2'] = [[q, v] for q, v in m2 if _quarter_ready(q, asof)]
    except Exception as e:
        c.errors.append(f'quarterly: {e}')
    return out


def fmt_change(cur, prev):
    if cur is None or prev is None:
        return None
    return round((cur - prev) * 100, 1)  # bp


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding='utf-8')


def load_history():
    p = DATA / 'history.json'
    if p.exists():
        return json.loads(p.read_text(encoding='utf-8'))
    return {'weeks': []}


def load_json(name):
    p = DATA / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'weeks': []}


def save_week(hist, asof, snap):
    weeks = [w for w in hist['weeks'] if w['asof'] != asof]
    weeks.append({'asof': asof, 'values': snap})
    weeks.sort(key=lambda w: w['asof'])
    hist['weeks'] = weeks
    return hist


def build_latest(hist, detail, errors):
    weeks = hist['weeks']
    cur = weeks[-1]
    prev = weeks[-2] if len(weeks) > 1 else None
    groups = []
    for gid, title, src in GROUPS:
        items = []
        for sid, name, g, dp, unit in SERIES:
            if g != gid:
                continue
            c = cur['values'].get(sid)
            p = prev['values'].get(sid) if prev else None
            label = name
            if gid == 'savings' and c and c.get('name'):
                label = f"{c['name']}" + (f" · {c.get('product')}" if c.get('product') else '')
            items.append({'id': sid, 'name': label, 'dp': dp, 'unit': unit,
                          'value': c['v'] if c else None, 'date': c['d'] if c else None, 'note': (c or {}).get('note'),
                          'prev': p['v'] if p else None, 'prev_date': p['d'] if p else None,
                          'change_bp': fmt_change(c['v'] if c else None, p['v'] if p else None) if unit == '%' else None,
                          'change_pct': round((c['v'] / p['v'] - 1) * 100, 2) if unit in ('pt', '원') and c and p and p['v'] else None})
        groups.append({'id': gid, 'title': title, 'source': src, 'items': items})
    return {
        'asof': cur['asof'],
        'prev_asof': prev['asof'] if prev else None,
        'generated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M'),
        'groups': groups,
        'errors': errors,
    }


def main(argv):
    if not argv or argv[0] not in ('weekly', 'backfill'):
        print(__doc__)
        return 1
    if argv[0] == 'weekly':
        asof = argv[argv.index('--asof') + 1] if '--asof' in argv else last_business_day()
        if '--skip-if-fresh' in argv:
            # 예약 실행이 여러 번 걸려 있어서, 오늘 이미 같은 기준일로 받았으면 건너뛴다
            lp = DATA / 'latest.json'
            if lp.exists():
                cur = json.loads(lp.read_text(encoding='utf-8'))
                if cur.get('asof') == asof and cur.get('generated_at', '')[:10] == datetime.now(KST).strftime('%Y-%m-%d'):
                    Path('/tmp/rates_skip').write_text('1')
                    print(f'오늘 이미 {asof} 기준으로 받음 — 건너뜀')
                    return 0
        hist = load_history()
        recent = [w['asof'] for w in hist['weeks'] if w['asof'] < asof][-4:]
        c = Collector(recent + [asof])
        snap, detail = c.snapshot(asof, with_savings_detail=True)
        # 지난 4주 기준금리 다시 계산 (적용일·자료 반영이 늦게 들어온 변경을 결정한 주로 바로잡기)
        for w in hist['weeks']:
            if w['asof'] in recent:
                w['values'].update(c.policy(w['asof']))
        hist = save_week(hist, asof, snap)
        write_json(DATA / 'history.json', hist)
        bt, bd = c.bonds(asof)
        if bt:
            write_json(DATA / 'bonds.json', save_week(load_json('bonds.json'), asof, {'d': bd, 'table': bt}))
        write_json(DATA / 'latest.json', build_latest(hist, detail, c.errors))
        if detail:
            write_json(DATA / 'savings.json', detail)
        write_json(DATA / 'quarterly.json', quarterly(asof, c))
        missing = [s[0] for s in SERIES if s[0] not in snap]
        print(f'기준일 {asof} · 지표 {len(snap)}/{len(SERIES)}개' + (f' · 빠짐 {missing}' if missing else ''))
        for e in c.errors:
            print('  오류:', e)
        return 0
    dates = sorted(argv[1:])
    c = Collector(dates)
    hist = {'weeks': []}
    for d in dates:
        snap, _ = c.snapshot(d)
        hist = save_week(hist, d, snap)
        print(d, len(snap), '개')
    write_json(DATA / 'history.json', hist)
    bonds = {'weeks': []}
    for d in dates:
        bt, bd = c.bonds(d)
        if bt:
            bonds = save_week(bonds, d, {'d': bd, 'table': bt})
    write_json(DATA / 'bonds.json', bonds)
    for e in c.errors:
        print('  오류:', e)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
