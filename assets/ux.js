/* 예나준 공통 화면 효과 — 모든 페이지 (scripts/seo/build_seo.py가 넣음)
 *  1) 화면 맨 위 스크롤 진행 바
 *  2) 스크롤하면 고정 헤더에 그림자 + 살짝 얇아짐 (홈·가이드의 .site-header)
 *  3) 카드·소제목이 화면에 들어올 때 살짝 떠오르는 등장 효과
 * 자바스크립트가 꺼져 있거나 "움직임 줄이기" 설정이면 효과 없이 내용이 그대로 보여요.
 */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var css = document.createElement('style');
  css.textContent =
    '.yn-progress{position:fixed;left:0;top:0;height:3px;width:100%;transform-origin:0 50%;transform:scaleX(0);z-index:1000;pointer-events:none;' +
    'background:linear-gradient(90deg,#E07A5F,#A54E38)}' +
    '.site-header{transition:box-shadow .25s ease}' +
    '.site-header.yn-scrolled{box-shadow:0 8px 24px -18px rgba(31,42,68,.45)}' +
    '.site-header .wrap{transition:height .25s ease}' +
    '@media (min-width:900px){.site-header.yn-scrolled .wrap{height:64px}}' +
    '.yn-rv{opacity:0;transform:translateY(18px);transition:opacity .6s ease,transform .6s cubic-bezier(.2,.7,.2,1)}' +
    '.yn-rv.yn-in{opacity:1;transform:none}';
  document.head.appendChild(css);

  // 1) 진행 바
  var bar = document.createElement('div');
  bar.className = 'yn-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var header = document.querySelector('.site-header');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(scrollY / h, 1) : 0) + ')';
      if (header) header.classList.toggle('yn-scrolled', scrollY > 8);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // 3) 등장 효과
  if (reduce || !('IntersectionObserver' in window)) return;
  var SEL = '.tool-card, .tool-soon, .cat-head, .cat-reads, .promise li, .rb, .story, ' +
    '.guide-doc h2, .guide-doc .tbl, .guide-doc .point, .guide-doc .layers, .guide-doc .faq, ' +
    '.card, .guide, .yn-rel .yn-card, .yn-rel .yn-guide';
  var els = [].slice.call(document.querySelectorAll(SEL)).filter(function (el) {
    var r = el.getBoundingClientRect();
    return r.top > innerHeight * 0.9; // 처음부터 보이는 것은 그대로 둠
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (x) {
      if (!x.isIntersecting) return;
      var el = x.target, sib = el.parentElement ? [].indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sib % 3, 2) * 70 + 'ms'; // 같은 줄 카드는 살짝 차례로
      el.classList.add('yn-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach(function (el) {
    el.classList.add('yn-rv');
    io.observe(el);
    // 등장이 끝나면 원래 스타일(카드 hover 효과 등)로 돌려놓기
    el.addEventListener('transitionend', function done(e) {
      if (e.target !== el || !el.classList.contains('yn-in')) return;
      el.classList.remove('yn-rv', 'yn-in');
      el.style.transitionDelay = '';
      el.removeEventListener('transitionend', done);
    });
  });
})();

/* 운영 지표 배지: data-since="2026-09-25" → 운영 일수, data-updated="ISO 날짜" → "오늘/어제/N일 전" */
(function () {
  function days(iso) {
    var d = new Date(iso), t = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((b - a) / 864e5);
  }
  [].forEach.call(document.querySelectorAll('[data-since]'), function (el) { el.textContent = days(el.getAttribute('data-since')) + 1; });
  [].forEach.call(document.querySelectorAll('[data-updated]'), function (el) {
    var n = days(el.getAttribute('data-updated'));
    el.textContent = n <= 0 ? '오늘' : n === 1 ? '어제' : n + '일 전';
  });
})();
