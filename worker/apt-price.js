// 아파트 실거래가 조회 — GPL 계산기(/gpl/)가 부른다.
//   GET /api/apt-price?region=서울 강북구 미아동&apt=래미안&area=84
// 공공데이터포털 인증키는 Cloudflare Workers 환경변수(Settings → Variables and Secrets) MOLIT_KEY 에 넣는다(Decoding 키).
// 같은 키로 두 API를 활용신청해야 한다: 국토교통부_아파트 매매 실거래가 자료, 행정안전부_법정동코드.
// 1) 법정동코드 API로 지역 이름 → 시군구 5자리 코드  2) 실거래가 API를 최근 6개월치 불러 단지 이름으로 거른다.

const TRADE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
const REGION = 'https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList';
const MONTHS = 6;
const SIDO = {
  '서울': '서울특별시', '부산': '부산광역시', '대구': '대구광역시', '인천': '인천광역시', '광주': '광주광역시',
  '대전': '대전광역시', '울산': '울산광역시', '세종': '세종특별자치시', '경기': '경기도', '강원': '강원특별자치도',
  '충북': '충청북도', '충남': '충청남도', '전북': '전북특별자치도', '전남': '전라남도', '경북': '경상북도',
  '경남': '경상남도', '제주': '제주특별자치도'
};

const json = (body, status = 200, maxAge = 0) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store'
  }
});

const keyParam = (k) => (k.includes('%') ? k : encodeURIComponent(k));   // Encoding 키를 넣어도 동작
const squash = (s) => String(s || '').replace(/\s+/g, '').replace(/[()·,.\-]/g, '').toLowerCase();
const tag = (xml, names) => {
  for (const n of names) {
    const m = xml.match(new RegExp(`<${n}>\\s*([^<]*?)\\s*</${n}>`));
    if (m) return m[1];
  }
  return '';
};

// 공공데이터포털은 키가 틀리거나 한도를 넘으면 200으로 오류 XML을 준다
function apiError(text) {
  const code = tag(text, ['returnReasonCode', 'resultCode']);
  const msg = tag(text, ['returnAuthMsg', 'resultMsg', 'errMsg']);
  if (code && !/^0+$/.test(code) && code !== 'INFO-0') return `${code} ${msg}`.trim();
  if (/SERVICE_KEY|SERVICE ERROR|LIMITED_NUMBER/i.test(text) && !/<item>/.test(text)) return msg || 'API 오류';
  return '';
}

async function cachedText(url, cacheKey, ctx, ttl) {
  const cache = caches.default;
  const key = new Request(cacheKey);
  const hit = await cache.match(key);
  if (hit) return hit.text();
  const r = await fetch(url, { headers: { accept: 'application/xml, application/json' } });
  const text = await r.text();
  if (r.ok && !apiError(text)) {
    ctx.waitUntil(cache.put(key, new Response(text, { headers: { 'cache-control': `public, max-age=${ttl}` } })));
  }
  return text;
}

// 지역 이름 → 시군구 코드. "서울 강북구 미아동", "수원시 영통구", "강북구" 모두 받는다.
async function findLawd(region, env, ctx, origin) {
  const raw = region.split(/\s+/).filter(Boolean);
  const words = raw.map((w) => SIDO[w] || w);
  const pick = words.find((w) => /(구|군)$/.test(w)) || words.find((w) => /시$/.test(w) && !/특별시|광역시|자치시/.test(w)) || words[words.length - 1];
  const url = `${REGION}?serviceKey=${keyParam(env.MOLIT_KEY)}&type=json&pageNo=1&numOfRows=100&locatadd_nm=${encodeURIComponent(pick)}`;
  const text = await cachedText(url, `${origin}/__cache/region/${encodeURIComponent(pick)}`, ctx, 86400 * 7);
  const err = apiError(text);
  if (err) throw new Error('region:' + err);
  let rows = [];
  try {
    const j = JSON.parse(text);
    const arr = j.StanReginCd || [];
    for (const part of arr) if (part.row) rows = rows.concat(part.row);
  } catch (e) {
    rows = [...text.matchAll(/<row>([\s\S]*?)<\/row>/g)].map((m) => ({
      region_cd: tag(m[1], ['region_cd']), locatadd_nm: tag(m[1], ['locatadd_nm'])
    }));
  }
  // 사용자가 쓴 말(광주) 또는 정식 이름(광주광역시) 중 하나라도 들어 있으면 맞는 것으로 본다 — 행정구역 개편으로 이름이 바뀌어도 찾도록
  const hit = (r, t) => squash(r.locatadd_nm).includes(squash(t)) || (SIDO[t] && squash(r.locatadd_nm).includes(squash(SIDO[t])));
  const ok = rows.filter((r) => r.region_cd && raw.every((t) => hit(r, t)));
  let list = ok;
  if (!list.length) {
    list = rows.filter((r) => r.region_cd && squash(r.locatadd_nm).includes(squash(pick)));
    const sgg = [...new Set(list.map((r) => String(r.region_cd).slice(0, 5)))];
    if (sgg.length > 1) {
      const names = [...new Set(list.filter((r) => String(r.region_cd).endsWith('00000')).map((r) => String(r.locatadd_nm).trim()))].slice(0, 8);
      return { ambiguous: names.length ? names : [...new Set(list.map((r) => String(r.locatadd_nm).trim()))].slice(0, 8) };
    }
  }
  if (!list.length) return null;
  // 시군구 단위 행(뒤 5자리가 00000)을 먼저, 없으면 첫 행의 앞 5자리
  list.sort((a, b) => (String(a.region_cd).endsWith('00000') ? 0 : 1) - (String(b.region_cd).endsWith('00000') ? 0 : 1));
  const top = list[0];
  return { lawd: String(top.region_cd).slice(0, 5), name: String(top.locatadd_nm || '').trim() };
}

