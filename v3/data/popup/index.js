/*
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2022 Alexis Jaksone

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

    Home: https://webextension.org/listing/forecast-plus.html
    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/

'use strict';

const iframe = document.querySelector('iframe');

iframe.addEventListener('load', () => {
  iframe.dataset.loaded = true;
});

chrome.storage.local.get({
  width: 800,
  height: 520
}, prefs => {
  document.body.style.width = prefs.width + 'px';
  document.body.style.height = prefs.height + 'px';
});

document.addEventListener('click', e => {
  const {url, cmd} = e.target.dataset;
  if (url) {
    if (url === 'fetch-url') {
      return chrome.storage.local.get({
        url: 'https://www.wunderground.com/'
      }, prefs => chrome.tabs.create({
        url: prefs.url
      }, () => window.close()));
    }
    chrome.tabs.create({
      url: url === 'faqs' ? chrome.runtime.getManifest().homepage_url : url
    }, () => window.close());
  }
  else if (cmd === 'settings') {
    chrome.runtime.openOptionsPage();
    window.close();
  }
});

window.addEventListener('DOMContentLoaded', () => chrome.storage.local.get({
  url: 'https://www.wunderground.com/'
}, prefs => window.setTimeout(() => {
  iframe.src = prefs.url;
}, 100)));
