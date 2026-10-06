# -*- coding: utf-8 -*-
"""수집한 숫자·이슈를 HTML 안에 직접 써 넣는다 (검색 로봇·애드센스가 실제 내용을 읽도록).

  python prerender.py

- rates/index.html, rates/issuance/index.html, 홈 index.html 의 <!--pre:이름-->…<!--/pre:이름--> 자리를 채운다.
  화면은 JS가 같은 자리를 다시 그리므로 사람에게는 달라지는 게 없다.
- /rates/ 설명 문구(meta description)에 그 주 핵심 숫자를 넣고, sitemap.xml 에 최근 수정일(lastmod)을 넣는다.
"""
import html
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'rates' / 'data'
e = lambda s: html.escape(str(s if s is not None else ''), quote=True)
# 이슈 요약의 **핵심 단어** → <strong> (화면에서 빨간 굵은 글씨)
rich = lambda s: re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', e(s))


def load(name):
    p = DATA / name
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else None


def md(d):
    if not d:
        return ''
    if re.search(r'Q\d$', d):
        return d.replace('Q', ' ') + '분기'
    p = d.split('-')
    return f'{int(p[1])}/{int(p[2])}' if len(p) == 3 else d


def fmt(v, dp, unit):
    if v is None:
        return '–'
    if unit == '십억원':
        return f'{v / 1000:,.1f}조원'
    if unit in ('pt', '원'):
        return f'{v:,.{dp}f}' + ('원' if unit == '원' else '')
    return f'{v:.{dp}f}%'


def chg(it):
    u = it['unit']
    if u in ('pt', '원'):
        p = it.get('change_pct')
        if p is None or abs(p) < 0.005:
            return '<span class="chg flat">0.00%</span>'
        return f'<span class="chg {"up" if p > 0 else "down"}">{"▲" if p > 0 else "▼"} {abs(p):.2f}%</span>'
    if u == '십억원':
        return '<span class="chg flat">–</span>'
    bp = it.get('change_bp')
    if bp is None:
        return '<span class="chg flat">–</span>'
    if abs(bp) < 0.05:
        return '<span class="chg flat">0bp</span>'
    s = f'{abs(bp):.1f}'.rstrip('0').rstrip('.')
    return f'<span class="chg {"up" if bp > 0 else "down"}">{"▲" if bp > 0 else "▼"} {s}bp</span>'


def fill(doc, name, content):
    pat = re.compile(rf'(<!--pre:{name}-->)(.*?)(<!--/pre:{name}-->)', re.S)
    assert pat.search(doc), f'자리 표시 없음: {name}'
    return pat.sub(lambda m: m.group(1) + content + m.group(3), doc, count=1)


def write_if_changed(path, doc):
    old = path.read_text(encoding='utf-8')
    if old != doc:
        path.write_text(doc, encoding='utf-8', newline='')
        return True
    return False


