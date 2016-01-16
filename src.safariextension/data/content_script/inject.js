'use strict';

var clean = (function () {
  const rules = [
    '[class="header-ad-wrap"]',
    '[class="ad-nav"]',
    'div[id="ads"]',
    'div[id="adunit"]',
    'div[id*="_ads_"]',
    'a[id="wuAccount"]',
    'a[id="sidebarButton"]',
    '[class="show-for-small-only"]',
    '[class="pws-network"]',
    'div[id="google_image_div"]',
    'div[id*="google_ads_iframe"]',
    'div[id="ww-events"]',
    'div[id="news-blogs"]',
    'div[id="photo-reel"]',
    'div[id="blog-mod"]',
    'div[id="video-mod"]',
    'div[id="photo-mod"]',
    'div[id="fctLinkSource"]',
    'script[src*="pagead2.googlesyndication"]',
    'script[src*="amazon-adsystem"]',
    'iframe[src="tpc.googlesyndication"]',
    'iframe[id*="google_ads_iframe"]',
    'div[id="WX_WindowShade"]',
    'div[class="ad-boxes"]',
    'footer[class="primary"]',
    'iframe[id*="-ads-"]',
    'div[id*="-ads-"]',
    'div[id*="-ad-"]'
  ];
  return function () {
    rules.forEach(function (rule) {
      var elms = document.querySelectorAll(rule);
      if (elms && elms.length) {
        for (var i = 0; i < elms.length; i++) {
          if (elms[i]) {
            elms[i].style.display = 'none';
            if (elms[i] && elms[i].parentNode) {
              try {
                elms[i].parentNode.removeChild(elms[i]);
              }
              catch (e) {}
            }
          }
        }
      }
    });
  };
})();

window.addEventListener('DOMContentLoaded', clean, false);
window.addEventListener('load', clean, false);
