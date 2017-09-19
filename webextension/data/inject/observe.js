/*******************************************************************************
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2017 Alexis Jaksone

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

chrome.storage.local.get({
  url: 'https://www.wunderground.com/'
}, prefs => {
  const url = document.location.href;
  if (prefs.url !== url) {
    chrome.runtime.sendMessage({
      method: 'top-level',
      url: document.location.href
    });
  }
  else {
    chrome.runtime.sendMessage({
      method: 'schedule'
    });
  }
});

window.addEventListener('load', () => {
  const a = document.querySelector('a[_ngcontent-c2].button');
  if (a && a.href) {
    chrome.runtime.sendMessage({
      method: 'top-level',
      url: a.href
    });
  }
});
