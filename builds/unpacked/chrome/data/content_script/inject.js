'use strict';

try {
  var css = '#WX_WindowShade,.pws-network,.show-for-small-only,[class="header-ad-wrap"],[class="ad-nav"],div[id="ads"],div[id="share"],div[id="adunit"],div[id*="_ads_"],div[id="blog-mod"],div[id="video-mod"],div[id="photo-mod"],div[id="ww-events"],div[id="news-blogs"],div[id="photo-reel"],div[id="google_image_div"],div[id*="google_ads_iframe"],iframe[src="tpc.googlesyndication"],iframe[id*="google_ads_iframe"],div[id="WX_WindowShade"],div[class="ad-boxes"],footer[class="primary"],iframe[id*="-ads-"],div[id*="-ads-"],div[id*="-ad-"] {  display: none !important;  visibility: hidden !important;}',
      head = document.head || document.getElementsByTagName('head')[0],
      style = document.createElement('style');
  style.type = 'text/css';
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  }
  else {
    style.appendChild(document.createTextNode(css));
  }
  head.appendChild(style);
}
catch (e) {}

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
