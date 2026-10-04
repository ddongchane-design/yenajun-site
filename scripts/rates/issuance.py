# -*- coding: utf-8 -*-
"""금융채 발행 동향 (예탁결제원 SEIBro) → rates/data/issuance.json

  python issuance.py weekly [--asof 2026-10-02]   # 지난 기록 다음 날 ~ 기준일 발행분을 한 주로 저장
  python issuance.py backfill 26 [--asof 2026-10-02]   # 기준일까지 토~금 26주를 새로 채움

SEIBro는 만기가 아직 안 된 종목만 보여 줘서, 과거로 갈수록 단기물(1년 미만 은행채·통안채)이 빠진다.
매주 그때그때 저장한 주는 complete=True, 나중에 한꺼번에 채운 주는 complete=False 로 표시한다.
"""
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import sources as S
from collect import DATA, last_business_day, write_json

GROUPS = ['은행채', '여전채', '통안채', '기타']
YJ_GRADES = ['AA+', 'AA0', 'AA-', 'A+', 'A0', 'A-']


def _iso(d):
    return d.strftime('%Y-%m-%d')


def summarize(start, end, complete):
    rows = S.seibro_issues(start, end)
    groups = {g: {'amt': 0.0, 'cnt': 0} for g in GROUPS}
    kinds = defaultdict(lambda: {'amt': 0.0, 'cnt': 0, 'group': ''})
    yj = defaultdict(list)
    for r in rows:
        a = r['amount'] or 0
        groups[r['group']]['amt'] += a
        groups[r['group']]['cnt'] += 1
        k = kinds[r['kind']]
        k['amt'] += a
        k['cnt'] += 1
        k['group'] = r['group']
        # 여전채 3년 내외, 선순위, 고정금리만 발행금리 평균에 넣는다 (민평 3년과 비교)
        if (r['group'] == '여전채' and r['senior'] and r['coupon'] and r['years'] and 2.5 <= r['years'] <= 3.5
                and r['int_kind'].startswith('고정') and r['grade'] in YJ_GRADES):
            yj[r['grade']].append((r['coupon'], a))
    yj_out = {}
    for g, lst in yj.items():
        w = sum(a for _, a in lst) or 1
        yj_out[g] = {'avg': round(sum(c * a for c, a in lst) / w, 3), 'n': len(lst),
                     'min': min(c for c, _ in lst), 'max': max(c for c, _ in lst)}
    bt, bd = S.kofia_latest(S.kofia_bond_table, end)
    mp = {g: m.get('3') for g, m in bt.get('fb2', {}).items() if g in YJ_GRADES}
    top = sorted(rows, key=lambda r: -(r['amount'] or 0))[:30]
    return {
        'start': start, 'end': end, 'complete': complete,
        'total': {'amt': sum(g['amt'] for g in groups.values()), 'cnt': len(rows)},
        'groups': groups,
        'kinds': dict(sorted(kinds.items(), key=lambda kv: -kv[1]['amt'])),
        'yj': yj_out, 'mp': mp, 'mp_date': bd,
        'top': [{k: r[k] for k in ('issuer', 'name', 'kind', 'group', 'issued', 'maturity', 'years', 'amount', 'coupon', 'grade', 'senior')} for r in top],
    }


def load():
    p = DATA / 'issuance.json'
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else {'weeks': []}


def save(doc):
    doc['weeks'].sort(key=lambda w: w['asof'])
    doc['updated'] = datetime.now(S_KST()).strftime('%Y-%m-%d %H:%M')
    write_json(DATA / 'issuance.json', doc)


def S_KST():
    from collect import KST
    return KST


def main(argv):
    asof = argv[argv.index('--asof') + 1] if '--asof' in argv else last_business_day()
    doc = load()
    if argv and argv[0] == 'backfill':
        n = int(argv[1])
        end = datetime.strptime(asof, '%Y-%m-%d')
        weeks = []
        for i in range(n):
            e = end - timedelta(days=7 * i)
            st = e - timedelta(days=6)
            weeks.append((_iso(st), _iso(e)))
        keep = {w['asof']: w for w in doc['weeks'] if w.get('complete')}
        out = []
        for st, e in sorted(weeks):
            if e in keep:
                out.append(keep[e])
                continue
            w = summarize(st, e, complete=False)
            w['asof'] = e
            out.append(w)
            print(e, f"{w['total']['amt'] / 1e12:.2f}조 {w['total']['cnt']}건")
        doc['weeks'] = out
        save(doc)
        return 0
    # weekly
    prev = [w for w in doc['weeks'] if w['asof'] < asof]
    start = _iso(datetime.strptime(prev[-1]['end'], '%Y-%m-%d') + timedelta(days=1)) if prev else _iso(datetime.strptime(asof, '%Y-%m-%d') - timedelta(days=6))
    w = summarize(start, asof, complete=True)
    w['asof'] = asof
    doc['weeks'] = [x for x in doc['weeks'] if x['asof'] != asof] + [w]
    save(doc)
    print(f"금융채 발행 {start}~{asof}: {w['total']['amt'] / 1e12:.2f}조원 {w['total']['cnt']}건")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