function parseTrades(text) {
  return [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const x = m[1];
    const y = tag(x, ['dealYear', '년']), mo = tag(x, ['dealMonth', '월']), d = tag(x, ['dealDay', '일']);
    return {
      apt: tag(x, ['aptNm', '아파트']),
      umd: tag(x, ['umdNm', '법정동']),
      jibun: tag(x, ['jibun', '지번']),
      area: parseFloat(tag(x, ['excluUseAr', '전용면적'])) || 0,
      price: parseInt(tag(x, ['dealAmount', '거래금액']).replace(/[^0-9]/g, ''), 10) || 0,   // 만원
      floor: tag(x, ['floor', '층']),
      built: tag(x, ['buildYear', '건축년도']),
      date: y ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '',
      cancelled: /^O$/i.test(tag(x, ['cdealType', '해제여부']))
    };
  }).filter((t) => t.price && !t.cancelled);
}

export async function onRequestGet(ctx) {
  const { request, env } = ctx;
  const u = new URL(request.url);
  const region = (u.searchParams.get('region') || '').trim().slice(0, 60);
  const apt = (u.searchParams.get('apt') || '').trim().slice(0, 40);
  const area = parseFloat(u.searchParams.get('area') || '') || 0;
  if (!env.MOLIT_KEY) return json({ error: 'not_configured', message: '실거래가 자동 조회가 아직 설정되지 않았어요.' }, 503);
  if (!region || !apt) return json({ error: 'bad_request', message: '지역과 아파트 이름을 모두 넣어 주세요.' }, 400);

  try {
    const found = await findLawd(region, env, ctx, u.origin);
    if (found && found.ambiguous) return json({ error: 'ambiguous', message: `'${region}'에 해당하는 곳이 여러 군데예요. 시도까지 넣어 주세요: ${found.ambiguous.join(', ')}` }, 404);
    if (!found) return json({ error: 'no_region', message: `'${region}' 지역을 찾지 못했어요. 시군구 이름(예: 강북구, 수원시 영통구)으로 다시 넣어 주세요.` }, 404);

    const now = new Date(Date.now() + 9 * 3600 * 1000);   // 한국 시간
    const yms = [];
    for (let i = 0; i < MONTHS; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      yms.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    const texts = await Promise.all(yms.map((ym, i) => cachedText(
      `${TRADE}?serviceKey=${keyParam(env.MOLIT_KEY)}&LAWD_CD=${found.lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`,
      `${u.origin}/__cache/trade/${found.lawd}/${ym}`, ctx, i < 2 ? 21600 : 86400 * 3)));
    const err = texts.map(apiError).find(Boolean);
    if (err && texts.every((t) => !/<item>/.test(t))) throw new Error('trade:' + err);

    const all = texts.flatMap(parseTrades);
    const words = region.split(/\s+/);
    const dong = words.find((w) => /(동|읍|면|가|리)$/.test(w) && !/(구|군|시)$/.test(w));
    const q = squash(apt);
    let hits = all.filter((t) => squash(t.apt).includes(q) && (!dong || squash(t.umd).includes(squash(dong))));
    if (!hits.length && dong) hits = all.filter((t) => squash(t.apt).includes(q));
    const names = [...new Set(hits.map((t) => `${t.apt} (${t.umd})`))].slice(0, 12);
    let sel = hits;
    if (area) sel = hits.filter((t) => Math.abs(t.area - area) <= 3);
    sel.sort((a, b) => (a.date < b.date ? 1 : -1));

    // 제안: 단지 이름이 안 맞으면 같은 동네 단지 이름 몇 개
    let suggest = [];
    if (!hits.length) {
      const pool = dong ? all.filter((t) => squash(t.umd).includes(squash(dong))) : all;
      suggest = [...new Set(pool.map((t) => t.apt))].slice(0, 15);
    }
    return json({
      region: found.name, lawd: found.lawd, months: yms.length,
      count: sel.length, names, suggest,
      trades: sel.slice(0, 30).map(({ cancelled, ...t }) => t)
    }, 200, 3600);
  } catch (e) {
    const m = String(e.message || e);
    const keyBad = /SERVICE_KEY|30 |31 |SERVICE ACCESS DENIED|NOT_REGISTERED|20 /i.test(m);
    return json({
      error: keyBad ? 'key_error' : 'upstream',
      message: keyBad ? '실거래가 API 인증키 설정을 확인해 주세요.' : '공공데이터 서버가 응답하지 않아요. 잠시 뒤 다시 시도해 주세요.',
      detail: m.slice(0, 160)
    }, 502);
  }
}
