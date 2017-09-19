/*******************************************************************************
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2016 Alexis Jaksone

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    Home: http://add0n.com/forecast-plus.html
    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/
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
