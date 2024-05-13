/**
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

    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/

/* global schedule */

chrome.storage.local.get({
  metric: true,
  rate: true
}, prefs => {
  chrome.contextMenus.create({
    title: 'Metric Unit (C)',
    id: 'use.metric',
    contexts: ['action'],
    type: 'radio',
    checked: prefs.metric
  }, () => chrome.runtime.lastError);
  chrome.contextMenus.create({
    title: 'Imperial Unit (F)',
    id: 'use.imperial',
    contexts: ['action'],
    type: 'radio',
    checked: prefs.metric === false
  }, () => chrome.runtime.lastError);
  chrome.contextMenus.create({
    title: 'Refresh Weather',
    id: 'refresh',
    contexts: ['action']
  }, () => chrome.runtime.lastError);

  if (prefs.rate) {
    chrome.contextMenus.create({
      title: 'Rate Me',
      id: 'rate',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
  }
  if (/Firefox/.test(navigator.userAgent)) {
    chrome.contextMenus.create({
      title: 'Options Page',
      id: 'options',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
  }
});
chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'refresh') {
    schedule(true, 0, 'user');
  }
  else if (info.menuItemId === 'options') {
    chrome.runtime.openOptionsPage();
  }
  else if (info.menuItemId === 'rate') {
    let url = 'https://chrome.google.com/webstore/detail/weather-forecast-plus/ofobaelkgcpicbdoabokjlnmdcbjellg/reviews';
    if (/Edg/.test(navigator.userAgent)) {
      url = 'https://microsoftedge.microsoft.com/addons/detail/phklfmbdnakdekionmpfdiihnmijfpnl';
    }
    else if (/Firefox/.test(navigator.userAgent)) {
      url = 'https://addons.mozilla.org/firefox/addon/weather-forecast-revived/reviews/';
    }
    else if (/OPR/.test(navigator.userAgent)) {
      url = 'https://addons.opera.com/extensions/details/weather-forecast-plus/';
    }

    chrome.storage.local.set({
      'rate': false
    }, () => chrome.tabs.create({
      url
    }));
  }
  else {
    chrome.storage.local.set({
      metric: info.menuItemId === 'use.metric'
    });
  }
});