def rates_page(L, I):
    p = ROOT / 'rates' / 'index.html'
    doc = p.read_text(encoding='utf-8')
    allit = {it['id']: it for g in L['groups'] for it in g['items']}
    doc = fill(doc, 'asof', f'<span class="chip">기준일 <b class="num">{e(L["asof"])}</b></span>'
                            + (f'<span class="chip">비교 <b class="num">{e(L["prev_asof"])}</b></span>' if L.get('prev_asof') else '')
                            + f'<span class="chip">업데이트 <b class="num">{e(L["generated_at"])}</b></span>')
    names = {'kr_base': '한국 기준금리', 'ktb3': '국고채 3년', 'ust10': '미국채 10년', 'corp_aa': '회사채 AA- 3년',
             'card_AA-': '여전채 AA- 3년', 'sb_avg': '저축은행 상위5 평균'}
    doc = fill(doc, 'tiles', ''.join(
        f'<div class="tile"><div class="k">{names[i]}</div><div class="v num">{fmt(allit[i]["value"], allit[i]["dp"], allit[i]["unit"])}</div>'
        f'<div class="c num">{chg(allit[i])} <span style="color:var(--ink-3)">지난주 대비</span></div></div>'
        for i in names if i in allit))
    doc = fill(doc, 'closes', ''.join(
        f'<span>{e(allit[i]["name"])} <b class="num">{fmt(allit[i]["value"], allit[i]["dp"], allit[i]["unit"])}</b> {chg(allit[i])} '
        f'<small>{md(allit[i]["date"])} 종가 · 지난주 대비</small></span>' for i in ('kospi', 'kosdaq', 'usdkrw') if i in allit))
    secs = []
    for g in L['groups']:
        rows = ''.join(
            f'<tr><td>{e(it["name"])}</td><td class="num"><b>{fmt(it["value"], it["dp"], it["unit"])}</b></td>'
            f'<td class="num">{fmt(it["prev"], it["dp"], it["unit"])}</td><td class="num">{chg(it)}</td></tr>' for it in g['items'])
        secs.append(f'<section class="card"><h2>{e(g["title"])}</h2><p class="src">{e(g["source"])}</p><div class="tbl-scroll"><table>'
                    f'<thead><tr><th>구분</th><th>이번 주</th><th>지난주</th><th>변화</th></tr></thead><tbody>{rows}</tbody></table></div></section>')
    doc = fill(doc, 'groups', ''.join(secs))
    # 이슈 카드 (Merge된 경우에만)
    if I and I.get('cards'):
        doc = fill(doc, 'ismeta', f'{e(I["asof"])} 기준 · 공개 뉴스와 공식 발표를 바탕으로 정리')
        doc = fill(doc, 'islead', e(I.get('headline', '')))
        cards = []
        for c in I['cards']:
            nums = ''.join(f'<span>{e(n)}</span>' for n in c.get('numbers') or [])
            srcs = ' · '.join(f'<a href="{e(s.get("url"))}" target="_blank" rel="noopener nofollow">{e(s.get("title") or s.get("url"))}</a>' for s in c.get('sources') or [])
            cards.append(f'<article class="is-card"><span class="is-cat">{e(c.get("category"))}</span><h3>{e(c["title"])}</h3><p>{rich(c["summary"])}</p>'
                         + (f'<div class="is-nums">{nums}</div>' if nums else '') + (f'<div class="is-src">출처 {srcs}</div>' if srcs else '') + '</article>')
        doc = fill(doc, 'iscards', ''.join(cards))
        up = I.get('upcoming') or []
        doc = fill(doc, 'isnext', ('<h3>다음 주 볼 일정</h3><ul>' + ''.join(
            f'<li><b>{md(u["date"])}</b><span>{e(u["title"])}' + (f' <small>{e(u["note"])}</small>' if u.get('note') else '') + '</span></li>' for u in up)
            + '</ul>' + (f'<p class="src" style="margin-top:8px">일정 출처: {e(I["upcoming_source"])}</p>' if I.get('upcoming_source') else '')) if up else '')
        doc = doc.replace('id="issues" aria-labelledby="is-title" hidden>', 'id="issues" aria-labelledby="is-title">')
    else:
        for n in ('ismeta', 'islead', 'iscards', 'isnext'):
            doc = fill(doc, n, '')
        if 'id="issues" aria-labelledby="is-title" hidden>' not in doc:
            doc = doc.replace('id="issues" aria-labelledby="is-title">', 'id="issues" aria-labelledby="is-title" hidden>')
    # 검색 결과 설명 문구
    def v(i):
        it = allit.get(i)
        return fmt(it['value'], it['dp'], it['unit']) if it else '–'
    desc = (f'{L["asof"]} 기준 국고채 3년 {v("ktb3")}, 미국채 10년 {v("ust10")}, 회사채 AA- {v("corp_aa")}, 여전채 AA- 3년 {v("card_AA-")}, '
            f'저축은행 예금 상위5 평균 {v("sb_avg")}. 기준금리·국채·회사채·여전채·CP·저축은행 금리를 매주 월요일 공식 자료로 정리해요.')
    doc = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + e(desc) + m.group(2), doc, count=1)
    if I and I.get('headline'):
        doc = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + e(f'{L["asof"]} 기준 · {I["headline"]}') + m.group(2), doc, count=1)
    return write_if_changed(p, doc)


