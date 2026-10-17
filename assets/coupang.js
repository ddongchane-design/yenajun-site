/* 예나준 — 쿠팡 파트너스 배너 공통 블록
   페이지에 <div class="yn-cp" data-yn-cp></div> 를 두면 그 자리에 그려요.
   배너를 바꿀 땐 BANNER 주소만 바꾸면 돼요 (쿠팡 파트너스에서 받은 iframe의 src, width·height는 빼고).
   상품 칸은 배너 높이만큼 커져서, 칸 폭에 맞춰 가로를 꽉 채우고 높이는 heightFor()로 정해요. */
(function () {
  var BANNER = 'https://ads-partners.coupang.com/widgets.html?id=1040301&template=carousel&trackingCode=AF8079847&subId={SUB}&tsource=';
  var NOTE = '이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
  // 애드픽 알리익스프레스 링크 — ALI_PAGES에 있는 도구에서만 배너 아래 한 줄로 보여요 (육아 도구엔 넣지 않음)
  var ALI_URL = 'https://bitl.bz/mh0y8p';
  var ALI_PAGES = ['robotaxi'];
  var NOTE_ALI = '이 페이지는 쿠팡 파트너스 및 애드픽 제휴 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';
  var MIN_W = 280, MAX_W = 726;
  // 휴대폰 폭(420 미만)은 쿠팡이 상품 2개를 위에, 로고를 아래에 두는 모양이라 높이 180.
  // 그보다 넓으면 상품이 높이만큼 정사각형으로 가로로 늘어서고 오른쪽에 로고 칸(약 120px)이 붙음
  // → 좁은 PC 칸(600 미만)은 2개, 넓은 칸은 3개가 들어가는 높이로 (최대 190)
  function heightFor(w) {
    if (w < 420) return 180;
    var n = w < 600 ? 2 : 3;
    return Math.min(190, Math.floor((w - 130) / n));
  }

  // 쿠팡 리포트에서 어느 도구에서 나온 수익인지 보이도록 subId에 도구 이름(영문·숫자만)을 넣음
  var SUB = (location.pathname.split('/').filter(Boolean)[0] || 'home').replace(/[^a-z0-9]/gi, '');

  function frameWidth(box) {
    var slot = box.querySelector('.yn-cp-frame');
    var w = Math.floor((slot || box).clientWidth);
    return Math.max(MIN_W, Math.min(MAX_W, w));
  }

  function load(box) {
    var slot = box.querySelector('.yn-cp-frame');
    var w = frameWidth(box), h = heightFor(w);
    if (box._ynW && Math.abs(box._ynW - w) < 40) return; // 조금 바뀐 정도로는 다시 불러오지 않음
    box._ynW = w;
    var src = BANNER.replace('{SUB}', SUB) + '&width=' + w + '&height=' + h;
    slot.style.minHeight = h + 'px';
    slot.innerHTML = '<iframe src="' + src + '" width="' + w + '" height="' + h + '" frameborder="0" scrolling="no"' +
      ' referrerpolicy="unsafe-url" loading="lazy" title="쿠팡 상품 광고"></iframe>';
  }

  function render(box) {
    if (box.dataset.ynCpDone) return;
    box.dataset.ynCpDone = '1';
    if (document.querySelector('.yn-rel.yn-dark')) box.classList.add('yn-dark');
    box.setAttribute('aria-label', '광고');
    var ali = ALI_PAGES.indexOf(SUB) !== -1;
    box.innerHTML =
      '<div class="yn-cp-head"><span>함께 보면 좋은 상품</span><em>광고</em></div>' +
      '<div class="yn-cp-frame"></div>' +
      (ali ? '<a class="yn-cp-ali" href="' + ALI_URL + '" target="_blank" rel="sponsored nofollow noopener">' +
        '<span class="e" aria-hidden="true">🛒</span><span class="t"><b>알리익스프레스에서 찾아보기</b>' +
        '<small>해외 직구 쇼핑몰 · 처음이면 신규 회원 혜택이 있어요</small></span><span class="go">→</span></a>' : '') +
      '<p class="yn-cp-note">' + (ali ? NOTE_ALI : NOTE) + '</p>';
    var a = box.querySelector('.yn-cp-ali');
    if (a) a.addEventListener('click', function () {
      try { if (typeof window.gtag === 'function') window.gtag('event', 'affiliate_click', { partner: 'aliexpress', tool: SUB }); } catch (e) {}
    });
    load(box);
  }

  function init() {
    var boxes = document.querySelectorAll('[data-yn-cp]');
    for (var i = 0; i < boxes.length; i++) render(boxes[i]);
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { for (var i = 0; i < boxes.length; i++) load(boxes[i]); }, 400);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
