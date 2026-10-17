/* 예나준 GA4 맞춤 이벤트 — 모든 페이지 공통 (scripts/seo/build_seo.py가 GA4 코드와 함께 넣음)
 *
 * 보내는 이벤트 (모두 tool, page_type 파라미터가 붙음)
 *   tool_use          계산기 입력 칸을 처음 건드림 (페이지당 1번) — 자동 계산 도구의 "기능 사용" 기준
 *   calculate         계산·결과 보기 버튼 클릭 (label)
 *   result_view       결과 영역이 화면에 보임 (페이지당 1번, 입력한 뒤에만)
 *   copy_result       결과 복사 버튼 (label)
 *   share             공유 버튼 (method, label) — GA4 추천 이벤트 이름
 *   save_result       PDF·이미지 저장·인쇄 버튼 (label)
 *   file_upload       파일 올리기 (엑셀·사진)
 *   cross_promo_click 결과 아래 "다음 단계" 추천 카드 클릭 (link_url, link_text)
 *   related_click     하단 "이런 도구도 있어요" 클릭 (link_url, link_text)
 *   affiliate_click   광고 칸의 제휴 링크(애드픽 알리 등) 클릭 (partner, tool) — assets/coupang.js에서 보냄
 *   guide_click       가이드 글로 가는 링크 클릭 (link_url)
 *   home_tool_click   홈에서 계산기 카드 클릭 (link_url, link_text)
 *   donate_click      후원하기 클릭
 * 입력한 값(체중·금액·이름 등)은 절대 보내지 않는다. 버튼 글자와 링크 주소만 보낸다.
 */
(function () {
  if (typeof window.gtag !== 'function') return;
  var path = location.pathname;
  var tool = path.split('/').filter(Boolean)[0] || 'home';
  var pageType = path === '/' ? 'home' : /\/guide\/?$/.test(path) ? 'guide' : /^\/(about|privacy|terms)/.test(path) ? 'info' : 'tool';

  function send(name, p) {
    p = p || {};
    p.tool = tool;
    p.page_type = pageType;
    try { window.gtag('event', name, p); } catch (e) {}
  }
  function label(el) {
    return (el.innerText || el.getAttribute('aria-label') || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  }
  // 사이트 공통 머리말·메뉴·하단·추천 블록 안은 도구 사용이 아니라서 뺀다 (도구 자체 <header> 안 버튼은 셈)
  function outside(el) { return !!el.closest('.yn-rel, .yn-cp, .site-header, .mobile-nav, .site-footer, .footer-nav'); }

  // 1) 입력 칸을 처음 건드리면 tool_use (값은 보내지 않음)
  var used = false;
  function onField(e) {
    var t = e.target;
    if (used || !t || !t.closest || outside(t)) return;
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.type === 'file') return;
    used = true;
    send('tool_use');
    watchResult();
  }
  document.addEventListener('input', onField, true);
  document.addEventListener('change', onField, true);

  // 2) 결과 영역이 보이면 result_view (입력한 뒤 한 번)
  var seen = false;
  function watchResult() {
    if (seen || !('IntersectionObserver' in window)) return;
    var el = document.querySelector('#result, #results, .results, #verdict, #o4, #result-area, #summary');
    if (!el) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting && !seen) { seen = true; send('result_view'); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }

  // 3) 버튼·링크 클릭
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (!b) return;
    var txt = label(b);
    if (b.tagName === 'A') {
      var href = b.getAttribute('href') || '';
      if (b.closest('.yn-xpromo')) send('cross_promo_click', { link_url: href, link_text: txt });
      else if (b.classList.contains('tool-card')) send('home_tool_click', { link_url: href, link_text: txt });
      else if (b.classList.contains('yn-coffee')) send('donate_click', { link_url: href });
      else if (b.closest('.yn-rel')) send('related_click', { link_url: href, link_text: txt });
      else if (/\/guide\/?(#.*)?$/.test(href)) send('guide_click', { link_url: href });
      return;
    }
    if (outside(b)) return;
    if (/복사/.test(txt)) send('copy_result', { label: txt });
    else if (/공유/.test(txt)) send('share', { method: 'button', label: txt });
    else if (/저장|PDF|인쇄/.test(txt)) send('save_result', { label: txt });
    else if (b.type === 'submit' || /계산|결과 보기|분석|검사하기|확인하기/.test(txt)) {
      send('calculate', { label: txt });
      watchResult();
    }
  }, true);

  // 4) 파일 올리기 (P2P 엑셀, 초음파 사진)
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.type === 'file' && t.files && t.files.length) { send('file_upload'); watchResult(); }
  }, true);
})();
