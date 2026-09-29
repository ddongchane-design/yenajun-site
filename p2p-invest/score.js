// P2P 아파트담보 상품 점수 계산 — 브라우저와 node 테스트에서 함께 씀
(function (root) {
  'use strict';

  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  // a일 때 0, b일 때 1 (a > b 도 됨)
  var lerp01 = function (v, a, b) { return clamp((v - a) / (b - a), 0, 1); };

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : null;
  }
  function bool(v) {
    if (typeof v === 'boolean') return v;
    var s = String(v == null ? '' : v).trim().toLowerCase();
    return s === 'true' || s === 'y' || s === 'o' || s === '예' || s === '1';
  }
  function days(v) {
    var s = String(v == null ? '' : v);
    var n = num(s);
    if (n === null) return null;
    if (/개월/.test(s)) return Math.round(n * 365 / 12);
    if (/년/.test(s)) return Math.round(n * 365);
    return n;
  }

  // 엑셀 한 줄 → 정리된 상품
  function normalize(r) {
    var isMarket = r['잔여원금'] != null || r['판매금액'] != null;
    var principal = num(isMarket ? r['잔여원금'] : r['상품금액']) || 0;
    var discount = isMarket ? (num(r['할인율']) || 0) : 0;
    var price = isMarket ? (num(r['판매금액']) || principal * (1 - discount / 100)) : principal;
    var ranks = String(r['근저당 우선순위'] == null ? '' : r['근저당 우선순위']).match(/\d+/g) || [];
    var appraisal = num(r['크플 감정가']) || num(r['KB시세']) || 0;
    var ltv = num(r['유효담보비율']);
    var senior = num(r['선순위 대출 잔액']) || 0;
    var deposit = num(r['전·월세 보증금']) || 0;
    // 유효담보비율 = (선순위 잔액 + 보증금 + 이 대출) ÷ 감정가  →  세컨드마켓은 이 대출 금액을 거꾸로 구함
    // 근저당 없이 세입자만 있으면 선순위 잔액 칸에 보증금이 그대로 들어 있어 한 번만 뺌
    var ahead = senior === deposit ? senior : senior + deposit;
    var loan = !isMarket ? principal : ltv != null && appraisal ? ltv / 100 * appraisal - ahead : null;
    if (loan != null && loan < 1) loan = null;
    var recovery = num(r['담보물 회수 예상가액']);
    var name = String(r['상품명'] || '').trim();
    return {
      name: name,
      loanId: name.replace(/-\d+$/, ''),   // 같은 대출의 조각(…호-25, …호-26)을 묶는 키
      market: isMarket,
      principal: principal,
      price: price,
      discount: discount,
      rate: num(r['수익률']) || 0,
      days: days(isMarket ? r['잔여기간'] : r['투자기간']) || 365,
      loanType: r['대출유형'] || '',
      rank: ranks.length ? Math.max.apply(null, ranks.map(Number)) : null,
      rankText: ranks.join(', '),
      ltv: ltv,
      appraisal: appraisal,
      trade: num(r['국토부실거래가']),
      loan: loan,
      recovery: recovery,
      coverage: loan && recovery != null ? recovery / loan : null,
      auction: num(r['낙찰가율']),
      buyback: bool(r['매입 확약 여부']),
      buybackScope: String(r['매입 보장 범위'] || '').trim(),
      buybackPct: num(r['매입 보장 비율']),
      titleIns: bool(r['권원 보험 가입 여부']),
      sido: String(r['시·도'] || ''),
      gugun: String(r['구·군'] || ''),
      apt: String(r['아파트/주택명'] || ''),
      households: num(r['세대수']),
      built: num(String(r['준공시기'] || '').slice(0, 4)),
      cpleScore: num(r['크플 스코어']),
      nice: num(r['나이스점수']),
      selfLive: bool(r['차입자직접거주여부']),
      tenant: bool(r['임차인 존재 여부'])
    };
  }

  function scopeLevel(p) {
    if (!p.buyback) return 0;
    var s = p.buybackScope;
    if (/연체/.test(s)) return 4;        // 원금 + 이자 + 연체 수익
    if (/이자|수익/.test(s)) return 3;   // 원금 + 이자
    if (/95/.test(s) || (p.buybackPct != null && p.buybackPct < 100)) return 1;
    if (/원금/.test(s)) return 2;        // 원금 100%
    return 1;
  }
  var SCOPE_LABEL = ['없음', '원금 일부', '원금', '원금+이자', '원금+이자+연체이자'];

  var METRO = /서울|경기|인천/;
  var BIG_CITY = /광역시|세종/;

  // 안전 점수 0~100과 항목별 내역
  function safety(p) {
    var parts = [];
    function add(key, label, got, max, note) { parts.push({ key: key, label: label, got: got, max: max, note: note }); }

    // 1) 유효담보비율: 낮을수록 집값이 떨어져도 버틸 여유가 큼 (20% 이하 만점, 75% 이상 0점)
    add('ltv', '유효담보비율', p.ltv == null ? 0 : 35 * lerp01(p.ltv, 75, 20), 35,
      p.ltv == null ? '정보 없음' : p.ltv.toFixed(1) + '%');

    // 2) 경매로 넘어가도 원금을 돌려받을 여유 (회수 예상가액 ÷ 이 대출 금액)
    var cov = p.coverage;
    add('cov', '경매 시 회수 여유', cov == null ? 7 : 15 * lerp01(cov, 1, 3), 15,
      cov == null ? '계산 불가' : '대출금의 ' + cov.toFixed(1) + '배');

    // 3) 매입확약 범위
    var lv = scopeLevel(p);
    add('buyback', '매입보장 범위', [0, 8, 13, 17, 20][lv], 20, SCOPE_LABEL[lv]);

    // 4) 근저당 순위: 1순위일수록 먼저 돌려받음
    var rk = p.rank;
    add('rank', '근저당 순위', rk == null ? 5 : rk <= 1 ? 10 : rk === 2 ? 7 : rk === 3 ? 5 : 3, 10,
      rk == null ? '정보 없음' : p.rankText + '순위');

    // 5) 차입자 신용: 크플 스코어(없으면 나이스 점수)
    var cs = p.cpleScore != null ? p.cpleScore : p.nice;
    add('credit', '차입자 신용', cs == null ? 5 : 10 * lerp01(cs, 600, 950), 10,
      cs == null ? '정보 없음' : (p.cpleScore != null ? '크플 ' : 'NICE ') + cs + '점');

    // 6) 담보물 환금성: 큰 단지·수도권일수록 잘 팔림
    var hh = p.households;
    var hhPts = hh == null ? 2 : 5 * lerp01(hh, 100, 1000);
    var areaPts = METRO.test(p.sido) ? 5 : BIG_CITY.test(p.sido) ? 3.5 : 2;
    add('liquid', '단지 규모·지역', hhPts + areaPts, 10,
      (hh == null ? '' : hh.toLocaleString('ko-KR') + '세대 · ') + (p.sido || '지역 정보 없음'));

    var total = parts.reduce(function (s, x) { return s + x.got; }, 0);
    if (!p.titleIns) { total -= 5; parts.push({ key: 'title', label: '권원보험 미가입', got: -5, max: 0, note: '감점' }); }
    total = clamp(Math.round(total), 0, 100);
    return { score: total, grade: total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D', parts: parts };
  }

  // 세금·이용료를 빼고 연 수익률로 환산 (%). 할인 차익은 이자가 아니라 세금을 떼지 않는다고 가정
  function netYield(p, opt) {
    var tax = (opt && opt.tax != null ? opt.tax : 15.4) / 100;
    var fee = (opt && opt.fee != null ? opt.fee : 1.2) / 100;
    var t = p.days / 365;
    var base = p.principal || 1;
    var price = p.price || base;
    var interest = base * p.rate / 100 * t;
    var net = interest * (1 - tax) - base * fee * t + (base - price);
    return net / price / t * 100;
  }

  // 순위: 안전 점수와 수익 점수(세후 연 4% → 0점, 9% → 100점)를 성향(w = 수익 비중)에 맞춰 섞음
  function rank(list, opt) {
    var w = opt && opt.weight != null ? opt.weight : 0.35;
    list.forEach(function (p) {
      p.safe = safety(p);
      p.net = netYield(p, opt);
      p.yieldScore = 100 * lerp01(p.net, 4, 9);
      p.total = p.safe.score * (1 - w) + p.yieldScore * w;
    });
    return list.slice().sort(function (a, b) { return b.total - a.total; });
  }

  // 투자금을 서로 다른 대출 N개에 나눠 담기 (세컨드마켓 조각은 판매금액까지만)
  function portfolio(sorted, budget, n) {
    var picks = [], seen = {};
    for (var i = 0; i < sorted.length && picks.length < n; i++) {
      var p = sorted[i];
      if (seen[p.loanId]) continue;
      seen[p.loanId] = 1; picks.push({ p: p, amount: 0 });
    }
    var left = budget, open = picks.slice();
    // 남은 돈을 아직 한도가 남은 상품에 고르게 나누기를 반복
    while (open.length) {
      var share = Math.floor(left / open.length);
      if (share < 1) break;
      var next = [];
      open.forEach(function (x) {
        var cap = x.p.market ? Math.floor(x.p.price) - x.amount : Infinity;
        var add = Math.min(share, cap);
        x.amount += add; left -= add;
        if (cap - add > 0) next.push(x);
      });
      if (next.length === open.length) break;   // 모두 고르게 받았으면 끝, 한도에 걸린 게 있으면 남은 돈을 다시 나눔
      open = next;
    }
    return { picks: picks, left: Math.max(0, Math.round(left)) };
  }

  var api = { normalize: normalize, safety: safety, netYield: netYield, rank: rank, portfolio: portfolio, scopeLevel: scopeLevel, SCOPE_LABEL: SCOPE_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.P2PScore = api;
})(this);
