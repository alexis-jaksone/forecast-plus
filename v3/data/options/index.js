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

    Home: http://add0n.com/forecast-plus.html
    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/

'use strict';

const log = document.getElementById('status');

function toast(message, timeout = 750) {
  return new Promise(resolve => {
    log.textContent = message;
    clearTimeout(toast.id);
    toast.id = setTimeout(() => log.textContent = '', timeout);
    // resolve anyway
    setTimeout(resolve, timeout);
  });
}

function restore() {
  chrome.storage.local.get({
    'url': '',
    'user-station': false
  }, prefs => {
    console.log(prefs);
    document.getElementById('active-station').textContent = prefs.url || '-';
    document.getElementById('user-station').value = prefs['user-station'] || '';
  });

  chrome.storage.local.get({
    width: 800,
    height: 520,
    timeout: 10,
    color: '#485a81',
    accurate: false,
    faqs: true,
    metric: true
  }, prefs => {
    Object.keys(prefs).forEach(name => {
      document.getElementById(name)[typeof prefs[name] === 'boolean' ? 'checked' : 'value'] = prefs[name];
    });
  });
}

function save() {
  const prefs = {
    'width': Math.min(800, Math.max(document.getElementById('width').value, 300)),
    'height': Math.min(800, Math.max(document.getElementById('height').value, 300)),
    'timeout': Math.max(document.getElementById('timeout').value, 3),
    'color': document.getElementById('color').value,
    'accurate': document.getElementById('accurate').checked,
    'faqs': document.getElementById('faqs').checked,
    'metric': document.getElementById('metric').checked,
    'user-station': document.getElementById('user-station').value || false
  };

  const next = () => chrome.storage.local.set(prefs, () => {
    toast('Options saved');
    restore();
  });


  const href = document.getElementById('user-station').value;
  if (href) {
    toast('Validating the provided station...', 100000);

    if (href.startsWith('https://www.wunderground.com/') === false) {
      prefs['user-station'] = false;
      toast('Station address start with "https://www.wunderground.com/"', 2000).then(next);
      document.getElementById('user-station').value = '';

      return;
    }
    try {
      new URL(href);
    }
    catch (e) {
      prefs['user-station'] = false;
      toast('Invalid address', 2000).then(next);
      document.getElementById('user-station').value = '';

      return;
    }

    chrome.runtime.sendMessage({
      method: 'responsive-validate',
      href
    }, r => {
      if (r === true) {
        prefs['user-station'] = href;
        next();
      }
      else {
        prefs['user-station'] = false;
        toast('Station is not responding: ' + r, 2000).then(next);
        document.getElementById('user-station').value = '';
      }
    });
  }
  else {
    prefs['user-station'] = false;
    next();
  }
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', () => {
  try {
    save();
  }
  catch (e) {
    log.textContent = e.message;
    setTimeout(() => log.textContent = '', 750);
  }
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    log.textContent = 'Double-click to reset!';
    window.setTimeout(() => log.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
// rate
document.getElementById('rate').addEventListener('click', () => {
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
});
// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
