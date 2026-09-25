(function () {
  "use strict";

  /* ---------------------------------------------------------------- 상수 */
  var STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  var STEM_HAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  var BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  var BRANCH_HAN = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  var STEM_EL = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
  var BRANCH_EL = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
  var ELEMENTS = ["목", "화", "토", "금", "수"];
  var GEN = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
  var KUK = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
  var EL_LABEL = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };

  var MONTH_BOUNDS = [
    { m: 1, d: 6, b: 1, term: "소한" }, { m: 2, d: 4, b: 2, term: "입춘" },
    { m: 3, d: 6, b: 3, term: "경칩" }, { m: 4, d: 5, b: 4, term: "청명" },
    { m: 5, d: 6, b: 5, term: "입하" }, { m: 6, d: 6, b: 6, term: "망종" },
    { m: 7, d: 7, b: 7, term: "소서" }, { m: 8, d: 8, b: 8, term: "입추" },
    { m: 9, d: 8, b: 9, term: "백로" }, { m: 10, d: 8, b: 10, term: "한로" },
    { m: 11, d: 7, b: 11, term: "입동" }, { m: 12, d: 7, b: 0, term: "대설" }
  ];

  var SOUND_UNHAE = { ㄱ: "목", ㄲ: "목", ㅋ: "목", ㄴ: "화", ㄷ: "화", ㄸ: "화", ㄹ: "화", ㅌ: "화", ㅇ: "토", ㅎ: "토", ㅅ: "금", ㅆ: "금", ㅈ: "금", ㅉ: "금", ㅊ: "금", ㅁ: "수", ㅂ: "수", ㅃ: "수", ㅍ: "수" };
  var SOUND_HAERYE = Object.assign({}, SOUND_UNHAE, { ㅇ: "수", ㅎ: "수", ㅁ: "토", ㅂ: "토", ㅃ: "토", ㅍ: "토" });
  var INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
  var MEDIALS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
  var YANG_VOWELS = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ"];

  var GOOD_NUM = [1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81];
  var BAD_NUM = [2, 4, 9, 10, 12, 14, 19, 20, 22, 26, 27, 28, 30, 34, 36, 40, 42, 43, 44, 46, 49, 50, 54, 56, 59, 60, 62, 64, 66, 69, 70, 72, 74, 76, 79, 80];

  // 지장간(支藏干): 지지 속에 숨은 천간 [여기, 중기, 정기]
  var HIDDEN = {
    자: ["임", null, "계"], 축: ["계", "신", "기"], 인: ["무", "병", "갑"], 묘: ["갑", null, "을"],
    진: ["을", "계", "무"], 사: ["무", "경", "병"], 오: ["병", "기", "정"], 미: ["정", "을", "기"],
    신: ["무", "임", "경"], 유: ["경", null, "신"], 술: ["신", "정", "무"], 해: ["무", "갑", "임"]
  };
  var STEM_EL_BY_NAME = { 갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수" };

  // 태어난 지역의 경도. 한국 표준시(동경 135도)와의 차이를 1도당 4분으로 환산합니다.
  var REGIONS = [
    ["서울", 126.978], ["인천", 126.705], ["수원", 127.029], ["의정부", 127.045],
    ["춘천", 127.734], ["강릉", 128.896], ["원주", 127.947],
    ["대전", 127.385], ["세종", 127.289], ["청주", 127.489], ["천안", 127.115],
    ["전주", 127.148], ["군산", 126.737], ["광주", 126.852], ["목포", 126.392], ["여수", 127.663],
    ["대구", 128.601], ["안동", 128.729], ["포항", 129.365], ["경주", 129.225],
    ["부산", 129.075], ["울산", 129.311], ["창원", 128.682], ["진주", 128.108],
    ["제주", 126.531], ["서귀포", 126.560], ["울릉도", 130.906], ["백령도", 124.710]
  ];


  // 부모가 아이에게 바라는 마음. 한자의 훈(뜻)에서 찾아 맞춥니다.
  var WISHES = [
    { key: "health", label: "건강하게", phrase: "몸과 마음이 튼튼하고",
      words: ["편안", "굳셀", "굳을", "목숨", "튼튼", "성할", "자랄", "기를", "무성", "온전", "평안", "강할", "편할", "보전", "오랠", "왕성"] },
    { key: "wisdom", label: "슬기롭게", phrase: "슬기롭고 배움을 즐기며",
      words: ["슬기", "밝을", "지혜", "배울", "총명", "깨달", "생각", "살필", "학문", "글월", "통달", "사리", "익힐", "가르칠", "헤아릴"] },
    { key: "leader", label: "이끄는 사람으로", phrase: "사람을 이끌며",
      words: ["클", "높을", "으뜸", "임금", "장수", "거느릴", "다스릴", "뛰어날", "빼어날", "이길", "떨칠", "세울", "이룰", "오를", "나아갈", "우두머리", "굳셀", "웅장"] },
    { key: "wealth", label: "풍족하게", phrase: "부족함 없이 넉넉하며",
      words: ["재물", "보배", "구슬", "넉넉", "쌓을", "곳집", "풍년", "부유", "가득", "창성", "옥돌", "패옥", "귀할", "풍성", "많을"] },
    { key: "happy", label: "행복하게", phrase: "늘 웃으며 즐겁고",
      words: ["기쁠", "즐거울", "웃을", "화할", "사랑", "따뜻", "좋을", "즐길", "누릴", "화목", "기뻐할", "복"] },
    { key: "virtue", label: "어진 사람으로", phrase: "어질고 신의가 두터우며",
      words: ["어질", "믿을", "정성", "예도", "의로울", "착할", "도울", "은혜", "공경", "충성", "효도", "곧을", "바를", "삼갈", "너그러울", "공손"] },
    { key: "free", label: "크게 펼치며", phrase: "품은 뜻을 크게 펼치고",
      words: ["넓을", "바다", "하늘", "멀", "펼", "트일", "물결", "바람", "구름", "클", "날개", "오를", "통할", "열릴"] },
    { key: "art", label: "아름다움을 알고", phrase: "아름다움을 아는",
      words: ["아름다울", "고울", "빛날", "향기", "노래", "가락", "그림", "무늬", "맑을", "곱게", "꽃부리", "문채", "예쁠"] }
  ];

  // 데이터의 뜻은 "높을 준/준엄할 준"처럼 훈과 음이 함께 옵니다. 음을 떼고 훈만 남깁니다.
  function meaningOnly(mean) {
    if (!mean) return "";
    return mean.split("/").map(function (seg) {
      var tokens = seg.trim().split(/\s+/);
      return tokens.length > 1 ? tokens.slice(0, -1).join(" ") : tokens.join(" ");
    }).join(" ") + " ";
  }
  function wishMatch(wish, mean) {
    var text = meaningOnly(mean).trim();
    if (!text) return false;
    var tokens = text.split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      for (var j = 0; j < wish.words.length; j++) {
        // 낱말 앞에서부터 맞을 때만 인정합니다. "비웃을"이 "웃을"에 걸리지 않도록 합니다.
        if (tokens[i].indexOf(wish.words[j]) === 0) return true;
      }
    }
    return false;
  }

  function pureMeaning(mean) {
    if (!mean) return "";
    var first = mean.split("/")[0].trim().split(/\s+/);
    return first.length > 1 ? first.slice(0, -1).join(" ") : first.join(" ");
  }

  var STAGES = [
    { key: "won", label: "원격 元格", age: "0 ~ 20세", lead: "초년운에는", desc: "어린 시절과 학업기의 바탕이 되는 수입니다." },
    { key: "hyeong", label: "형격 亨格", age: "21 ~ 40세", lead: "청년기에는", desc: "사회에 나가 가장 활발하게 움직이는 시기를 봅니다." },
    { key: "i", label: "이격 利格", age: "41 ~ 60세", lead: "중장년에는", desc: "성취를 거두고 지켜 가는 시기를 봅니다." },
    { key: "jeong", label: "정격 貞格", age: "61세 이후 · 총운", lead: "말년과 인생 전체로는", desc: "네 격 가운데 무게가 가장 큰 총운입니다." }
  ];

  /* ---------------------------------------------------------------- 사전 */
  var SYL = (window.HANJA_DATA && window.HANJA_DATA.syllables) || {};
  var POP = window.POP_DATA || {};
  var SURI_TEXT = window.SURI_TEXT || {};
  var ALL = [], BY_STROKE = {};
  Object.keys(SYL).forEach(function (kor) {
    SYL[kor].forEach(function (e) {
      var item = { char: e[0], kor: kor, mean: e[1] || "", strokes: e[2], radical: e[3], el: e[4] };
      ALL.push(item);
      (BY_STROKE[item.strokes] = BY_STROKE[item.strokes] || []).push(item);
    });
  });

  var POP_YEARS = Object.keys(POP).sort(function (a, b) { return b - a; });
  var POP_INDEX = {};   // "male|이름" → { year: {rank, count} }
  POP_YEARS.forEach(function (y) {
    ["male", "female"].forEach(function (g) {
      (POP[y][g] || []).forEach(function (row) {
        var key = g + "|" + row[1];
        (POP_INDEX[key] = POP_INDEX[key] || {})[y] = { rank: row[0], count: row[2] };
      });
    });
  });
  var POP_NAMESET = {};
  Object.keys(POP_INDEX).forEach(function (k) { POP_NAMESET[k.split("|")[1]] = true; });

  /* ---------------------------------------------------------------- 계산 */
  function mod(n, m) { return ((n % m) + m) % m; }
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  var TERM_TABLE = window.SOLAR_TERMS || null;
  function termKey(m, d, hh, mi) { return ((m * 100 + d) * 100 + hh) * 100 + mi; }

  // 그 해의 12절(節)을 시각과 함께 돌려줍니다. 표에 없는 해는 null.
  function termsOf(year) {
    if (!TERM_TABLE || !TERM_TABLE.years[String(year)]) return null;
    return TERM_TABLE.years[String(year)].map(function (v, i) {
      return {
        name: TERM_TABLE.names[i], branch: TERM_TABLE.branchOrder[i],
        month: +v.slice(0, 2), day: +v.slice(2, 4), hour: +v.slice(4, 6), min: +v.slice(6, 8),
        key: termKey(+v.slice(0, 2), +v.slice(2, 4), +v.slice(4, 6), +v.slice(6, 8))
      };
    });
  }

  // 태어난 시각이 속한 절기를 찾습니다. 시각까지 비교하므로 절입일 당일도 정확합니다.
  function monthBound(year, month, day, hour, minute) {
    var list = termsOf(year);
    if (list) {
      var key = termKey(month, day, hour, minute), active = null;
      list.forEach(function (t) { if (key >= t.key) active = t; });
      if (!active) {                                   // 소한 이전이면 지난해 대설(자월)
        var prev = termsOf(year - 1);
        active = prev ? prev[prev.length - 1] : null;
        if (active) return { b: active.branch, term: active.name, at: (year - 1) + "년 " + active.month + "월 " + active.day + "일 " + pad2(active.hour) + ":" + pad2(active.min), exact: true };
      }
      if (active) {
        return { b: active.branch, term: active.name,
          at: year + "년 " + active.month + "월 " + active.day + "일 " + pad2(active.hour) + ":" + pad2(active.min), exact: true };
      }
    }
    var v = month * 100 + day, fallback = MONTH_BOUNDS[MONTH_BOUNDS.length - 1];
    MONTH_BOUNDS.forEach(function (b) { if (v >= b.m * 100 + b.d) fallback = b; });
    return { b: fallback.b, term: fallback.term, at: null, exact: false };
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // 그 해 입춘 시각. 년주가 바뀌는 기준입니다.
  function ipchunKey(year) {
    var list = termsOf(year);
    if (!list) return termKey(2, 4, 0, 0);
    for (var i = 0; i < list.length; i++) if (list[i].name === "입춘") return list[i].key;
    return termKey(2, 4, 0, 0);
  }

  function pillar(index) {
    var s = mod(index, 10), b = mod(index, 12);
    return {
      index: index, stem: STEMS[s], branch: BRANCHES[b],
      han: STEM_HAN[s] + BRANCH_HAN[b], kor: STEMS[s] + BRANCHES[b],
      stemHan: STEM_HAN[s], branchHan: BRANCH_HAN[b],
      stemEl: STEM_EL[s], branchEl: BRANCH_EL[b], yin: s % 2 === 0 ? "양" : "음"
    };
  }
  function combine(stemIdx, branchIdx) {
    for (var i = 0; i < 60; i++) if (i % 10 === stemIdx && i % 12 === branchIdx) return i;
    return stemIdx;
  }
  function analyzeSaju(date, time, shiftMin) {
    var y = +date.slice(0, 4), m = +date.slice(5, 7), d = +date.slice(8, 10);
    var hh = +time.slice(0, 2), mi = +time.slice(3, 5);
    var bound = monthBound(y, m, d, hh, mi);
    var sajuYear = termKey(m, d, hh, mi) < ipchunKey(y) ? y - 1 : y;
    var yearIdx = mod(sajuYear - 4, 60);
    var tigerStem = mod(mod(yearIdx, 10) * 2 + 2, 10);
    var monthIdx = combine(mod(tigerStem + mod(bound.b - 2, 12), 10), bound.b);
    // 한국 표준시는 동경 135도 기준입니다. 태어난 지역의 경도만큼 시각을 당겨서 봅니다.
    var shift = shiftMin || 0;
    var clock = hh + mi / 60 + shift / 60;
    var dayIdx = mod(jdn(y, m, d) + 49, 60);
    if (clock >= 23) dayIdx = mod(dayIdx + 1, 60);   // 자시부터 다음 날로 넘어갑니다
    if (clock < 0) { clock += 24; dayIdx = mod(dayIdx - 1, 60); }
    var hourBranch = mod(Math.floor((clock + 1) / 2), 12);
    var hourIdx = combine(mod(mod(dayIdx, 10) * 2 + hourBranch, 10), hourBranch);
    var p = { year: pillar(yearIdx), month: pillar(monthIdx), day: pillar(dayIdx), hour: pillar(hourIdx) };
    // 오행 개수는 겉으로 드러난 여덟 글자만 셉니다.
    // 지장간은 사령 일수가 서로 달라 1:1로 더하면 없는 기운이 있는 것처럼 보이므로, 표시만 하고 합산에서 뺍니다.
    var counts = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    var hiddenMap = {}, rooted = {};
    ["year", "month", "day", "hour"].forEach(function (k) {
      counts[p[k].stemEl]++;
      counts[p[k].branchEl]++;
      hiddenMap[k] = (HIDDEN[p[k].branch] || []).filter(Boolean);
    });
    // 통근: 천간의 오행이 어느 지지 속에라도 뿌리를 두고 있는지
    ["year", "month", "day", "hour"].forEach(function (k) {
      var want = p[k].stemEl, found = [];
      ["year", "month", "day", "hour"].forEach(function (j) {
        hiddenMap[j].forEach(function (h) {
          if (STEM_EL_BY_NAME[h] === want && found.indexOf(p[j].branch) < 0) found.push(p[j].branch);
        });
      });
      rooted[k] = found;
    });
    var total = 8;
    var strong = [], weak = [], none = [];
    ELEMENTS.forEach(function (e) {
      if (counts[e] >= 3) strong.push(e);
      if (counts[e] === 0) none.push(e);
      else if (counts[e] <= 1) weak.push(e);
    });
    // 월지는 계절의 기운이라 사주 전체에서 가장 무겁게 봅니다.
    var seasonEl = p.month.branchEl;
    var b6 = hourBranch, lo = mod(b6 * 2 - 1 - shift / 60 + 24, 24), hi = mod(b6 * 2 + 1 - shift / 60 + 24, 24);
    function hm(v) {
      var H = Math.floor(v), M = Math.round((v - H) * 60);
      return (H < 10 ? "0" : "") + H + ":" + (M < 10 ? "0" : "") + M;
    }
    return {
      pillars: p, counts: counts, total: total, hidden: hiddenMap, rooted: rooted, seasonEl: seasonEl, termAt: bound.at, termExact: bound.exact,
      strong: strong, weak: weak, none: none, term: bound.term,
      birth: { y: y, m: m, d: d, hh: hh, mi: mi },
      shift: shift,
      hourNote: BRANCHES[hourBranch] + "시 " + hm(lo) + " ~ " + hm(hi)
        + (shift ? " (경도 보정 " + shift + "분)" : " (한국 표준시 그대로)")
    };
  }
  function neededElements(saju) {
    var list = [];
    saju.strong.forEach(function (e) {
      [GEN[e], GEN[GEN[e]]].forEach(function (x) { if (list.indexOf(x) < 0) list.push(x); });
    });
    saju.none.forEach(function (e) { if (list.indexOf(e) < 0) list.push(e); });
    if (!list.length) saju.weak.forEach(function (e) { if (list.indexOf(e) < 0) list.push(e); });
    return list.filter(function (e) { return saju.strong.indexOf(e) < 0; });
  }
  function decompose(ch) {
    var code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;
    return { initial: INITIALS[Math.floor(code / 588)], medial: MEDIALS[Math.floor((code % 588) / 28)] };
  }
  function soundElements(kor, school) {
    var table = school === "haerye" ? SOUND_HAERYE : SOUND_UNHAE;
    return kor.split("").map(function (ch) {
      var dec = decompose(ch);
      return { ch: ch, el: dec ? (table[dec.initial] || "토") : "토" };
    });
  }
  function vowelYin(kor) {
    return kor.split("").map(function (ch) {
      var dec = decompose(ch), v = dec ? dec.medial : "";
      return { ch: ch, yin: v === "ㅣ" ? "중" : (YANG_VOWELS.indexOf(v) >= 0 ? "양" : "음") };
    });
  }
  // 모음 음양은 양과 음이 함께 있어야 조화로 봅니다. 중성(ㅣ)은 어느 쪽도 채우지 못합니다.
  function vowelBalanced(parts) {
    var has = {};
    parts.forEach(function (v) { has[v.yin] = true; });
    return !!(has["양"] && has["음"]);
  }

  function relation(a, b) {
    if (a === b) return { mark: "비화", ok: true };
    if (GEN[a] === b || GEN[b] === a) return { mark: "상생", ok: true };
    return { mark: "상극", ok: false };
  }
  function numElement(n) { return ["수", "목", "목", "화", "화", "토", "토", "금", "금", "수"][n % 10]; }
  function wrap81(n) { return mod(n - 1, 81) + 1; }
  function numVerdict(n) {
    var k = wrap81(n);
    if (GOOD_NUM.indexOf(k) >= 0) return "길";
    if (BAD_NUM.indexOf(k) >= 0) return "흉";
    return "반길";
  }
  function suri(sur, n1, n2) {
    if (n2 == null) return { won: n1 + 1, hyeong: sur + n1, i: sur + 1, jeong: sur + n1 };
    return { won: n1 + n2, hyeong: sur + n1, i: sur + n2, jeong: sur + n1 + n2 };
  }
  function suriChainOk(sg, scope) {
    var els = ["won", "hyeong", "i", "jeong"].map(function (k) { return numElement(sg[k]); });
    var limit = scope === "3" ? 2 : 3, rels = [], ok = true;
    for (var i = 0; i < 3; i++) {
      var r = relation(els[i], els[i + 1]);
      rels.push(r);
      if (i < limit && !r.ok) ok = false;
    }
    return { els: els, rels: rels, ok: ok };
  }

  /* ---------------------------------------------------------------- 상태 */
  var $ = function (id) { return document.getElementById(id); };
  var state = {
    date: "2026-09-09", time: "11:47", gender: "male", len: 2,
    surKor: "이", surHanja: null, nameKor: "예준", chars: [],
    school: "unhae", scope: "4", timeBase: "true", region: "서울", customLon: 127, wishes: [], family: [], popYear: POP_YEARS[0]
  };

  function regionLon(name) {
    for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i][0] === name) return REGIONS[i][1];
    return null;
  }
  function currentShift() {
    if (state.timeBase === "kst") return 0;
    var lon = state.region === "custom" ? state.customLon : regionLon(state.region);
    if (!isFinite(lon) || lon === null) lon = 127;
    return Math.round((lon - 135) * 4);
  }

  function allowedSecondStrokes(surStrokes, firstStrokes, needAll) {
    var out = [];
    for (var sx = 1; sx <= 40; sx++) {
      var sg = suri(surStrokes, firstStrokes, sx);
      var good = ["won", "hyeong", "i", "jeong"].every(function (k) { return numVerdict(sg[k]) === "길"; });
      if (needAll && !good) continue;
      if (!good) continue;
      if (!suriChainOk(sg, state.scope).ok) continue;
      out.push(sx);
    }
    return out;
  }

  // 피해야 할 가족 글자. 부모 이름은 모두, 형제 이름은 돌림자로 쓰는 글자만 빼고 피합니다.
  function avoidChars() {
    var keep = state.chars[0] ? state.chars[0].kor : null;
    var out = {};
    state.family.forEach(function (f) {
      if (!f.name || f.name.length < 2) return;
      f.name.slice(1).split("").forEach(function (c) {
        if (f.kind === "sibling" && c === keep) return;
        out[c] = f.label;
      });
    });
    return out;
  }

  function listFor(kor) { return SYL[kor] || []; }
  function lookup(kor, ch) {
    var arr = listFor(kor);
    for (var i = 0; i < arr.length; i++) if (arr[i][0] === ch) {
      return { char: arr[i][0], kor: kor, mean: arr[i][1] || "", strokes: arr[i][2], radical: arr[i][3], el: arr[i][4] };
    }
    return null;
  }
  // 성은 획수 순으로 고를 수 없어, 흔히 쓰는 성씨 한자를 미리 골라 둡니다.
  var SURNAME_HANJA = {
    김: "金", 이: "李", 박: "朴", 최: "崔", 정: "鄭", 강: "姜", 조: "趙", 윤: "尹", 장: "張", 임: "林",
    한: "韓", 오: "吳", 서: "徐", 신: "申", 권: "權", 황: "黃", 안: "安", 송: "宋", 전: "全", 홍: "洪",
    유: "柳", 고: "高", 문: "文", 양: "梁", 손: "孫", 배: "裵", 백: "白", 허: "許", 남: "南", 심: "沈",
    노: "盧", 하: "河", 곽: "郭", 성: "成", 차: "車", 주: "朱", 우: "禹", 구: "具", 나: "羅", 민: "閔",
    진: "陳", 지: "池", 엄: "嚴", 채: "蔡", 원: "元", 천: "千", 방: "方", 공: "孔", 현: "玄", 함: "咸",
    변: "卞", 염: "廉", 여: "呂", 추: "秋", 도: "都", 소: "蘇", 석: "石", 선: "宣", 설: "薛", 마: "馬",
    길: "吉", 연: "延", 위: "魏", 표: "表", 명: "明", 기: "奇", 반: "潘", 왕: "王", 금: "琴", 옥: "玉",
    육: "陸", 인: "印", 맹: "孟", 제: "諸", 모: "牟", 봉: "奉", 국: "鞠", 피: "皮", 계: "桂", 사: "史"
  };

  function fillSelect(sel, kor, prefer) {
    var arr = listFor(kor);
    sel.innerHTML = "";
    var none = document.createElement("option");
    none.value = ""; none.textContent = arr.length ? "한자 없음 (한글 이름)" : "이 음절의 인명용 한자가 없습니다";
    sel.appendChild(none);
    arr.forEach(function (e) {
      var o = document.createElement("option");
      o.value = e[0];
      o.textContent = e[0] + " " + (e[1] || "뜻 정보 없음") + " · " + e[2] + "획 · " + e[4];
      sel.appendChild(o);
    });
    if (prefer && arr.some(function (e) { return e[0] === prefer; })) sel.value = prefer;
    else if (sel.id === "surHan" && SURNAME_HANJA[kor] && arr.some(function (e) { return e[0] === SURNAME_HANJA[kor]; })) {
      sel.value = SURNAME_HANJA[kor];   // 성은 대표 한자로 시작합니다
    } else {
      sel.value = "";                   // 이름 글자는 아래에서 가장 잘 맞는 것으로 고릅니다
    }
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function chip(text, elem) { return '<b class="chip el-' + elem + '">' + text + "</b>"; }

  /* ------------------------------------------------- 한자 고를 때 어울림 표시 */
  // 성과 반대쪽 글자를 기준으로, 이 한자를 썼을 때 수리·오행이 어떻게 되는지 미리 계산합니다.
  function gradeChar(c, isFirst, res) {
    if (!state.surHanja) return null;
    var S = state.surHanja.strokes;
    var other = isFirst ? state.chars[1] : state.chars[0];
    var single = state.len === 1;
    var need = res.need || [];
    var g = { resource: need.indexOf(c.el) >= 0, sound: null, allGood: false, chainOk: false, nums: null, feasible: false };

    // 발음오행: 이 글자를 넣었을 때 성-이름 초성이 상생인지
    var korName = isFirst ? state.surKor + c.kor + (single ? "" : (state.chars[1] ? state.chars[1].kor : ""))
                          : state.surKor + (state.chars[0] ? state.chars[0].kor : "") + c.kor;
    if (korName.length === (single ? 2 : 3)) {
      var se = soundElements(korName, state.school), ok = true;
      for (var i = 0; i < se.length - 1; i++) if (!relation(se[i].el, se[i + 1].el).ok) ok = false;
      g.sound = ok;
    }

    if (single) {
      var sg1 = suri(S, c.strokes, null);
      g.nums = [sg1.won, sg1.hyeong, sg1.i, sg1.jeong];
      g.allGood = g.nums.every(function (n) { return numVerdict(n) === "길"; });
      g.chainOk = suriChainOk(sg1, state.scope).ok;
      g.feasible = g.allGood;
      return g;
    }

    if (other) {                                   // 반대쪽 글자가 정해져 있으면 정확히 계산
      var sg = isFirst ? suri(S, c.strokes, other.strokes) : suri(S, other.strokes, c.strokes);
      g.nums = [sg.won, sg.hyeong, sg.i, sg.jeong];
      g.allGood = g.nums.every(function (n) { return numVerdict(n) === "길"; });
      g.chainOk = suriChainOk(sg, state.scope).ok;
      g.feasible = g.allGood;
    } else {                                       // 아직이면 "짝을 맞출 수 있는지"만 봅니다
      for (var sx = 1; sx <= 40 && !g.feasible; sx++) {
        var sg2 = isFirst ? suri(S, c.strokes, sx) : suri(S, sx, c.strokes);
        if (!["won", "hyeong", "i", "jeong"].every(function (k) { return numVerdict(sg2[k]) === "길"; })) continue;
        if (!suriChainOk(sg2, state.scope).ok) continue;
        g.feasible = true;
      }
    }
    return g;
  }

  function markOf(g) {
    if (!g) return { icon: "", rank: 3, why: "성 한자를 먼저 고르면 어울림을 표시합니다" };
    if (g.nums) {
      if (g.allGood && g.chainOk && g.resource && g.sound !== false)
        return { icon: "★", rank: 0, why: "사격 네 격 길수 · 수리오행 상생 · 사주 보완 오행" };
      if (g.allGood && g.chainOk) return { icon: "◎", rank: 1, why: "사격 네 격 길수 · 수리오행 상생" };
      if (g.allGood) return { icon: "○", rank: 2, why: "사격 네 격은 길수, 수리오행은 상극" };
      return { icon: "×", rank: 4, why: "사격에 흉수가 있습니다 (" + g.nums.join("/") + ")" };
    }
    if (g.feasible && g.resource) return { icon: "★", rank: 0, why: "짝을 맞추면 사격이 모두 길수가 되고, 사주 보완 오행입니다" };
    if (g.feasible) return { icon: "◎", rank: 1, why: "짝을 맞추면 사격이 모두 길수가 될 수 있습니다" };
    return { icon: "×", rank: 4, why: "이 성과는 어떤 글자를 붙여도 사격이 모두 길수가 되지 않습니다" };
  }

  // 이름 글자 선택 목록에 표시를 붙이고, 좋은 순서로 정렬합니다.
  function annotateSlot(selectId, kor, isFirst, res) {
    var sel = $(selectId), keep = sel.value, arr = listFor(kor);
    if (!arr.length) return;
    var rows = arr.map(function (e) {
      var c = { char: e[0], kor: kor, mean: e[1] || "", strokes: e[2], radical: e[3], el: e[4] };
      var m = markOf(gradeChar(c, isFirst, res));
      // 뜻을 알 수 없는 글자는 수리가 맞아도 추천하지 않습니다.
      if (!c.mean && m.rank < 3) m = { icon: "·", rank: 3, why: "수리는 맞지만 뜻 정보가 없는 글자입니다" };
      var wish = WISHES.some(function (wv) { return wishMatch(wv, c.mean); });
      return { c: c, m: m, wish: wish };
    });
    rows.sort(function (a, b) {
      if (a.m.rank !== b.m.rank) return a.m.rank - b.m.rank;
      if (a.wish !== b.wish) return a.wish ? -1 : 1;              // 좋은 뜻을 가진 글자를 먼저
      if (!!b.c.mean !== !!a.c.mean) return b.c.mean ? 1 : -1;
      return a.c.strokes - b.c.strokes;
    });
    sel.innerHTML = "";
    var none = document.createElement("option");
    none.value = ""; none.textContent = "한자 없음 (한글 이름)";
    sel.appendChild(none);
    rows.forEach(function (r) {
      var o = document.createElement("option");
      o.value = r.c.char;
      o.textContent = (r.m.icon ? r.m.icon + " " : "") + r.c.char + " " + (r.c.mean || "뜻 정보 없음")
        + " · " + r.c.strokes + "획 · " + r.c.el;
      o.title = r.m.why;
      sel.appendChild(o);
    });
    // 고르지 않았다면 가장 잘 맞는 글자를 먼저 보여줍니다. 목록도 그 글자에서 열립니다.
    if (rows.some(function (r) { return r.c.char === keep; })) {
      sel.value = keep;
    } else {
      sel.value = "";
    }
    var best = rows.filter(function (r) { return r.m.rank === 0; }).length;
    var good = rows.filter(function (r) { return r.m.rank === 1; }).length;
    var note = $(isFirst ? "n1Note" : "n2Note");
    if (note) note.textContent = arr.length + "자 중 ★ " + best + "자, ◎ " + good + "자";
  }

  function annotateHanja(res) {
    if (!state.surHanja) {
      ["n1Note", "n2Note"].forEach(function (id) {
        if ($(id)) $(id).textContent = "성 한자를 고르면 어울리는 한자에 표시가 붙습니다";
      });
      return;
    }
    var n1 = ($("n1Kor").value || "").slice(0, 1);
    var n2 = ($("n2Kor").value || "").slice(0, 1);
    if (n1) annotateSlot("n1Han", n1, true, res);
    if (n2 && state.len === 2) annotateSlot("n2Han", n2, false, res);
  }

  /* ---------------------------------------------------------------- 평가 */
  function evaluate() {
    var saju = analyzeSaju(state.date, state.time, currentShift());
    var need = neededElements(saju);
    var chars = state.chars;
    var korName = state.surKor + state.nameKor;
    var hasName = !!state.surKor && state.nameKor.length === (state.len === 2 ? 2 : 1);
    var hasHanja = hasName && !!state.surHanja && chars.length > 0 && chars.every(function (c) { return c; });
    var out = { saju: saju, need: need, korName: korName, hasName: hasName, hasHanja: hasHanja };

    var se = soundElements(korName, state.school), soundRels = [], soundOk = true;
    for (var a = 0; a < se.length - 1; a++) {
      var r = relation(se[a].el, se[a + 1].el);
      soundRels.push(r); if (!r.ok) soundOk = false;
    }
    out.sound = { parts: se, rels: soundRels, ok: soundOk };

    var vy = vowelYin(korName);
    out.vowel = { parts: vy, ok: vowelBalanced(vy) };

    if (hasHanja) {
      var sg = suri(state.surHanja.strokes, chars[0].strokes, chars[1] ? chars[1].strokes : null);
      out.suri = sg;
      out.suriVerdicts = ["won", "hyeong", "i", "jeong"].map(function (k) { return numVerdict(sg[k]); });
      out.suriOk = out.suriVerdicts.every(function (v) { return v === "길"; });
      out.suriEl = suriChainOk(sg, state.scope);
      var all = [state.surHanja].concat(chars);
      var set = {};
      out.strokeYin = all.map(function (c) {
        var y = c.strokes % 2 === 1 ? "양" : "음";
        set[y] = true;
        return { char: c.char, strokes: c.strokes, yin: y };
      });
      out.strokeYinOk = Object.keys(set).length > 1;
      var nameEls = chars.map(function (c) { return c.el; });
      out.resource = {
        els: nameEls,
        matched: nameEls.filter(function (e) { return need.indexOf(e) >= 0; }),
        clashed: nameEls.filter(function (e) { return saju.strong.indexOf(e) >= 0; }),
        ok: nameEls.some(function (e) { return need.indexOf(e) >= 0; })
      };
    }

    var selected = WISHES.filter(function (w) { return state.wishes.indexOf(w.key) >= 0; });
    out.wish = {
      selected: selected,
      rows: selected.map(function (w) {
        var hit = chars.filter(function (c) { return c && wishMatch(w, c.mean); });
        return { wish: w, chars: hit, ok: hit.length > 0 };
      })
    };
    out.wish.matched = out.wish.rows.filter(function (r) { return r.ok; }).length;
    out.wishScore = selected.length ? Math.round(out.wish.matched / selected.length * 100) : null;

    var clash = [], shared = [];
    state.family.forEach(function (f) {
      if (!f.name || f.name.length < 2) return;
      var given = f.name.slice(1);
      state.nameKor.split("").forEach(function (ch) {
        if (given.indexOf(ch) < 0) return;
        // 형제와 같은 글자는 돌림자로 봅니다. 부모 이름과 겹치는 것만 기휘로 봅니다.
        if (f.kind === "sibling") shared.push({ who: f.label, ch: ch, name: f.name });
        else clash.push({ who: f.label, ch: ch });
      });
    });
    out.family = { clash: clash, shared: shared, ok: clash.length === 0 };

    var score = 0;
    if (hasHanja) {
      score += out.suriVerdicts.reduce(function (acc, v) { return acc + (v === "길" ? 10 : v === "반길" ? 5 : 0); }, 0);
      score += out.suriEl.ok ? 15 : 5;
      score += out.resource.ok ? 18 : (out.resource.clashed.length ? 4 : 9);
      score += out.strokeYinOk ? 5 : 2;
    } else { score += 50; }
    score += out.sound.ok ? 10 : 3;
    score += out.vowel.ok ? 5 : 2;
    score += out.family.ok ? 7 : 0;
    out.score = hasName ? Math.round(score) : null;
    return out;
  }

  /* --------------------------------------------------- 이름 뜻 풀이 (규칙) */
  // 부수로 글자의 생김새를 설명합니다.
  var RADICAL_HINT = {
    "人": "사람 인(亻)", "水": "물 수(氵)", "火": "불 화", "木": "나무 목", "金": "쇠 금",
    "土": "흙 토", "山": "메 산", "玉": "구슬 옥(王)", "心": "마음 심(忄)", "手": "손 수(扌)",
    "言": "말씀 언", "日": "날 일", "月": "달 월", "女": "계집 녀", "子": "아들 자",
    "艸": "풀 초(艹)", "竹": "대 죽", "糸": "실 사", "示": "보일 시(礻)", "貝": "조개 패",
    "雨": "비 우", "目": "눈 목", "石": "돌 석", "田": "밭 전", "禾": "벼 화", "羽": "깃 우",
    "馬": "말 마", "鳥": "새 조", "魚": "물고기 어", "車": "수레 거", "門": "문 문", "行": "다닐 행"
  };
  // 이름에 쓸 때 한 번 더 생각해볼 뜻
  var CAUTION_WORDS = ["엄할", "험할", "날카로", "가파", "죽", "병", "어두", "슬플", "울", "무서", "빌", "잠꼬대", "물러날", "비웃"];

  // 받침에 맞는 조사를 붙입니다. 괄호로 끝나면 괄호 앞 글자로 판단합니다.
  function josa(word, pair) {
    var w = String(word || "").replace(/\([^)]*\)\s*$/, "").replace(/['"\s]+$/, "");
    var last = w.charCodeAt(w.length - 1) - 0xAC00;
    var opts = pair.split("/");
    if (last < 0 || last > 11171) return opts[0];          // 한글이 아니면 앞쪽 조사
    return (last % 28) !== 0 ? opts[0] : opts[1];          // 받침이 있으면 앞쪽
  }

  // 훈을 사람에 빗댄 말로 바꿉니다. 표에 없으면 훈을 그대로 씁니다.
  function phraseOf(mean) {
    var m = pureMeaning(mean);
    var table = window.MEANING_PHRASES || [];
    for (var i = 0; i < table.length; i++) {
      if (m.indexOf(table[i][0]) === 0) {
        return { adn: table[i][1], conn: table[i][2], mid: table[i][3], end: table[i][4], known: true };
      }
    }
    var ul = josa(m, "을/를");
    return {
      adn: "'" + m + "'" + ul + " 품은", conn: "'" + m + "'" + ul + " 품고",
      mid: "'" + m + "'의 뜻을 지니고", end: "'" + m + "'의 뜻처럼 자라라", known: false
    };
  }

  // "본보기가 되어 우뚝 선 사람" 같은 한 줄과, 그 풀이 문장을 만듭니다.
  function blessingOf(chars) {
    if (!chars.length) return null;
    var ph = chars.map(function (c) { return phraseOf(c.mean); });
    var title, body;
    // "…기를"로 끝나는 바람 문장은 "바라는 뜻이에요"로 받습니다.
    function close(end) { return /기를$/.test(end) ? end + " 바라는 뜻이에요." : end + "는 뜻이에요."; }
    if (ph.length === 1) {
      title = ph[0].adn + " 사람";
      body = close(ph[0].end);
    } else {
      title = ph[0].conn + " " + ph[1].adn + " 사람";
      body = ph[0].mid + ", " + close(ph[1].end);
    }
    return { title: title, body: body, known: ph.every(function (x) { return x.known; }) };
  }

  function readingSentences(res) {
    var chars = state.chars.filter(Boolean);
    if (!res.hasHanja || !chars.length) return null;
    var out = { parts: [], summary: "", cautions: [], family: null };

    chars.forEach(function (c) {
      var rad = RADICAL_HINT[c.radical] || (c.radical ? c.radical + " 부" : "");
      out.parts.push({
        char: c.char, mean: pureMeaning(c.mean), full: c.mean, strokes: c.strokes, el: c.el,
        text: c.char + "(" + c.kor + ")" + josa(c.kor, "은/는") + " "
          + (rad ? rad + josa(rad, "이/가") + " 들어간 글자로 " : "")
          + "'" + pureMeaning(c.mean) + "'" + josa(pureMeaning(c.mean), "을/를") + " 뜻합니다. "
          + c.strokes + "획이고 자원오행은 " + c.el + "입니다."
      });
      CAUTION_WORDS.forEach(function (w) {
        if ((c.mean || "").indexOf(w) >= 0 && out.cautions.indexOf(c.char) < 0) {
          out.cautions.push(c.char + "에는 '" + c.mean + "'처럼 한 번 더 생각해볼 뜻도 함께 있습니다.");
        }
      });
    });

    var means = chars.map(function (c) { return pureMeaning(c.mean); });
    var joined = means.length > 1
      ? "'" + means[0] + "'" + josa(means[0], "과/와") + " '" + means[1] + "'"
      : "'" + means[0] + "'";
    var full = state.surHanja.char + chars.map(function (c) { return c.char; }).join("");
    out.summary = full + "(" + res.korName + ")" + josa(res.korName, "은/는") + " "
      + joined + josa(means[means.length - 1], "이/가") + " 만난 이름입니다.";
    out.blessing = blessingOf(chars);

    // 가족과 나눠 쓰는 글자
    if (res.family.shared && res.family.shared.length) {
      var sh = res.family.shared[0];
      out.family = sh.name + josa(sh.name, "과/와") + " '" + sh.ch + "' 자를 나눠 쓰는 남매 이름입니다.";
    }
    return out;
  }

  function renderReading(res) {
    var box = $("outReading");
    if (!box) return;
    box.innerHTML = "";
    var r = readingSentences(res);
    if (!r) {
      box.appendChild(el("p", "empty", "성과 이름의 한자를 고르면 글자마다 뜻을 풀어 드립니다."));
      $("askWrap").hidden = true;
      return;
    }
    $("askWrap").hidden = false;
    var list = el("div", "reading-parts");
    r.parts.forEach(function (part) {
      var item = el("div", "reading-part");
      item.innerHTML = '<span class="han-sm el-' + part.el + '">' + part.char + "</span><p>" + part.text + "</p>";
      list.appendChild(item);
    });
    box.appendChild(list);
    if (r.blessing) {
      var bl = el("div", "blessing");
      bl.innerHTML = "<h3>" + r.blessing.title + "</h3><p>" + r.blessing.body + "</p>";
      box.insertBefore(bl, box.firstChild);
    }
    box.appendChild(el("p", "reading-sum", r.summary + (r.family ? " " + r.family : "")));
    r.cautions.forEach(function (c) { box.appendChild(el("p", "mini", "참고: " + c)); });
  }

  /* ------------------------------------------- 이름 뜻 풀이 (Claude에게 묻기) */
  var sampleApi = null, askBusy = false;
  (function initSample() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    window.claude.use("sample").then(function (api) {
      if (!api) return;
      sampleApi = api;
      var btn = $("askBtn");
      if (btn) btn.hidden = false;
    }).catch(function () { /* 이 화면에서는 쓸 수 없습니다 */ });
  })();

  function buildAskPrompt(res) {
    var chars = state.chars.filter(Boolean);
    var p = res.saju.pillars;
    var wishes = res.wish.selected.map(function (w) { return w.label; }).join(", ");
    var fam = state.family.filter(function (f) { return f.name; })
      .map(function (f) { return f.label + " " + f.name; }).join(", ");
    return [
      "아래 아기 이름의 뜻을 부모에게 설명하는 글을 써 주세요.",
      "",
      "이름: " + res.korName + " (" + state.surHanja.char + chars.map(function (c) { return c.char; }).join("") + ")",
      "한자: " + [state.surHanja].concat(chars).map(function (c) {
        return c.char + " " + (c.mean || "뜻 미상") + " / " + c.strokes + "획 / 부수 " + c.radical + " / 자원오행 " + c.el;
      }).join(" | "),
      "사주: " + p.year.kor + "년 " + p.month.kor + "월 " + p.day.kor + "일 " + p.hour.kor + "시, 일간 "
        + p.day.stem + p.day.stemEl + ", 오행 " + ELEMENTS.map(function (e) { return e + " " + res.saju.counts[e]; }).join(" "),
      "사주가 필요로 하는 오행: " + res.need.join(", "),
      "사격수리: " + (res.suri ? [res.suri.won, res.suri.hyeong, res.suri.i, res.suri.jeong].join("/") : "-"),
      fam ? "가족: " + fam : "",
      wishes ? "부모가 바라는 것: " + wishes : "",
      "",
      "요청:",
      "1) 글자마다 무슨 뜻인지, 어떤 부수로 이루어졌는지 쉽게 풀어 주세요.",
      "2) 두 글자를 합치면 어떤 사람이 되라는 뜻인지 한 문장으로 정리하고, 아이가 나중에 '내 이름이 왜 이래?'라고 물었을 때 부모가 해줄 수 있는 말을 한 문단 써 주세요.",
      "3) 이 한자를 쓸 때 참고할 점이 있으면 짧게 알려 주세요. 없으면 생략하세요.",
      "",
      "조건: 한국어 존댓말, 400자 안팎, 과장이나 운세 단정 없이 담백하게. 소제목 없이 문단으로만 쓰세요."
    ].filter(Boolean).join("\n");
  }

  function askClaude() {
    if (!sampleApi || askBusy) return;
    var res = lastResult;
    if (!res || !res.hasHanja) { toast("한자를 먼저 고르세요"); return; }
    askBusy = true;
    var out = $("askOut");
    out.hidden = false;
    out.textContent = "Claude가 이름을 읽어보는 중입니다…";
    $("askBtn").disabled = true;
    sampleApi(buildAskPrompt(res), {
      modelTier: "default",
      onText: function (ev) { out.textContent = ev.text; }
    }).then(function (r) {
      out.textContent = r.text;
    }).catch(function (err) {
      out.textContent = err && err.code === "not_granted"
        ? "권한이 없어 불러오지 못했습니다. 위 규칙 기반 풀이를 참고하세요."
        : "풀이를 가져오지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
    }).then(function () {
      askBusy = false;
      $("askBtn").disabled = false;
    });
  }

  /* ---------------------------------------------------------------- 렌더 */
  var lastResult = null;
  function render() {
    var res = evaluate(), s = res.saju, p = s.pillars;
    lastResult = res;

    $("outHan").textContent = res.hasHanja
      ? state.surHanja.char + state.chars.map(function (c) { return c.char; }).join("")
      : (res.hasName ? "한글 이름" : "\u2014");
    $("outKor").textContent = res.hasName ? res.korName.split("").join(" ") : "이름을 입력하세요";
    $("outScore").textContent = res.score === null ? "\u2014" : res.score;
    $("outWishScore").textContent = res.wishScore === null ? "—" : res.wishScore;

    $("outSaju").firstChild.nodeValue = p.year.kor + "년 " + p.month.kor + "월 " + p.day.kor + "일 " + p.hour.kor + "시 ";
    $("outSajuSub").textContent = p.year.han + " " + p.month.han + " " + p.day.han + " " + p.hour.han
      + " · 일간 " + p.day.stem + p.day.stemEl + p.day.yin + " · " + s.term + " 이후 " + p.month.branch + "월생 · " + s.hourNote
      + (s.termExact ? " · " + s.term + " " + s.termAt + " 이후" : " · 절기 근삿값 기준");

    // 사주는 만세력처럼 가는 선의 표로 보여줍니다.
    var order = [["시주", p.hour, "hour"], ["일주", p.day, "day"], ["월주", p.month, "month"], ["년주", p.year, "year"]];
    var tb = $("outPillars").querySelector("tbody");
    tb.innerHTML = "";
    var head = document.createElement("tr");
    order.forEach(function (pair) {
      var th = document.createElement("th");
      th.textContent = pair[0];
      head.appendChild(th);
    });
    tb.appendChild(head);

    ["stem", "branch"].forEach(function (part) {
      var tr = document.createElement("tr");
      order.forEach(function (pair) {
        var pl = pair[1];
        var td = document.createElement("td");
        td.className = "gan el-" + (part === "stem" ? pl.stemEl : pl.branchEl);
        td.innerHTML = (part === "stem" ? pl.stemHan : pl.branchHan)
          + "<small>" + (part === "stem" ? pl.stem + " · " + pl.stemEl : pl.branch + " · " + pl.branchEl) + "</small>";
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });

    var hidTr = document.createElement("tr");
    hidTr.className = "hidden-row";
    order.forEach(function (pair) {
      var td = document.createElement("td");
      td.innerHTML = (s.hidden[pair[2]] || []).map(function (hh) {
        return '<span class="el-' + STEM_EL_BY_NAME[hh] + '">' + hh + "</span>";
      }).join(" ") || "—";
      hidTr.appendChild(td);
    });
    tb.appendChild(hidTr);

    var rootTr = document.createElement("tr");
    rootTr.className = "root-row";
    order.forEach(function (pair) {
      var root = s.rooted[pair[2]] || [];
      var td = document.createElement("td");
      td.innerHTML = root.length ? "뿌리 " + root.join("") : '<span class="no-root">뿌리 없음</span>';
      rootTr.appendChild(td);
    });
    tb.appendChild(rootTr);

    // 오행은 막대 하나에 비율로 합칩니다.
    var bw = $("outBars"); bw.innerHTML = "";
    var lw = $("outLegend"); lw.innerHTML = "";
    ELEMENTS.forEach(function (e) {
      var c = s.counts[e];
      var cell = el("div", c ? "bg-" + e : "none");
      cell.style.flexGrow = String(c || 0.55);
      cell.style.flexBasis = "0";
      cell.textContent = c ? (c >= 2 ? e + " " + c : e) : e + " 0";
      cell.title = e + " " + c + "개";
      bw.appendChild(cell);

      var grade = c >= 3 ? "과다" : c === 0 ? "없음" : c === 1 ? "부족" : "보통";
      var seedOnly = c === 0 && Object.keys(s.hidden).some(function (k) {
        return s.hidden[k].some(function (hh) { return STEM_EL_BY_NAME[hh] === e; });
      });
      var item = el("span", null, '<b class="el-' + e + '">' + e + "</b> " + c + "개 · " + (seedOnly ? "없음 (지장간에만)" : grade)
        + (e === s.seasonEl ? ' <span class="season">계절 기운</span>' : ""));
      lw.appendChild(item);
    });

    renderReading(res);
    renderWish(res);
    renderAdvice(s, res.need);
    renderChecks(res);
    renderSuri(res);
    renderDaeun(s, res.need);
    renderPopularity(res);
    renderCandidates(res);
    annotateHanja(res);
  }

  function renderWish(res) {
    var box = $("outWish"); box.innerHTML = "";
    var chars = state.chars.filter(Boolean);

    var bless = el("p", "bless");
    if (!res.hasName) {
      bless.textContent = "성과 이름을 입력하면, 그 이름이 품은 뜻을 한 문장으로 정리해 드립니다.";
      box.appendChild(bless);
      box.appendChild(el("p", "empty", "왼쪽 '부모의 마음'에서 아이에게 바라는 것을 먼저 골라두셔도 됩니다. 이름을 넣는 순간 그 마음이 담겼는지 함께 확인합니다."));
      return;
    }
    if (res.hasHanja) {
      var parts = chars.map(function (c) { return c.char + "은 '" + pureMeaning(c.mean) + "'"; }).join(", ");
      var tail = res.wish.selected.length
        ? res.wish.selected.map(function (w) { return w.phrase; }).join(" ") + " 아이로 자라기를 바라는 이름입니다."
        : "아이가 이 뜻처럼 자라기를 바라는 이름입니다.";
      bless.innerHTML = "<b>" + state.surHanja.char + chars.map(function (c) { return c.char; }).join("") + "</b> \u2014 "
        + parts + "이라는 뜻입니다. " + tail;
    } else {
      bless.textContent = "한자를 고르면 이름에 담긴 뜻을 문장으로 보여드립니다.";
    }
    box.appendChild(bless);

    if (!res.wish.selected.length) {
      box.appendChild(el("p", "empty", "왼쪽 '부모의 마음'에서 바라는 것을 고르면, 그 마음이 이름에 담겼는지 확인하고 어울리는 글자를 찾아드립니다."));
      return;
    }

    var list = el("div", "wish-rows");
    res.wish.rows.forEach(function (row) {
      var item = el("div", "wish-row");
      var head = el("div", "wish-head");
      head.innerHTML = "<h3>" + row.wish.label + "</h3>"
        + '<span class="pill ' + (row.ok ? "good" : "warn") + '">' + (row.ok ? "담겼어요" : "아직 없어요") + "</span>";
      item.appendChild(head);

      if (row.ok) {
        item.appendChild(el("p", null, row.chars.map(function (c) {
          return "<b>" + c.char + "</b> " + pureMeaning(c.mean);
        }).join(", ") + " \u2014 이 글자가 그 마음을 담고 있습니다."));
      } else {
        item.appendChild(el("p", null, "지금 이름에는 이 뜻을 가진 글자가 없습니다. 아래는 수리와 발음이 맞으면서 이 마음을 담은 글자입니다. 누르면 끝 글자로 바꿔 봅니다."));
        var picks = suggestForWish(row.wish, res);
        var picksBox = el("div", "wish-picks");
        if (!picks.length) {
          picksBox.appendChild(el("span", "mini", "조건을 만족하는 글자를 찾지 못했습니다. 첫 글자나 기준을 바꿔 보세요."));
        }
        picks.forEach(function (c) {
          var b = el("button", "wish-pick");
          b.type = "button";
          b.innerHTML = '<span class="han-sm el-' + c.el + '">' + c.char + "</span><span>" + c.kor + " · " + pureMeaning(c.mean)
            + (res.need.indexOf(c.el) >= 0 ? ' <i class="ok">사주 보완</i>' : "") + "</span>";
          b.addEventListener("click", function () {
            $("n2Kor").value = c.kor;
            fillSelect($("n2Han"), c.kor, c.char);
            update();
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
          picksBox.appendChild(b);
        });
        item.appendChild(picksBox);
      }
      list.appendChild(item);
    });
    box.appendChild(list);
  }

  function suggestForWish(wish, res) {
    if (!state.surHanja || state.len !== 2 || !state.chars[0]) return [];
    var allowed = allowedSecondStrokes(state.surHanja.strokes, state.chars[0].strokes, true);
    var famChars = avoidChars();
    var out = [];
    allowed.forEach(function (sx) {
      (BY_STROKE[sx] || []).forEach(function (c) {
        if (!c.mean || !wishMatch(wish, c.mean)) return;
        if (famChars[c.kor] || c.kor === state.surKor || c.kor === state.chars[0].kor) return;
        var full = state.surKor + state.chars[0].kor + c.kor;
        var se = soundElements(full, state.school), ok = true;
        for (var i = 0; i < se.length - 1; i++) if (!relation(se[i].el, se[i + 1].el).ok) ok = false;
        if (!ok) return;
        out.push(c);
      });
    });
    out.sort(function (a, b) {
      var an = res.need.indexOf(a.el) >= 0 ? 0 : 1, bn = res.need.indexOf(b.el) >= 0 ? 0 : 1;
      if (an !== bn) return an - bn;
      var ap = POP_NAMESET[state.chars[0].kor + a.kor] ? 0 : 1, bp = POP_NAMESET[state.chars[0].kor + b.kor] ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return a.strokes - b.strokes;
    });
    return out.slice(0, 10);
  }

  function renderAdvice(s, need) {
    var aw = $("outAdvice"); aw.innerHTML = "";
    s.strong.forEach(function (e) {
      var drain = GEN[e], next = GEN[drain];
      var control = Object.keys(KUK).filter(function (k) { return KUK[k] === e; })[0];
      var item = el("div", "advice-item");
      item.appendChild(el("h3", null, e + "(" + EL_LABEL[e] + ")가 여덟 글자 중 " + s.counts[e] + "개로 과다합니다"));
      var msg = "부족한 " + control + "(" + EL_LABEL[control] + ")을 이름에 직접 넣어 누르는 방법도 있지만, 강한 기운에 약한 하나는 오히려 말라버릴 수 있습니다(왕자충쇠 旺者冲衰). "
        + "이럴 때는 <b>" + drain + "(" + EL_LABEL[drain] + ")으로 기운을 빼고 " + next + "(" + EL_LABEL[next] + ")으로 흘려보내 물꼬를 터주는 쪽</b>이 안전합니다. "
        + "사주에 이미 있는 글자를 살리는 방식이라 부작용이 적습니다.";
      if (s.counts[control] === 0) msg += " " + control + "은 원국에 하나도 없어 더 조심스럽습니다. 대운에서 들어오는 시기를 아래 표에서 확인하세요.";
      item.appendChild(el("p", null, msg));
      var flow = el("div", "flow");
      flow.innerHTML = '<span class="node el-' + e + '">' + e + " " + s.counts[e] + '개</span><span class="arrow">기운을 빼서 →</span>'
        + '<span class="node el-' + drain + '">' + drain + '</span><span class="arrow">→ 흘려보내면 →</span>'
        + '<span class="node el-' + next + '">' + next + "</span>";
      item.appendChild(flow);
      aw.appendChild(item);
    });
    var season = el("div", "advice-item");
    season.appendChild(el("h3", null, "계절의 기운: " + s.pillars.month.branch + "월 " + s.seasonEl + "(" + EL_LABEL[s.seasonEl] + ")"));
    season.appendChild(el("p", null,
      "월지는 태어난 계절이라 사주 전체 힘의 30~50%를 혼자 차지한다고 봅니다. 같은 한 글자라도 월지의 "
      + s.seasonEl + "은 다른 자리의 " + s.seasonEl + "보다 훨씬 무겁습니다. 개수만 보지 말고 이 기운을 먼저 보세요."
      + (s.counts[s.seasonEl] >= 3 ? " 지금은 계절 기운까지 과다한 쪽이라 더 뚜렷합니다." : "")));
    aw.appendChild(season);

    if (s.none.length) {
      var i2 = el("div", "advice-item");
      i2.appendChild(el("h3", null, "원국에 없는 오행: " + s.none.join(", ")));
      var seeds = [];
      s.none.forEach(function (e) {
        var where = [];
        ["year", "month", "day", "hour"].forEach(function (k) {
          s.hidden[k].forEach(function (h) {
            if (STEM_EL_BY_NAME[h] === e) where.push(s.pillars[k].branch + "(" + h + ")");
          });
        });
        if (where.length) seeds.push(e + "은 " + where.join(", ") + " 속에 씨앗만 있습니다");
      });
      i2.appendChild(el("p", null,
        "오행이 하나쯤 빠진 사주는 흔합니다. "
        + (seeds.length ? seeds.join(". ") + ". 지장간 속 기운은 평소에는 잠겨 있다가 운에서 충이나 합으로 건드릴 때 열립니다. 겉으로 드러난 기운과 같게 볼 수는 없습니다. " : "지장간에도 이 기운이 없어 씨앗조차 없는 상태입니다. ")
        + "없는 기운은 이름으로 조금 거들 수 있고, 대운에서 들어오는 시기에 채워집니다."));
      aw.appendChild(i2);
    }
    var i3 = el("div", "advice-item");
    i3.appendChild(el("h3", null, "이름에 쓰면 좋은 자원오행: " + (need.length ? need.join(" → ") : "특별히 없음")));
    var avoid = s.strong.map(function (e) { return Object.keys(GEN).filter(function (k) { return GEN[k] === e; })[0]; });
    i3.appendChild(el("p", null, "앞쪽일수록 우선합니다." + (s.strong.length ? " 반대로 " + s.strong.join(", ") + "과 이를 더 키우는 " + avoid.join(", ") + "은 피하는 편이 좋습니다." : "")));
    aw.appendChild(i3);
  }

  function renderChecks(res) {
    var cw = $("outChecks"); cw.innerHTML = "";
    var pass = 0, total = 0;
    function add(title, ok, chainHtml, note, soft) {
      total++; if (ok) pass++;
      var c = el("div", "check"), top = el("div", "check-top");
      top.appendChild(el("h3", null, title));
      top.appendChild(el("span", "pill " + (ok ? "good" : soft ? "warn" : "bad"), ok ? "양호" : soft ? "참고" : "주의"));
      c.appendChild(top);
      if (chainHtml) c.appendChild(el("div", "chain", chainHtml));
      if (note) c.appendChild(el("p", null, note));
      cw.appendChild(c);
    }
    function chainHTML(items, rels) {
      return items.map(function (it, i) {
        return chip(it.label, it.el) + (i < rels.length
          ? '<span class="rel' + (rels[i].ok ? "" : " x") + '">' + (rels[i].ok ? (rels[i].mark === "비화" ? "비화" : "생") : "극") + "</span>" : "");
      }).join("");
    }

    if (!res.hasName) {
      var guide = el("div", "check");
      var gtop = el("div", "check-top");
      gtop.appendChild(el("h3", null, "이름을 입력해 주세요"));
      gtop.appendChild(el("span", "pill warn", "대기"));
      guide.appendChild(gtop);
      guide.appendChild(el("p", null, "왼쪽에서 성과 이름을 넣으면 발음오행·발음음양·사격수리·수리오행·수리음양·자원오행을 한 번에 검사합니다. 사주는 생년월일시만으로도 아래에서 확인할 수 있습니다."));
      cw.appendChild(guide);
      $("checkSummary").textContent = "이름 입력 대기 중";
      return;
    }

    add("발음오행", res.sound.ok,
      chainHTML(res.sound.parts.map(function (x) { return { el: x.el, label: x.ch + " " + x.el }; }), res.sound.rels),
      res.sound.ok ? "초성 오행이 서로 살리거나 같은 기운입니다." : "초성 오행에 상극이 있습니다. 왼쪽에서 기준(운해본·해례본)을 바꿔 비교해 보세요.");

    add("발음음양", res.vowel.ok,
      res.vowel.parts.map(function (x) { return '<b class="chip" style="background:var(--surface-2)">' + x.ch + " " + x.yin + "</b>"; }).join(""),
      res.vowel.ok ? "밝은 모음(양)과 어두운 모음(음)이 함께 있어 균형이 맞습니다."
        : "양성 모음(ㅏ ㅗ ㅑ ㅛ 등)이 없어 한쪽으로 치우쳤습니다. ㅣ는 중성이라 어느 쪽도 채우지 못합니다. 가중치가 낮은 항목이라 한자 획수 음양이 맞으면 보완됩니다.", !res.vowel.ok);

    if (res.hasHanja) {
      var labels = ["원", "형", "이", "정"], order = ["won", "hyeong", "i", "jeong"];
      add("사격수리", res.suriOk,
        order.map(function (k, i) {
          var v = numVerdict(res.suri[k]);
          var bg = v === "길" ? "var(--good-soft)" : v === "흉" ? "var(--bad-soft)" : "var(--warn-soft)";
          var fg = v === "길" ? "var(--good)" : v === "흉" ? "var(--bad)" : "var(--warn)";
          return '<b class="chip" style="background:' + bg + ';color:' + fg + '">' + labels[i] + " " + res.suri[k] + "</b>";
        }).join(""),
        res.suriOk ? "네 격이 모두 길수입니다. 아래에서 시기별 풀이를 보세요." : "흉수가 섞여 있습니다. 아래 풀이에서 어느 시기인지 확인하세요.");

      add("수리오행", res.suriEl.ok,
        chainHTML(res.suriEl.els.map(function (e, i) { return { el: e, label: labels[i] + " " + e }; }), res.suriEl.rels),
        res.suriEl.ok ? "격과 격이 서로 살립니다." : "격 사이에 상극이 있습니다. 범위를 세 격으로 바꾸면 달라질 수 있습니다.");

      add("수리음양", res.strokeYinOk,
        res.strokeYin.map(function (x) { return '<b class="chip" style="background:var(--surface-2)">' + x.char + " " + x.strokes + "획 " + x.yin + "</b>"; }).join(""),
        res.strokeYinOk ? "획수의 홀짝이 섞여 음양이 조화롭습니다." : "획수가 모두 홀수이거나 모두 짝수로 치우쳤습니다.");

      var note;
      if (res.resource.matched.length === res.resource.els.length) note = "이름 글자가 모두 보완 오행입니다.";
      else if (res.resource.matched.length) note = res.resource.matched.join(", ") + "이(가) 사주를 보완합니다. 나머지 글자는 중립이거나 과다한 기운 쪽입니다.";
      else note = "보완 오행이 없습니다. 뜻을 우선한 선택이라면 그대로 가도 되지만, 한 글자는 보완 오행으로 바꾸는 편이 좋습니다.";
      add("자원오행", res.resource.ok,
        res.resource.els.map(function (e, i) { return chip(state.chars[i].char + " " + e, e); }).join("")
          + '<span class="rel">필요: ' + res.need.join(", ") + "</span>", note);
    } else {
      [["사격수리", "원·형·이·정 네 격의 길흉"], ["수리오행", "격과 격의 상생 관계"],
       ["수리음양", "획수 홀짝의 균형"], ["자원오행", "한자가 품은 오행"]].forEach(function (pair) {
        total--; // 한자 없이 판정할 수 없는 항목은 통과 여부에서 빼고 안내만 합니다
        var c = el("div", "check"), top = el("div", "check-top");
        top.appendChild(el("h3", null, pair[0]));
        top.appendChild(el("span", "pill warn", "한자 필요"));
        c.appendChild(top);
        c.appendChild(el("p", null, pair[1] + "을(를) 보려면 왼쪽에서 한자를 고르세요. 한글 이름으로 쓰실 거라면 이 항목은 넘어가도 됩니다."));
        cw.appendChild(c);
      });
    }

    var famChips = res.family.clash.map(function (c) {
      return '<b class="chip" style="background:var(--bad-soft);color:var(--bad)">' + c.ch + " · " + c.who + "</b>";
    }).concat(res.family.shared.map(function (c) {
      return '<b class="chip" style="background:var(--good-soft);color:var(--good)">' + c.ch + " · 돌림자</b>";
    })).join("");
    var famNote;
    if (!res.family.ok) famNote = "부모 이름의 글자는 쓰지 않는 것이 전통(기휘)이며, 가족 안에서 부를 때도 혼동됩니다.";
    else if (res.family.shared.length) famNote = res.family.shared.map(function (c) { return c.name; }).join(", ")
      + "와(과) '" + res.family.shared[0].ch + "'을(를) 나눠 쓰는 돌림자입니다. 형제끼리 글자를 공유하는 것은 기휘에 어긋나지 않습니다.";
    else famNote = "부모·형제 이름과 겹치는 글자가 없습니다.";
    add("가족 글자 (기휘)", res.family.ok, famChips, famNote);

    $("checkSummary").textContent = pass + " / " + total + " 항목 통과";
  }

  function renderSuri(res) {
    var box = $("outSuri"); box.innerHTML = "";
    if (!res.hasHanja) {
      box.appendChild(el("p", "empty", "한자를 선택하면 네 격의 수와 풀이가 나옵니다."));
      return;
    }
    STAGES.forEach(function (stage) {
      var n = res.suri[stage.key], k = wrap81(n), v = numVerdict(n);
      var info = SURI_TEXT[k] || ["일반수", "특별히 전해지는 풀이가 없는 수입니다."];
      var item = el("div", "suri-item");
      var numBox = el("div", "suri-num");
      numBox.innerHTML = "<b>" + n + "</b><span>" + stage.label + "<br>" + stage.age + "</span>";
      item.appendChild(numBox);
      var main = el("div", "suri-main");
      var pillCls = v === "길" ? "good" : v === "흉" ? "bad" : "warn";
      main.innerHTML = "<h3>" + info[0] + ' <span class="pill ' + pillCls + '">' + v + "수</span></h3>"
        + "<p>" + stage.lead + " " + info[1] + "</p>"
        + '<p class="mini" style="margin-top:6px">' + stage.desc + " 계산: "
        + (stage.key === "won" ? "이름 두 글자" : stage.key === "hyeong" ? "성 + 이름 첫 글자" : stage.key === "i" ? "성 + 이름 끝 글자" : "성과 이름 전체")
        + " = " + n + "획</p>";
      item.appendChild(main);
      box.appendChild(item);
    });
  }

  function renderDaeun(s, need) {
    var p = s.pillars, birth = s.birth;
    var yangYear = mod(p.year.index, 10) % 2 === 0;
    var forward = (yangYear && state.gender === "male") || (!yangYear && state.gender === "female");
    // 다음(순행) 또는 지난(역행) 절기까지의 날수를 3으로 나눠 대운 시작 나이를 구합니다.
    var bd = new Date(birth.y, birth.m - 1, birth.d, birth.hh || 0, birth.mi || 0), dates = [];
    [birth.y - 1, birth.y, birth.y + 1].forEach(function (yy) {
      var list = termsOf(yy);
      if (list) {
        list.forEach(function (t) { dates.push(new Date(yy, t.month - 1, t.day, t.hour, t.min)); });
      } else {
        MONTH_BOUNDS.forEach(function (b) { dates.push(new Date(yy, b.m - 1, b.d)); });
      }
    });
    dates.sort(function (a, b) { return a - b; });
    var diff = null;
    for (var i = 0; i < dates.length; i++) {
      var dd = (dates[i] - bd) / 86400000;
      if (forward && dd > 0) { diff = dd; break; }
      if (!forward && dd <= 0) diff = -dd;
    }
    var startAge = Math.max(1, Math.round((diff == null ? 15 : diff) / 3));
    $("daeunSub").textContent = (forward ? "순행" : "역행") + " · " + startAge + "세부터 10년마다";

    var tb = $("outDaeun").querySelector("tbody"); tb.innerHTML = "";
    tb.appendChild(el("tr", null, "<th>나이</th><th>대운</th><th>천간 · 지지 오행</th><th>이 시기</th>"));
    var stageName = ["원격 0~20세", "형격 21~40세", "이격 41~60세", "정격 61세~"];
    // 과다한 오행과 그 오행을 더 키우는 오행은 주의로 봅니다.
    var avoid = [];
    s.strong.forEach(function (e) {
      if (avoid.indexOf(e) < 0) avoid.push(e);
      var feeder = Object.keys(GEN).filter(function (k) { return GEN[k] === e; })[0];
      if (feeder && avoid.indexOf(feeder) < 0) avoid.push(feeder);
    });
    for (var k = 0; k < 8; k++) {
      var dp = pillar(mod(p.month.index + (forward ? k + 1 : -(k + 1)), 60));
      var age = startAge + k * 10;
      var els = [dp.stemEl, dp.branchEl];
      var uniq = els.filter(function (e, i) { return els.indexOf(e) === i; });
      var helpful = uniq.filter(function (e) { return need.indexOf(e) >= 0; });
      var risky = uniq.filter(function (e) { return avoid.indexOf(e) >= 0; });
      var verdict = [];
      if (helpful.length) verdict.push("<b style='color:var(--good)'>" + helpful.join(", ") + " 보완</b>");
      if (risky.length) verdict.push("<b style='color:var(--warn)'>" + risky.join(", ") + " 주의</b>");
      if (!verdict.length) verdict.push("<span class='mini'>보통</span>");
      var tr = el("tr", null,
        "<td class='num'>" + age + " ~ " + (age + 9) + "세</td>"
        + "<td><span class='han-sm'>" + dp.han + "</span> " + dp.kor + "</td>"
        + "<td>" + dp.stemEl + " · " + dp.branchEl + "</td>"
        + "<td>" + verdict.join(" <span class='mini'>/</span> ")
        + "<div class='mini'>" + stageName[Math.min(3, Math.floor((age + 4) / 20))] + "</div></td>");
      tb.appendChild(tr);
    }
  }

  /* ------------------------------------------------------------ 인기 순위 */
  function renderPopularity() {
    var year = state.popYear, g = state.gender, name = state.nameKor;
    if (!name) {
      $("myRank").textContent = "\u2014";
      $("myRankNote").textContent = "이름을 입력하면 그 해 순위와 추세를 보여드립니다. 아래 TOP 20은 이름 없이도 볼 수 있습니다.";
      $("trendCaption").textContent = "연도별 순위 추세";
      $("trendChart").innerHTML = '<p class="empty">이름을 입력하면 추세를 그립니다.</p>';
      renderRankLists(year, g, name);
      return;
    }
    var hist = POP_INDEX[g + "|" + name] || {};
    var cur = hist[year];

    var totalThisYear = (POP[year] && POP[year][g]) ? POP[year][g].length : 0;
    if (cur) {
      $("myRank").textContent = cur.rank + "위";
      $("myRankNote").textContent = name + " · " + year + "년 " + (g === "male" ? "남자" : "여자") + " 이름 "
        + cur.count.toLocaleString() + "명. 상위 " + totalThisYear + "위 안에 드는 익숙한 이름입니다.";
    } else {
      $("myRank").textContent = "순위 밖";
      $("myRankNote").textContent = name + "은(는) " + year + "년 TOP " + (totalThisYear || 100)
        + " 안에 없습니다. 흔하지 않은 이름이라는 뜻입니다.";
    }
    renderTrend(name, hist, g);

    renderRankLists(year, g, name);
  }

  function renderRankLists(year, g, name) {
    ["male", "female"].forEach(function (gender) {
      var box = $(gender === "male" ? "rankMale" : "rankFemale");
      box.innerHTML = "";
      var rows = ((POP[year] || {})[gender] || []).slice(0, 20);
      var max = rows.length ? rows[0][2] : 1;
      rows.forEach(function (row) {
        var mine = row[1] === name && gender === g;
        var div = el("div", "rank-row" + (mine ? " me" : ""));
        div.innerHTML = "<span class='r'>" + row[0] + "</span>"
          + "<span class='n'><b>" + row[1] + "</b><i style='width:" + Math.max(4, row[2] / max * 74) + "px'></i></span>"
          + "<span class='c'>" + row[2].toLocaleString() + "</span>";
        box.appendChild(div);
      });
    });
  }

  function renderTrend(name, hist, gender) {
    var box = $("trendChart"), years = POP_YEARS.slice().sort();
    var pts = years.map(function (y) { return { y: y, rank: hist[y] ? hist[y].rank : null }; });
    var known = pts.filter(function (p) { return p.rank; });
    $("trendCaption").textContent = name + " · 연도별 " + (gender === "male" ? "남자" : "여자") + " 이름 순위 (위쪽이 높은 순위)";
    if (known.length < 2) {
      box.innerHTML = '<p class="empty">' + name + "은(는) TOP 100 기록이 " + (known.length ? "한 해뿐이라" : "없어") + " 추세를 그릴 수 없습니다.</p>";
      return;
    }
    var W = 560, H = 170, L = 34, R = 52, T = 16, B = 26;
    var iw = W - L - R, ih = H - T - B;
    var x = function (i) { return L + (years.length === 1 ? iw / 2 : i * iw / (years.length - 1)); };
    var y = function (r) { return T + (r - 1) / 99 * ih; };
    var svg = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + name + ' 연도별 순위 추세">'];
    [1, 25, 50, 75, 100].forEach(function (r) {
      svg.push('<line x1="' + L + '" y1="' + y(r).toFixed(1) + '" x2="' + (W - R) + '" y2="' + y(r).toFixed(1)
        + '" stroke="var(--chart-grid)" stroke-width="1" />');
      svg.push('<text x="' + (L - 7) + '" y="' + (y(r) + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="var(--muted)">' + r + "</text>");
    });
    years.forEach(function (yr, i) {
      if (i % 2 === 0 || i === years.length - 1) {
        svg.push('<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="var(--muted)">' + yr.slice(2) + "</text>");
      }
    });
    var run = [];
    pts.forEach(function (p, i) {
      if (p.rank) { run.push(x(i).toFixed(1) + "," + y(p.rank).toFixed(1)); }
      else if (run.length) {
        if (run.length > 1) svg.push('<polyline points="' + run.join(" ") + '" fill="none" stroke="var(--chart-line)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />');
        run = [];
      }
    });
    if (run.length > 1) svg.push('<polyline points="' + run.join(" ") + '" fill="none" stroke="var(--chart-line)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />');
    pts.forEach(function (p, i) {
      if (!p.rank) return;
      svg.push('<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.rank).toFixed(1) + '" r="4" fill="var(--chart-line)" stroke="var(--surface)" stroke-width="2"><title>'
        + p.y + "년 " + p.rank + "위 · " + hist[p.y].count.toLocaleString() + "명</title></circle>");
    });
    var last = known[known.length - 1], li = years.indexOf(last.y);
    svg.push('<text x="' + (x(li) + 9) + '" y="' + (y(last.rank) + 4).toFixed(1) + '" font-size="12" font-weight="700" fill="var(--ink)">'
      + last.rank + "위</text>");
    svg.push("</svg>");
    box.innerHTML = svg.join("");
  }

  /* ------------------------------------------------------------ 후보 탐색 */
  function renderCandidates(res, countOnly) {
    var tb = $("outCands").querySelector("tbody"), empty = $("candEmpty");
    if (!countOnly) tb.innerHTML = "";
    if (!state.surHanja || state.len !== 2) {
      if (countOnly) return 0;
      empty.hidden = false;
      empty.textContent = state.len !== 2 ? "두 글자 이름일 때 후보를 찾습니다."
        : (!state.surKor ? "성을 입력하면 후보를 찾습니다." : "성 한자를 선택하면 후보를 찾습니다.");
      return 0;
    }
    var keepFirst = $("optKeepFirst").checked && !!state.chars[0];
    var wantSuri = $("optSuri").checked, wantSuriEl = $("optSuriEl").checked;
    var wantSound = $("optSound").checked, wantYin = $("optYinYang").checked;
    var wantEl = $("optElement").checked, wantFam = $("optFamily").checked;
    var wantPop = $("optPopular").checked, wantMean = $("optMeaning").checked;
    var wantWish = $("optWish").checked;

    var firstPool = keepFirst ? [state.chars[0]] : listFor(state.nameKor.slice(0, 1)).map(function (e) {
      return { char: e[0], kor: state.nameKor.slice(0, 1), mean: e[1] || "", strokes: e[2], radical: e[3], el: e[4] };
    });
    var famChars = avoidChars();
    var S = state.surHanja.strokes, rows = [], seenName = {};

    firstPool.forEach(function (c1) {
      if (wantMean && !c1.mean) return;
      var allowed = [];
      for (var sx = 1; sx <= 40; sx++) {
        var sg = suri(S, c1.strokes, sx);
        if (wantSuri && !["won", "hyeong", "i", "jeong"].every(function (k) { return numVerdict(sg[k]) === "길"; })) continue;
        if (wantSuriEl && !suriChainOk(sg, state.scope).ok) continue;
        allowed.push(sx);
      }
      allowed.forEach(function (sx) {
        (BY_STROKE[sx] || []).forEach(function (c2) {
          if (c2.char === c1.char || c2.kor === c1.kor || c2.kor === state.surKor) return;
          if (wantMean && !c2.mean) return;
          if (wantFam && (famChars[c1.kor] || famChars[c2.kor])) return;
          var nameKor = c1.kor + c2.kor;
          if (wantPop && !POP_NAMESET[nameKor]) return;
          var full = state.surKor + nameKor;

          var se = soundElements(full, state.school), sOk = true;
          for (var i = 0; i < se.length - 1; i++) if (!relation(se[i].el, se[i + 1].el).ok) sOk = false;
          if (wantSound && !sOk) return;

          var vOk = vowelBalanced(vowelYin(full));
          if (wantYin && !vOk) return;

          var matched = [c1.el, c2.el].filter(function (e) { return res.need.indexOf(e) >= 0; }).length;
          if (wantEl && !matched) return;

          var wishHits = res.wish.selected.filter(function (w) {
            return wishMatch(w, c1.mean) || wishMatch(w, c2.mean);
          });
          if (wantWish && res.wish.selected.length && wishHits.length < res.wish.selected.length) return;

          var sg2 = suri(S, c1.strokes, c2.strokes);
          var verdicts = ["won", "hyeong", "i", "jeong"].map(function (k) { return numVerdict(sg2[k]); });
          var elChain = suriChainOk(sg2, state.scope);
          var popRow = POP_INDEX[state.gender + "|" + nameKor];
          var popRank = popRow && popRow[state.popYear] ? popRow[state.popYear].rank : null;
          var score = verdicts.reduce(function (a, v) { return a + (v === "길" ? 10 : v === "반길" ? 5 : 0); }, 0)
            + (elChain.ok ? 15 : 0) + matched * 9 + (sOk ? 10 : 0) + (vOk ? 5 : 0)
            + ((c1.strokes % 2) !== (c2.strokes % 2) ? 5 : 0)
            + (popRank ? 14 : 0) + (c1.mean && c2.mean ? 3 : 0) + wishHits.length * 8
            + (WISHES.some(function (w) { return wishMatch(w, c2.mean); }) ? 4 : 0);
          var key = full + c1.char + c2.char;
          if (seenName[key]) return;
          seenName[key] = 1;
          rows.push({
            kor: full, han: state.surHanja.char + c1.char + c2.char,
            mean: (c1.mean || "뜻 정보 없음") + " · " + (c2.mean || "뜻 정보 없음"),
            e1: c1.el, e2: c2.el, c1: c1, c2: c2,
            nums: [sg2.won, sg2.hyeong, sg2.i, sg2.jeong].join("/"),
            wishes: wishHits.map(function (w) { return w.label; }),
            pop: popRank, score: score,
            current: !!(state.chars[0] && state.chars[1] && c1.char === state.chars[0].char && c2.char === state.chars[1].char)
          });
        });
      });
    });

    if (countOnly) return rows.length;
    rows.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var ar = a.pop || 999, br = b.pop || 999;          // 실제로 쓰이는 이름을 먼저
      if (ar !== br) return ar - br;
      return a.kor.localeCompare(b.kor, "ko");
    });
    empty.hidden = rows.length > 0;
    if (!rows.length) empty.innerHTML = diagnoseEmpty();
    $("candSub").textContent = rows.length.toLocaleString() + "개 조합 중 상위 40개 · 행을 누르면 그 이름으로 바꿔 봅니다";

    tb.appendChild(el("tr", null, "<th>이름</th><th>한자</th><th>뜻</th><th>부모의 마음</th><th>자원오행</th><th>원/형/이/정</th><th>인기</th><th>점수</th>"));
    rows.slice(0, 40).forEach(function (r) {
      var tr = el("tr", "clickable" + (r.current ? " is-current" : ""),
        "<td><b class='han-sm'>" + r.kor + "</b>" + (r.current ? " <span class='mini'>현재</span>" : "") + "</td>"
        + "<td class='han-sm'>" + r.han + "</td><td>" + r.mean + "</td>"
        + "<td>" + (r.wishes.length ? r.wishes.map(function (w) { return '<span class="wish-tag">' + w + "</span>"; }).join(" ") : "<span class='mini'>—</span>") + "</td>"
        + "<td>" + chip(r.e1, r.e1) + " " + chip(r.e2, r.e2) + "</td>"
        + "<td class='num'>" + r.nums + "</td>"
        + "<td class='num'>" + (r.pop ? r.pop + "위" : "<span class='mini'>순위 밖</span>") + "</td>"
        + "<td class='num'>" + r.score + "</td>");
      tr.addEventListener("click", function () {
        $("n1Kor").value = r.c1.kor; fillSelect($("n1Han"), r.c1.kor, r.c1.char);
        $("n2Kor").value = r.c2.kor; fillSelect($("n2Han"), r.c2.kor, r.c2.char);
        update();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      tb.appendChild(tr);
    });
  }

  // 후보가 없을 때, 어떤 조건을 풀면 몇 개가 나오는지 알려줍니다.
  function diagnoseEmpty() {
    var boxes = [
      ["optSuri", "사격 네 격 모두 길수"], ["optSuriEl", "수리오행 상생"],
      ["optSound", "발음오행 상생"], ["optYinYang", "발음음양 조화"],
      ["optElement", "사주 보완 오행"], ["optFamily", "가족 글자 회피"],
      ["optPopular", "인기 TOP 100 이름만"], ["optMeaning", "뜻이 있는 한자만"],
      ["optWish", "고른 마음이 모두 담긴 이름만"], ["optKeepFirst", "첫 글자 고정"]
    ].filter(function (b) { return $(b[0]).checked; });

    var hints = [];
    boxes.forEach(function (b) {
      $(b[0]).checked = false;
      var n = countCandidates();
      $(b[0]).checked = true;
      if (n > 0) hints.push("<b>" + b[1] + "</b>을(를) 끄면 " + n.toLocaleString() + "개");
    });
    if (!hints.length) return "조건을 만족하는 조합이 없습니다. 첫 글자(돌림자)를 다른 글자로 바꿔 보세요. 성과 첫 글자의 획수 조합에 따라 쓸 수 있는 획수가 아예 없을 수 있습니다.";
    return "조건을 만족하는 조합이 없습니다. " + hints.join(", ") + " 나옵니다.";
  }

  // 조건을 하나 바꿔 봤을 때 몇 개가 나오는지만 세어 봅니다. (표는 그리지 않습니다)
  function countCandidates() {
    var probe = 0;
    try { probe = renderCandidates(lastResult, true); } catch (err) { probe = 0; }
    return probe || 0;
  }

  /* ------------------------------------------------------------ 한자 탐색기 */
  var explorerPick = null;
  function renderExplorer() {
    var kor = ($("expKor").value || "").slice(0, 1);
    var elFilter = $("expEl").value, strokeFilter = $("expStroke").value;
    var q = ($("expQuery").value || "").trim();
    var arr = listFor(kor).map(function (e) {
      return { char: e[0], kor: kor, mean: e[1] || "", strokes: e[2], radical: e[3], el: e[4] };
    });

    var sel = $("expStroke"), prev = sel.value;
    var strokes = [];
    arr.forEach(function (e) { if (strokes.indexOf(e.strokes) < 0) strokes.push(e.strokes); });
    strokes.sort(function (a, b) { return a - b; });
    sel.innerHTML = '<option value="">전체</option>' + strokes.map(function (s) {
      return '<option value="' + s + '">' + s + "획</option>";
    }).join("");
    if (strokes.indexOf(+prev) >= 0) sel.value = prev; else strokeFilter = "";

    var wishKey = $("expWish").value;
    var wish = WISHES.filter(function (w) { return w.key === wishKey; })[0];
    var list = arr.filter(function (e) {
      if (wish && !wishMatch(wish, e.mean)) return false;
      if (elFilter && e.el !== elFilter) return false;
      if (strokeFilter && e.strokes !== +strokeFilter) return false;
      if (q && e.mean.indexOf(q) < 0) return false;
      return true;
    });
    $("explorerSub").textContent = kor
      ? "'" + kor + "' 음 인명용 한자 " + arr.length + "자 중 " + list.length + "자 표시"
      : "한글 한 글자를 넣으면 그 음의 인명용 한자를 모두 보여줍니다";

    var grid = $("expGrid"); grid.innerHTML = "";
    list.forEach(function (e) {
      var card = el("button", "hanja-card");
      card.type = "button";
      card.innerHTML = '<span class="c el-' + e.el + '">' + e.char + "</span>"
        + '<span class="m"><b>' + (e.mean || "뜻 정보 없음") + "</b><span>" + e.strokes + "획 · " + e.el + " · 부수 " + (e.radical || "?") + "</span></span>";
      card.addEventListener("click", function () {
        explorerPick = e;
        $("expSelected").textContent = "선택: " + e.char + " (" + (e.mean || "뜻 정보 없음") + ", " + e.strokes + "획, 자원오행 " + e.el + ", 부수 " + e.radical + ") — 위 버튼으로 이름에 적용하세요.";
      });
      grid.appendChild(card);
    });
    if (!list.length) grid.appendChild(el("p", "empty", kor ? "조건에 맞는 한자가 없습니다." : "위에 한글 한 글자를 넣어보세요. 예: 예, 준, 서, 하"));
  }
  function applyPick(slot) {
    if (!explorerPick) { toast("먼저 한자를 고르세요"); return; }
    var korInput = slot === "first" ? $("n1Kor") : $("n2Kor");
    var hanSelect = slot === "first" ? $("n1Han") : $("n2Han");
    if (slot === "last" && state.len !== 2) { toast("외자 이름에는 끝 글자가 없습니다"); return; }
    korInput.value = explorerPick.kor;
    fillSelect(hanSelect, explorerPick.kor, explorerPick.char);
    update();
    toast(explorerPick.char + "을(를) " + (slot === "first" ? "첫" : "끝") + " 글자로 적용했습니다");
  }

  /* ---------------------------------------------------------------- 입력 */
  function syncFromInputs() {
    state.date = $("birthDate").value || "2026-09-09";
    state.time = $("birthTime").value || "12:00";
    state.surKor = ($("surKor").value || "").slice(0, 1);
    state.school = $("soundSchool").value;
    state.scope = $("suriScope").value;
    state.timeBase = $("timeBase").value;
    state.region = $("region").value;
    state.customLon = parseFloat($("customLon").value);
    $("regionWrap").hidden = state.timeBase === "kst";
    $("customLonWrap").hidden = state.timeBase === "kst" || state.region !== "custom";
    state.popYear = $("popYear").value || POP_YEARS[0];
    state.surHanja = lookup(state.surKor, $("surHan").value);
    var n1 = ($("n1Kor").value || "").slice(0, 1), n2 = ($("n2Kor").value || "").slice(0, 1);
    state.nameKor = state.len === 2 ? n1 + n2 : n1;
    state.chars = state.len === 2
      ? [lookup(n1, $("n1Han").value), lookup(n2, $("n2Han").value)]
      : [lookup(n1, $("n1Han").value)];
    state.wishes = Array.prototype.filter.call(document.querySelectorAll("#wishGrid input"), function (b) { return b.checked; })
      .map(function (b) { return b.value; });
    state.family = [
      { label: "아버지", name: $("fam1").value.trim(), kind: "parent" },
      { label: "어머니", name: $("fam2").value.trim(), kind: "parent" },
      { label: "형제", name: $("fam3").value.trim(), kind: "sibling" }
    ];
  }
  function update() { syncFromInputs(); render(); }

  function toast(msg) {
    var t = el("div", "toast", msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1900);
  }

  ["n1Han", "n2Han", "surHan"].forEach(function (id) {
    $(id).addEventListener("change", function () { this.dataset.touched = "1"; });
  });

  ["birthDate", "birthTime", "fam1", "fam2", "fam3", "soundSchool", "suriScope", "timeBase", "region", "customLon", "surHan", "n1Han", "n2Han", "popYear"]
    .forEach(function (id) {
      $(id).addEventListener("change", update);
      $(id).addEventListener("input", update);
    });
  ["surKor", "n1Kor", "n2Kor"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      var target = { surKor: "surHan", n1Kor: "n1Han", n2Kor: "n2Han" }[id];
      $(target).dataset.touched = "";
      fillSelect($(target), ($(id).value || "").slice(0, 1), null);
      update();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("#searchOpts input"), function (box) {
    box.addEventListener("change", update);
  });
  ["expKor", "expEl", "expStroke", "expQuery", "expWish"].forEach(function (id) {
    $(id).addEventListener("input", renderExplorer);
    $(id).addEventListener("change", renderExplorer);
  });
  if ($("askBtn")) $("askBtn").addEventListener("click", askClaude);
  $("expApplyFirst").addEventListener("click", function () { applyPick("first"); });
  $("expApplyLast").addEventListener("click", function () { applyPick("last"); });

  $("genderSeg").addEventListener("click", function (e) {
    var btn = e.target.closest("button"); if (!btn) return;
    Array.prototype.forEach.call(this.children, function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
    state.gender = btn.dataset.v; update();
  });
  $("lenSeg").addEventListener("click", function (e) {
    var btn = e.target.closest("button"); if (!btn) return;
    Array.prototype.forEach.call(this.children, function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
    state.len = +btn.dataset.v;
    $("n2Wrap").hidden = state.len === 1;
    update();
  });
  $("themeBtn").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    this.textContent = next === "dark" ? "주간" : "야간";
    try { localStorage.setItem("naming-theme", next); } catch (err) { /* 저장 불가 환경 */ }
  });
  // 한 장짜리 작명 기록을 채우고 인쇄 화면을 엽니다.
  function fillPrintSheet() {
    var res = lastResult || evaluate();
    var p = res.saju.pillars, chars = state.chars.filter(Boolean);
    var now = new Date();
    $("sheetDate").textContent = now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일 작성";
    $("sheetHan").textContent = res.hasHanja
      ? state.surHanja.char + chars.map(function (c) { return c.char; }).join("")
      : (res.hasName ? res.korName : "—");
    $("sheetKor").textContent = res.hasName ? res.korName.split("").join(" ") : "이름을 입력해 주세요";

    var r = res.hasHanja ? readingSentences(res) : null;
    $("sheetTitle").textContent = r && r.blessing ? r.blessing.title : "";
    $("sheetBody").textContent = r && r.blessing ? r.blessing.body : "";

    var cw = $("sheetChars"); cw.innerHTML = "";
    if (res.hasHanja) {
      [state.surHanja].concat(chars).forEach(function (c, i) {
        var row = el("div", "sheet-char");
        row.innerHTML = '<span class="ch">' + c.char + "</span>"
          + "<span><b>" + (i === 0 ? "성 " : "") + c.kor + "</b> " + (c.mean || "뜻 정보 없음") + "</span>"
          + '<span class="meta">' + c.strokes + "획 · 부수 " + (c.radical || "?") + " · 자원오행 " + c.el + "</span>";
        cw.appendChild(row);
      });
    }

    // 사주: 천간 · 지지 · 지장간
    var tb = $("sheetSaju").querySelector("tbody"); tb.innerHTML = "";
    var order = [["시주", p.hour, "hour"], ["일주", p.day, "day"], ["월주", p.month, "month"], ["년주", p.year, "year"]];
    var head = document.createElement("tr");
    order.forEach(function (pair) { head.innerHTML += "<th>" + pair[0] + "</th>"; });
    tb.appendChild(head);
    ["stem", "branch"].forEach(function (part) {
      var tr = document.createElement("tr");
      order.forEach(function (pair) {
        var pl = pair[1];
        tr.innerHTML += '<td class="gan">' + (part === "stem" ? pl.stemHan : pl.branchHan)
          + "<small>" + (part === "stem" ? pl.stem + " " + pl.stemEl : pl.branch + " " + pl.branchEl) + "</small></td>";
      });
      tb.appendChild(tr);
    });
    var hid = document.createElement("tr");
    hid.className = "hid";
    order.forEach(function (pair) { hid.innerHTML += "<td>" + ((res.saju.hidden[pair[2]] || []).join(" ") || "—") + "</td>"; });
    tb.appendChild(hid);

    var counts = ELEMENTS.map(function (e) { return e + " " + res.saju.counts[e]; }).join(" · ");
    $("sheetSajuNote").textContent = p.year.kor + "년 " + p.month.kor + "월 " + p.day.kor + "일 " + p.hour.kor + "시 · 일간 "
      + p.day.stem + p.day.stemEl + " · " + counts + " · 계절 " + res.saju.seasonEl
      + (res.need.length ? " · 보완 " + res.need.join(", ") : "");

    // 검사 요약
    var ct = $("sheetChecks").querySelector("tbody"); ct.innerHTML = "";
    function addRow(label, value, ok) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<th>" + label + "</th><td>" + value + "</td>"
        + '<td class="v ' + (ok ? "ok" : "care") + '">' + (ok ? "양호" : "참고") + "</td>";
      ct.appendChild(tr);
    }
    addRow("발음오행", res.sound.parts.map(function (x) { return x.ch + " " + x.el; }).join(" · "), res.sound.ok);
    addRow("발음음양", res.vowel.parts.map(function (x) { return x.ch + " " + x.yin; }).join(" · "), res.vowel.ok);
    if (res.hasHanja) {
      var labels = ["원", "형", "이", "정"], keys = ["won", "hyeong", "i", "jeong"];
      addRow("사격수리", keys.map(function (k, i) { return labels[i] + " " + res.suri[k]; }).join(" · "), res.suriOk);
      addRow("수리오행", res.suriEl.els.join(" → "), res.suriEl.ok);
      addRow("수리음양", res.strokeYin.map(function (x) { return x.char + " " + x.yin; }).join(" · "), res.strokeYinOk);
      addRow("자원오행", res.resource.els.join(" · ") + (res.need.length ? " (필요 " + res.need.join(", ") + ")" : ""), res.resource.ok);
      SURI_STAGE_ROWS(res, ct);
    }
    addRow("가족 글자", res.family.ok
      ? (res.family.shared.length ? res.family.shared[0].ch + " 돌림자" : "겹침 없음")
      : res.family.clash.map(function (c) { return c.ch + " " + c.who; }).join(", "), res.family.ok);

    $("sheetBirth").textContent = state.date + " " + state.time + " 출생"
      + (state.timeBase === "kst" ? " · 한국 표준시" : " · " + state.region + " 경도 보정 " + currentShift() + "분")
      + (res.saju.termExact ? " · " + res.saju.term + " " + res.saju.termAt + " 이후" : "");
  }

  // 사격 네 격의 이름을 한 줄로 덧붙입니다.
  function SURI_STAGE_ROWS(res, ct) {
    var names = STAGES.map(function (stg) {
      var info = SURI_TEXT[wrap81(res.suri[stg.key])];
      return stg.label.split(" ")[0] + " " + (info ? info[0].split(" ")[0] : "-");
    }).join(" · ");
    var tr = document.createElement("tr");
    tr.innerHTML = '<th>사격 풀이</th><td colspan="2">' + names + "</td>";
    ct.appendChild(tr);
  }

  // 기기 판별: 모바일에서는 다운로드 대신 공유 시트나 길게 눌러 저장을 씁니다.
  var UA = navigator.userAgent || "";
  var IS_IOS = /iP(hone|od|ad)/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1);
  var IS_ANDROID = /Android/i.test(UA);
  var IS_MOBILE = IS_IOS || IS_ANDROID;
  // 카카오톡·네이버·인스타그램 같은 앱 안의 브라우저는 파일 다운로드를 막습니다.
  var IN_APP = /KAKAOTALK|NAVER\(inapp|DaumApps|Instagram|FBAN|FBAV|FB_IAB|Line\/|everytimeApp|; wv\)/i.test(UA);

  var sheetOpen = false;
  var sheetJob = null;      // 준비 중인 작업 (Promise)
  var sheetReady = null;    // 준비가 끝난 결과 { png, pdf, dataUrl }
  var SHEET_BTNS = ["sheetPdf", "sheetImage", "sheetShare"];
  var SHEET_IDLE_MSG = "작명 기록 한 장입니다. 저장하거나 바로 보낼 수 있어요.";

  function setBarMsg(text) { $("sheetBarMsg").textContent = text; }
  function setSheetBusy(busy) {
    SHEET_BTNS.forEach(function (id) { $(id).disabled = busy; });
  }

  function closeSheet() {
    sheetOpen = false;
    sheetJob = null;
    sheetReady = null;
    document.body.classList.remove("sheet-view");
    $("sheetBar").hidden = true;
    closePreview();
  }

  $("pdfBtn").addEventListener("click", function () {
    try { fillPrintSheet(); } catch (err) { toast("기록을 만들지 못했습니다"); return; }
    // 앱 안의 브라우저처럼 인쇄창이 열리지 않는 곳도 있어, 기록지를 화면에 먼저 띄웁니다.
    sheetOpen = true;
    sheetJob = null;
    sheetReady = null;
    document.body.classList.add("sheet-view");
    $("sheetBar").hidden = false;
    if (window.scrollTo) { try { window.scrollTo(0, 0); } catch (err) { /* 무시 */ } }
    prepareSheet();
  });

  // 필요할 때만 라이브러리를 불러옵니다.
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var tag = document.querySelector('script[src="' + src + '"]');
      if (tag) {
        if (tag.dataset.done === "1") resolve();
        else { tag.addEventListener("load", function () { resolve(); }); tag.addEventListener("error", function () { reject(new Error("load")); }); }
        return;
      }
      var el2 = document.createElement("script");
      el2.src = src;
      el2.addEventListener("load", function () { el2.dataset.done = "1"; resolve(); });
      el2.addEventListener("error", function () { el2.remove(); reject(new Error("load")); });
      document.head.appendChild(el2);
    });
  }

  function sheetFileName(ext) {
    var res = lastResult || evaluate();
    var name = res.hasName ? res.korName : "작명";
    return name + "_작명기록." + ext;
  }

  // 기록지를 그림으로 뜹니다. 화면 폭과 상관없이 같은 모양이 나오도록 폭을 고정합니다.
  var SHEET_W = 720;
  function captureSheet() {
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      fontsReady
    ]).then(function () {
      var sheet = $("printSheet");
      // 모바일 캔버스 한도(iOS 약 1,670만 화소)를 넘지 않게 배율을 줄입니다.
      var estH = Math.max(sheet.scrollHeight, 1200) * (SHEET_W / Math.max(sheet.scrollWidth, 1));
      var scale = 2;
      while (scale > 1 && SHEET_W * scale * estH * scale > 12e6) scale -= 0.25;
      return window.html2canvas(sheet, {
        backgroundColor: "#FFFFFF",
        scale: scale,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: SHEET_W + 60,
        onclone: function (doc) {
          var s = doc.getElementById("printSheet");
          s.style.width = SHEET_W + "px";
          s.style.maxWidth = "none";
          s.style.margin = "0";
          s.style.paddingBottom = "28px";
        }
      });
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) canvas.toBlob(resolve, type || "image/png", quality);
      else resolve(null);
    });
  }

  function buildPdf(canvas) {
    return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(function () {
      var JsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      var pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      var pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      var margin = 10;
      var w = pw - margin * 2;
      var h = canvas.height * w / canvas.width;
      var img = canvas.toDataURL("image/jpeg", 0.92);
      if (h <= ph - margin * 2) {
        pdf.addImage(img, "JPEG", margin, margin, w, h);
      } else {                                   // 길면 여러 쪽으로 나눕니다
        var left = h, y = margin;
        while (left > 0) {
          pdf.addImage(img, "JPEG", margin, y, w, h);
          left -= (ph - margin * 2);
          if (left > 0) { pdf.addPage(); y -= (ph - margin * 2); }
        }
      }
      return pdf.output("blob");
    });
  }

  // 기록지를 열자마자 그림과 PDF를 미리 만들어 둡니다.
  // 모바일의 공유 기능은 버튼을 누른 직후에만 허용되므로, 누른 뒤에 만들기 시작하면 막힙니다.
  function prepareSheet() {
    if (sheetJob) return sheetJob;
    setSheetBusy(true);
    setBarMsg("기록을 그리는 중입니다…");
    var job = sheetJob = captureSheet().then(function (canvas) {
      return canvasToBlob(canvas, "image/png").then(function (png) {
        if (!png) throw new Error("blob");
        var ready = { png: png, pdf: null, dataUrl: canvas.toDataURL("image/png") };
        return buildPdf(canvas).then(function (pdf) { ready.pdf = pdf; return ready; }, function () { return ready; });
      });
    }).then(function (ready) {
      if (sheetJob !== job) return ready;     // 그 사이 닫았거나 다시 열었음
      sheetReady = ready;
      setSheetBusy(false);
      setBarMsg(IN_APP
        ? "준비됐어요. 앱 안의 브라우저라 저장이 막히면 아래 안내대로 기본 브라우저에서 열어 주세요."
        : SHEET_IDLE_MSG);
      return ready;
    }, function (err) {
      if (sheetJob !== job) throw err;
      sheetJob = null;
      setSheetBusy(false);
      setBarMsg("기록을 그리지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.");
      throw err;
    });
    job.catch(function () { /* 메시지는 위에서 띄웠습니다 */ });
    return job;
  }

  // 준비가 안 됐으면 기다리라고 알리고 false를 돌려줍니다.
  function needReady() {
    if (sheetReady) return true;
    prepareSheet();
    setBarMsg("아직 기록을 그리는 중입니다. 잠시 후 다시 눌러 주세요.");
    return false;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 60000);
  }

  function makeFile(blob, name, type) {
    try { return new File([blob], name, { type: type }); } catch (err) { return null; }
  }
  function canShareFile(file) {
    try { return !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); }
    catch (err) { return false; }
  }
  function shareFile(file, doneMsg) {
    return navigator.share({ files: [file], title: file.name }).then(function () {
      setBarMsg(doneMsg);
    }, function (err) {
      if (err && err.name === "AbortError") { setBarMsg(SHEET_IDLE_MSG); return; }
      throw err;
    });
  }

  // 앱 안의 브라우저에서 기본 브라우저로 여는 주소
  // 입력한 값을 주소 뒤(#)에 담습니다. 다른 브라우저로 넘어가도 이어서 볼 수 있게 합니다.
  var FORM_IDS = ["birthDate", "birthTime", "surKor", "n1Kor", "n2Kor", "fam1", "fam2", "fam3",
    "soundSchool", "suriScope", "timeBase", "region", "customLon", "popYear"];
  function stateUrl(openSheet) {
    var s = { v: {}, h: {}, g: state.gender, l: state.len, w: [], o: {} };
    FORM_IDS.forEach(function (id) { s.v[id] = $(id).value; });
    ["surHan", "n1Han", "n2Han"].forEach(function (id) { s.h[id] = $(id).value; });
    Array.prototype.forEach.call(document.querySelectorAll("#wishGrid input:checked"), function (b) { s.w.push(b.value); });
    Array.prototype.forEach.call(document.querySelectorAll("#searchOpts input"), function (b) { s.o[b.id] = b.checked; });
    if (openSheet) s.sheet = 1;
    return location.href.split("#")[0] + "#s=" + encodeURIComponent(JSON.stringify(s));
  }

  // 주소에 담긴 값을 화면에 되돌립니다. 사람이 직접 입력한 것처럼 이벤트를 흘려 기존 흐름을 그대로 탑니다.
  function restoreFromUrl() {
    var m = /#s=(.+)$/.exec(location.hash);
    if (!m) return;
    var s;
    try { s = JSON.parse(decodeURIComponent(m[1])); } catch (err) { return; }
    function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }
    var segG = document.querySelector('#genderSeg button[data-v="' + s.g + '"]');
    if (segG) segG.click();
    var segL = document.querySelector('#lenSeg button[data-v="' + s.l + '"]');
    if (segL) segL.click();
    FORM_IDS.forEach(function (id) {
      if (!s.v || s.v[id] === undefined) return;
      $(id).value = s.v[id];
      fire($(id), "input"); fire($(id), "change");
    });
    Object.keys(s.h || {}).forEach(function (id) {
      if (!s.h[id]) return;
      var sel = $(id);
      if (!Array.prototype.some.call(sel.options, function (o) { return o.value === s.h[id]; })) return;
      sel.value = s.h[id];
      fire(sel, "change");
    });
    Array.prototype.forEach.call(document.querySelectorAll("#wishGrid input"), function (b) {
      var on = (s.w || []).indexOf(b.value) >= 0;
      if (b.checked !== on) { b.checked = on; fire(b, "change"); }
    });
    Object.keys(s.o || {}).forEach(function (id) {
      var b = $(id);
      if (b && b.checked !== s.o[id]) { b.checked = s.o[id]; fire(b, "change"); }
    });
    try { history.replaceState(null, "", location.href.split("#")[0]); } catch (err) { /* 무시 */ }
    if (s.sheet) $("pdfBtn").click();
  }

  function externalOpenUrl() {
    var here = stateUrl(true);
    if (/KAKAOTALK/i.test(UA)) return "kakaotalk://web/openExternal?url=" + encodeURIComponent(here);
    if (IS_ANDROID) {
      return "intent://" + here.replace(/^https?:\/\//, "") + "#Intent;scheme=" + location.protocol.replace(":", "")
        + ";package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(here) + ";end";
    }
    return "";
  }

  // 그림을 화면에 크게 띄워 길게 눌러 저장하게 합니다. 다운로드가 막힌 곳의 마지막 방법입니다.
  function showPreview(dataUrl, note) {
    closePreview();
    var box = document.createElement("div");
    box.id = "sheetPreview";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "작명 기록 이미지");
    var ext = IN_APP ? externalOpenUrl() : "";
    box.innerHTML = '<div class="pv-head"><p>' + note + "</p>"
      + (ext ? '<a class="btn" href="' + ext + '">기본 브라우저에서 열기</a>' : "")
      + '<button class="btn" type="button" id="pvClose">닫기</button></div>'
      + '<img alt="작명 기록" src="' + dataUrl + '">';
    document.body.appendChild(box);
    $("pvClose").addEventListener("click", closePreview);
  }
  function closePreview() {
    var box = document.getElementById("sheetPreview");
    if (box) box.remove();
  }

  // 카카오톡 같은 앱 안에서는 저장이 막혀 있어, 입력값을 들고 기본 브라우저로 넘어갑니다.
  // 넘어가지 못하면(1.5초 뒤에도 화면이 그대로면) 길게 눌러 저장하는 화면을 띄웁니다.
  function leaveInApp() {
    var url = externalOpenUrl();
    if (!url) return false;
    var left = false;
    function onHide() { if (document.hidden) left = true; }
    document.addEventListener("visibilitychange", onHide);
    setBarMsg("기본 브라우저로 여는 중입니다. 열리면 거기서 저장해 주세요.");
    location.href = url;
    setTimeout(function () {
      document.removeEventListener("visibilitychange", onHide);
      if (left) return;
      if (sheetReady) showPreview(sheetReady.dataUrl, "기본 브라우저로 넘어가지 못했습니다. 이미지를 길게 눌러 저장하거나, 오른쪽 위 메뉴(⋮ 또는 공유)에서 '다른 브라우저로 열기'를 눌러 주세요.");
      else setBarMsg("오른쪽 위 메뉴(⋮ 또는 공유)에서 '다른 브라우저로 열기'를 눌러 주세요.");
    }, 1500);
    return true;
  }

  $("sheetImage").addEventListener("click", function () {
    if (IN_APP && leaveInApp()) return;
    if (!needReady()) return;
    var name = sheetFileName("png");
    var file = makeFile(sheetReady.png, name, "image/png");
    // 아이폰: 공유 시트의 '이미지 저장'이 사진첩으로 바로 들어갑니다.
    if (IS_IOS && !IN_APP && canShareFile(file)) {
      shareFile(file, "저장했습니다. 사진첩을 확인하세요.").catch(function () {
        showPreview(sheetReady.dataUrl, "이미지를 길게 눌러 '사진에 저장'을 고르세요.");
      });
      return;
    }
    if (IN_APP || (IS_IOS && !canShareFile(file))) {
      showPreview(sheetReady.dataUrl, "이미지를 길게 눌러 저장하세요.");
      setBarMsg("이미지를 길게 눌러 저장하세요.");
      return;
    }
    downloadBlob(sheetReady.png, name);
    setBarMsg(IS_MOBILE ? "이미지를 저장했습니다. 갤러리나 다운로드 폴더를 확인하세요." : "이미지를 저장했습니다. 다운로드 폴더를 확인하세요.");
  });

  $("sheetPdf").addEventListener("click", function () {
    if (IN_APP && leaveInApp()) return;
    if (!needReady()) return;
    if (!sheetReady.pdf) {
      setBarMsg("PDF를 만들지 못했습니다. 이미지 저장을 이용해 주세요.");
      return;
    }
    var name = sheetFileName("pdf");
    var file = makeFile(sheetReady.pdf, name, "application/pdf");
    // 모바일: 공유 시트에서 '파일에 저장'이나 카카오톡 전송을 고를 수 있습니다.
    if (IS_MOBILE && canShareFile(file)) {
      shareFile(file, "PDF를 보냈습니다.").catch(function () {
        if (IN_APP) { showPreview(sheetReady.dataUrl, "이 앱 안에서는 PDF를 저장할 수 없습니다. 기본 브라우저에서 열거나, 이미지를 길게 눌러 저장하세요."); return; }
        downloadBlob(sheetReady.pdf, name);
        setBarMsg("PDF를 저장했습니다. 파일 앱이나 다운로드 폴더를 확인하세요.");
      });
      return;
    }
    if (IN_APP) {
      showPreview(sheetReady.dataUrl, "이 앱 안에서는 PDF를 저장할 수 없습니다. 기본 브라우저에서 열거나, 이미지를 길게 눌러 저장하세요.");
      setBarMsg("앱 안의 브라우저에서는 PDF 저장이 막혀 있습니다.");
      return;
    }
    downloadBlob(sheetReady.pdf, name);
    setBarMsg("PDF를 저장했습니다. 다운로드 폴더나 파일 앱에서 확인하세요.");
  });

  $("sheetShare").addEventListener("click", function () {
    var res = lastResult || evaluate();
    var title = (res.hasName ? res.korName : "작명 기록") + " · 사주 작명 노트";
    // 그림이 준비됐으면 그림을, 아니면 주소를 바로 공유합니다. 여기서 기다리면 공유가 막힙니다.
    var file = sheetReady ? makeFile(sheetReady.png, sheetFileName("png"), "image/png") : null;
    var job;
    if (canShareFile(file)) {
      // 제목·문구를 함께 넣으면 그림을 버리는 앱(카카오톡 등)이 있어 파일만 보냅니다.
      job = navigator.share({ files: [file] });
    } else {
      job = navigator.share({ title: title, text: title, url: location.href });
    }
    job.then(function () {
      setBarMsg("공유했습니다.");
    }).catch(function (err) {
      if (err && err.name === "AbortError") { setBarMsg(SHEET_IDLE_MSG); return; }
      setBarMsg("공유가 되지 않는 브라우저입니다. 이미지로 저장해서 보내 주세요.");
    });
  });

  $("sheetPrint").addEventListener("click", function () {
    try { window.print(); } catch (err) { setBarMsg("이 브라우저에는 인쇄가 없습니다. PDF 저장을 눌러 주세요."); }
  });
  $("sheetClose").addEventListener("click", closeSheet);
  window.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (document.getElementById("sheetPreview")) closePreview();
    else if (sheetOpen) closeSheet();
  });

  // 공유 기능이 있는 기기에서만 공유 버튼을 보입니다.
  if (navigator.share) $("sheetShare").hidden = false;
  // 휴대폰에는 인쇄가 거의 없어 버튼을 숨깁니다.
  if (IS_MOBILE) $("sheetPrint").hidden = true;

  $("copyBtn").addEventListener("click", function () {
    var res = evaluate(), p = res.saju.pillars;
    var lines = [
      res.korName + (res.hasHanja ? " (" + state.surHanja.char + state.chars.map(function (c) { return c.char; }).join("") + ")" : ""),
      "사주 " + p.year.kor + "년 " + p.month.kor + "월 " + p.day.kor + "일 " + p.hour.kor + "시 / 일간 " + p.day.stem + p.day.stemEl,
      "오행 " + ELEMENTS.map(function (e) { return e + " " + res.saju.counts[e]; }).join(", "),
      "보완 오행 " + res.need.join(" → "),
      "발음오행 " + res.sound.parts.map(function (x) { return x.ch + "(" + x.el + ")"; }).join(" ") + " · " + (res.sound.ok ? "상생" : "상극 포함"),
      "발음음양 " + res.vowel.parts.map(function (x) { return x.ch + "(" + x.yin + ")"; }).join(" ") + " · " + (res.vowel.ok ? "조화" : "편중")
    ];
    if (res.hasHanja) {
      lines.push("사격 " + [res.suri.won, res.suri.hyeong, res.suri.i, res.suri.jeong].join("/") + " · " + res.suriVerdicts.join(""));
      lines.push("수리오행 " + res.suriEl.els.join("-") + " · " + (res.suriEl.ok ? "상생" : "상극 포함"));
      lines.push("수리음양 " + res.strokeYin.map(function (x) { return x.char + x.strokes + "획(" + x.yin + ")"; }).join(" "));
      lines.push("자원오행 " + res.resource.els.join("·"));
    }
    var hist = POP_INDEX[state.gender + "|" + state.nameKor];
    lines.push("인기 순위 " + (hist && hist[state.popYear] ? state.popYear + "년 " + hist[state.popYear].rank + "위" : "TOP 100 밖"));
    if (res.wish.selected.length) {
      lines.push("부모의 마음 " + res.wish.rows.map(function (r) {
        return r.wish.label + (r.ok ? "(담김: " + r.chars.map(function (c) { return c.char; }).join("") + ")" : "(미반영)");
      }).join(", "));
    }
    lines.push("가족 글자 " + (res.family.ok ? "겹침 없음" : res.family.clash.map(function (c) { return c.ch + "(" + c.who + ")"; }).join(", ")));
    lines.push("종합 " + res.score + "점 · 인명용 한자 여부는 대법원 조회로 확인하세요.");
    var text = lines.join("\n"), done = function () { toast("결과를 복사했습니다"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else done();
  });

  /* ---------------------------------------------------------------- 시작 */
  // 기본은 야간입니다. 고른 적이 있으면 그 선택을 따릅니다.
  var startTheme = "dark";
  try {
    var saved = localStorage.getItem("naming-theme");
    if (saved === "light" || saved === "dark") startTheme = saved;
  } catch (err) { /* 저장 불가 환경 */ }
  document.documentElement.setAttribute("data-theme", startTheme);
  $("themeBtn").textContent = startTheme === "dark" ? "주간" : "야간";

  $("wishGrid").innerHTML = WISHES.map(function (w) {
    return '<label class="wish-chip"><input type="checkbox" value="' + w.key + '"> ' + w.label + "</label>";
  }).join("");
  Array.prototype.forEach.call(document.querySelectorAll("#wishGrid input"), function (b) {
    b.addEventListener("change", update);
  });
  $("expWish").innerHTML = '<option value="">전체</option>' + WISHES.map(function (w) {
    return '<option value="' + w.key + '">' + w.label + "</option>";
  }).join("");

  $("region").innerHTML = REGIONS.map(function (r) {
    return '<option value="' + r[0] + '">' + r[0] + " (동경 " + r[1].toFixed(1) + "도 · " + Math.round((r[1] - 135) * 4) + "분)</option>";
  }).join("") + '<option value="custom">직접 입력</option>';
  $("region").value = "서울";

  $("popYear").innerHTML = POP_YEARS.map(function (y) {
    return '<option value="' + y + '">' + y + "년</option>";
  }).join("");
  $("popYear").value = POP_YEARS[0];
  $("popSub").textContent = POP_YEARS[POP_YEARS.length - 1] + " ~ " + POP_YEARS[0] + "년 · 해마다 TOP 100";

  fillSelect($("surHan"), "", null);
  fillSelect($("n1Han"), "", null);
  fillSelect($("n2Han"), "", null);
  renderExplorer();
  update();
  restoreFromUrl();
})();
