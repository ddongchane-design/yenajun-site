# -*- coding: utf-8 -*-
"""하나증권 리서치 '증시 이슈캘린더'(월간 PDF)에서 일정 텍스트 꺼내기.

  python hana_calendar.py 2026-10-05 2026-10-11    # 이 기간이 걸친 달의 캘린더 텍스트를 출력

하나증권이 매달 말 다음 달 캘린더를 공개한다(리서치 > 투자전략).
PDF 표가 글자로 풀리면서 칸 순서가 섞이므로, 날짜별 정리는 읽는 쪽(Claude)이 한다.
필요: pip install pypdf
"""
import re
import sys
import urllib.request
from datetime import datetime

LIST = 'http://www.hanaw.com/main/research/research/list.cmd?cid=4&pid=2'
BASE = 'http://www.hanaw.com'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36'


def get(url, referer=None):
    h = {'User-Agent': UA}
    if referer:
        h['Referer'] = referer
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=40) as r:
        return r.read()


def months_available():
    """{(연, 월): PDF 주소}"""
    raw = get(LIST)
    s = raw.decode('utf-8', errors='replace')
    if '증시 이슈캘린더' not in s:
        s = raw.decode('cp949', errors='replace')
    out = {}
    # 제목 'YYYY년 M월 증시 이슈캘린더' 뒤에 나오는 첫 첨부파일 링크
    for m in re.finditer(r'(\d{4})년\s*(\d{1,2})월\s*증시 이슈캘린더(.{0,3000}?)download\.cmd\?([^"\']+)', s, re.S):
        key = (int(m[1]), int(m[2]))
        if key not in out:
            out[key] = BASE + '/main/research/research/download.cmd?' + m[4].replace('&amp;', '&')
    return out


def pdf_text(url):
    from io import BytesIO
    from pypdf import PdfReader
    data = get(url, referer=LIST)
    return '\n'.join(p.extract_text() or '' for p in PdfReader(BytesIO(data)).pages)


def main(start, end):
    a = datetime.strptime(start, '%Y-%m-%d')
    b = datetime.strptime(end, '%Y-%m-%d')
    need = sorted({(a.year, a.month), (b.year, b.month)})
    avail = months_available()
    for ym in need:
        url = avail.get(ym)
        print(f'===== 하나증권 {ym[0]}년 {ym[1]}월 증시 이슈캘린더 =====')
        if not url:
            print('(아직 공개되지 않음 — 공식 일정으로 확인할 것)')
            continue
        print('주소:', url)
        print(pdf_text(url))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))
