/* 예나준 — 쿠팡 파트너스 배너 공통 블록
   페이지에 <div class="yn-cp" data-yn-cp></div> 를 두면 그 자리에 그려요.
   배너를 바꿀 땐 BANNER 주소만 바꾸면 돼요 (쿠팡 파트너스에서 받은 iframe의 src). */
(function () {
  var BANNER = 'https://ads-partners.coupang.com/widgets.html?id=1040301&template=carousel&trackingCode=AF8079847&subId={SUB}&width=320&height=100&tsource=';
  var NOTE = '이 페이지는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

  // 쿠팡 리포트에서 어느 도구에서 나온 수익인지 보이도록 subId에 도구 이름(영문·숫자만)을 넣음
  var SUB = (location.pathname.split("/").filter(Boolean)[0] || "home").replace(/[^a-z0-9]/gi, "");

  function render(box) {
    if (box.dataset.ynCpDone) return;
    box.dataset.ynCpDone = '1';
    if (document.querySelector('.yn-rel.yn-dark')) box.classList.add('yn-dark');
    box.setAttribute('aria-label', '광고');
    box.innerHTML =
      '<div class="yn-cp-head"><span>함께 보면 좋은 상품</span><em>광고</em></div>' +
      '<div class="yn-cp-frame"><iframe src="' + BANNER.replace('{SUB}', SUB) + '" width="320" height="100" frameborder="0" scrolling="no"' +
      ' referrerpolicy="unsafe-url" loading="lazy" title="쿠팡 상품 광고"></iframe></div>' +
      '<p class="yn-cp-note">' + NOTE + '</p>';
  }

  function init() {
    var boxes = document.querySelectorAll('[data-yn-cp]');
    for (var i = 0; i < boxes.length; i++) render(boxes[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
