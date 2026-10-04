# -*- coding: utf-8 -*-
"""주간 이슈 파일 검사: python check_issues.py rates/data/issues/2026-10-02.json

- 형식(필수 칸, 카드 3~5장, 출처 URL)
- numbers 안의 숫자가 그 주 사이트 값(history.json)과 맞는지
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATS = {'정책', '글로벌·시장', '국내 채권', '크레딧', '예금·대출', '증시·환율'}


def main(path):
    p = Path(path)
    errs = []
    try:
        d = json.loads(p.read_text(encoding='utf-8'))
    except Exception as e:
        print('형식 오류(JSON):', e)
        return 1
    asof = d.get('asof')
    if p.stem != asof:
        errs.append(f'파일명({p.stem})과 asof({asof})가 달라요')
    hist = json.loads((ROOT / 'rates' / 'data' / 'history.json').read_text(encoding='utf-8'))
    week = next((w for w in hist['weeks'] if w['asof'] == asof), None)
    if not week:
        errs.append(f'history.json 에 {asof} 주가 없어요')
    vals = {round(v['v'], 3) for v in (week or {}).get('values', {}).values() if isinstance(v.get('v'), (int, float))}

    if not (d.get('headline') or '').strip():
        errs.append('headline 이 비었어요')
    cards = d.get('cards') or []
    if not 3 <= len(cards) <= 5:
        errs.append(f'카드는 3~5장이어야 해요 (지금 {len(cards)}장)')
    for i, c in enumerate(cards, 1):
        for k in ('category', 'title', 'summary'):
            if not (c.get(k) or '').strip():
                errs.append(f'{i}번 카드 {k} 가 비었어요')
        if c.get('category') and c['category'] not in CATS:
            errs.append(f'{i}번 카드 카테고리 "{c["category"]}" 는 목록에 없어요: {sorted(CATS)}')
        srcs = c.get('sources') or []
        if not srcs:
            errs.append(f'{i}번 카드에 출처가 없어요')
        for s in srcs:
            u = s.get('url', '')
            if not u.startswith('http') or re.fullmatch(r'https?://[^/]+/?', u):
                errs.append(f'{i}번 카드 출처 URL 이 기사 주소가 아니에요: {u}')
        for n in c.get('numbers') or []:
            # "국고채 3년 3.937% (▼6.9bp)" → 첫 번째 % 앞 숫자를 사이트 값과 대조
            m = re.search(r'(-?[\d,]+\.?\d*)\s*%', n)
            if m and vals:
                x = round(float(m.group(1).replace(',', '')), 3)
                if not any(abs(x - v) < 0.0051 for v in vals):
                    errs.append(f'{i}번 카드 숫자 "{n}" 가 {asof} 사이트 값과 안 맞아요')
    for u in d.get('upcoming') or []:
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', u.get('date', '')) or not u.get('title'):
            errs.append(f'일정 형식 오류: {u}')
    if errs:
        print('\n'.join('✗ ' + e for e in errs))
        return 1
    print('OK')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
