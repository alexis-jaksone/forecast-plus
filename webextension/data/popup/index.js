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

var iframe = document.querySelector('iframe');

iframe.addEventListener('load', () => {
  console.error('loaded');
  iframe.dataset.loaded = true;
});

chrome.storage.local.get({
  url: 'https://www.wunderground.com/',
  width: 800,
  height: 520
}, prefs => {
  iframe.src = prefs.url;
  document.body.style.width = prefs.width + 'px';
  document.body.style.height = prefs.height + 'px';
});

document.addEventListener('click', e => {
  const {url, cmd} = e.target.dataset;
  if (url) {
    chrome.tabs.create({url});
  }
  else if (cmd === 'settings') {
    chrome.runtime.openOptionsPage();
  }
});
