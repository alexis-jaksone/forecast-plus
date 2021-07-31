/*
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

    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/

'use strict';

document.addEventListener('DOMContentLoaded', () => chrome.storage.local.get({
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
}));

// try to detect weather URL in homepage
const port = chrome.runtime.connect();
port.onMessage.addListener(request => {
  if (request.method === 'detect-station' && location.pathname === '/') {
    const a = document.querySelector('.fct-button');
    if (a && a.href !== 'https://www.wunderground.com/null') {
      chrome.runtime.sendMessage({
        method: 'top-level',
        url: a.href
      });
    }
  }
});