def issuance_page(D):
    p = ROOT / 'rates' / 'issuance' / 'index.html'
    doc = p.read_text(encoding='utf-8')
    w = D['weeks'][-1]
    prev = D['weeks'][-2] if len(D['weeks']) > 1 else None
    jo = lambda x: f'{x / 1e12:,.2f}'
    eok = lambda x: f'{round(x / 1e8):,}억'
    doc = fill(doc, 'asof', f'<span class="chip">발행 주간 <b class="num">{md(w["start"])} ~ {md(w["end"])}</b></span>'
                            f'<span class="chip">업데이트 <b class="num">{e(D.get("updated", ""))}</b></span>')
    yj, mp = w['yj'].get('AA+'), w['mp'].get('AA+')
    sp = f'민평 {mp:.3f}%보다 {(yj["avg"] - mp) * 100:+.1f}bp' if yj and mp is not None else '이번 주 해당 발행 없음'
    g = w['groups']
    tile = lambda k, val, c: f'<div class="tile"><div class="k">{k}</div><div class="v num">{val}</div><div class="c">{c}</div></div>'
    doc = fill(doc, 'tiles', tile('금융채 전체', jo(w['total']['amt']) + '조', f'{w["total"]["cnt"]}건')
               + tile('은행채', jo(g['은행채']['amt']) + '조', f'{g["은행채"]["cnt"]}건')
               + tile('여전채', jo(g['여전채']['amt']) + '조', f'{g["여전채"]["cnt"]}건')
               + tile('여전채 AA+ 3년 발행금리', f'{yj["avg"]:.3f}%' if yj else '–', sp))
    doc = fill(doc, 'kindssrc', f'{w["start"]} ~ {w["end"]} 발행분 · 지난주와 비교')
    pk = prev['kinds'] if prev else {}
    doc = fill(doc, 'kinds', '<thead><tr><th>종류</th><th>건수</th><th>발행액</th><th>지난주</th></tr></thead><tbody>' + ''.join(
        f'<tr><td>{e(k)}</td><td class="num">{v["cnt"]}</td><td class="num"><b>{eok(v["amt"])}</b></td><td class="num">{eok(pk[k]["amt"]) if k in pk else "–"}</td></tr>'
        for k, v in w['kinds'].items()) + '</tbody>')
    def top_row(r):
        y = r['years']
        term = '–' if y is None else (f'{round(y * 12)}개월' if y < 1 else f'{y:.1f}년')
        cp = '–' if r['coupon'] is None else f'{r["coupon"]:.3f}%'
        return (f'<tr><td class="l">{e(r["issuer"])}<span class="d">{e(r["kind"])} · {md(r["issued"])} 발행</span></td>'
                f'<td class="num"><b>{eok(r["amount"] or 0)}</b></td><td class="num">{term}</td><td class="num">{cp}</td><td>{e(r["grade"] or "–")}</td></tr>')
    doc = fill(doc, 'top', '<thead><tr><th>발행사</th><th>발행액</th><th>만기</th><th>금리</th><th>등급</th></tr></thead><tbody>'
               + ''.join(top_row(r) for r in w['top']) + '</tbody>')
    return write_if_changed(p, doc)


def home(L, I):
    p = ROOT / 'index.html'
    doc = p.read_text(encoding='utf-8')
    allit = {it['id']: it for g in L['groups'] for it in g['items']}
    a = L['asof'].split('-')
    wk = f'{int(a[1])}월 {-(-int(a[2]) // 7)}주'
    doc = fill(doc, 'rbweek', f'· {wk} ({md(L["asof"])} 기준)')
    if I and I.get('headline'):
        doc = fill(doc, 'rbsub', e(I['headline']))
    else:
        doc = fill(doc, 'rbsub', '기준금리부터 저축은행 예금금리까지, 공식 자료로 정리한 이번 주 금리예요.')
    pick = [('kr_base', '한국 기준금리'), ('ktb3', '국고채 3년'), ('ust10', '미국채 10년'), ('sb_avg', '저축은행 예금 (상위5)')]

    def c(it):
        bp = it.get('change_bp')
        if bp is None:
            return ''
        if abs(bp) < 0.05:
            return '<i class="rb-flat">변동 없음</i>'
        s = f'{abs(bp):.1f}'.rstrip('0').rstrip('.')
        return f'<i class="{"rb-up" if bp > 0 else "rb-down"}">{"▲" if bp > 0 else "▼"} {s}bp</i>'
    doc = fill(doc, 'rbnums', ''.join(
        f'<div class="rb-num"><small>{n}</small><b>{allit[i]["value"]:.{allit[i]["dp"]}f}%</b>{c(allit[i])}</div>' for i, n in pick if i in allit))
    return write_if_changed(p, doc)


def sitemap(lastmod):
    p = ROOT / 'sitemap.xml'
    doc = p.read_text(encoding='utf-8')
    for loc in ('https://yenajun.com/', 'https://yenajun.com/rates/', 'https://yenajun.com/rates/issuance/'):
        doc = re.sub(rf'<url><loc>{re.escape(loc)}</loc>(?:<lastmod>[^<]*</lastmod>)?</url>',
                     f'<url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>', doc, count=1)
    return write_if_changed(p, doc)


def main():
    L = load('latest.json')
    I = load(f'issues/{L["asof"]}.json')
    D = load('issuance.json')
    changed = [rates_page(L, I), home(L, I)]
    if D and D.get('weeks'):
        changed.append(issuance_page(D))
    changed.append(sitemap(L['generated_at'][:10]))
    print('HTML 미리 채우기:', '변경 있음' if any(changed) else '변경 없음', f'(기준일 {L["asof"]}, 이슈 {"있음" if I else "없음"})')


if __name__ == '__main__':
    main()
