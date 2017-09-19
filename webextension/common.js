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

function log() {
  //console.log(...arguments);
}

var button = ((canvas, image) => {
  document.body.appendChild(canvas);
  image.crossOrigin = 'Anonymous';
  document.body.appendChild(image);
  const ctx = canvas.getContext('2d');

  return {
    badge: (val, accurate) => {
      if ((!val && val !== 0) || isNaN(val)) {
        val = '';
      }
      else if (!accurate) {
        val = Math.round(Number(val));
      }
      chrome.browserAction.setBadgeText({
        text:  String(val)
      });
    },
    tooltip: title => chrome.browserAction.setTitle({title}),
    color: color => chrome.browserAction.setBadgeBackgroundColor({color}),
    icon: url => {
      url = url.replace(/^\/\//, 'https://');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onload = () => {
        if (xhr.status === 200) {
          const xml = xhr.responseXML;
          if (xml) {
            const svg = xml.querySelector('svg');

            svg.setAttribute('width', 128);
            svg.setAttribute('height', 128);

            image.onload = () => {
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
              if (canvas.width && canvas.height) {
                ctx.drawImage(image, 0, 0);
                chrome.browserAction.setIcon({
                  imageData: {
                    200: ctx.getImageData(0, 0, canvas.width, canvas.height)
                  }
                });
              }
            };
            image.src = URL.createObjectURL(new Blob([svg.outerHTML], {
              type: 'image/svg+xml;charset=utf-8'
            }));
          }
        }
      };
      xhr.send();
    }
  };
})(document.createElement('canvas'), document.createElement('img'));

function validate(url) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'document';
    req.onload = () => {
      const curTemp = req.response.querySelector('city-current-conditions .current-temp');
      if (curTemp) {
        resolve();
      }
      else {
        reject(new Error('curTemp not found'));
      }
    };
    req.onerror = reject;
    req.send();
  });
}

function update(url) {
  log('updating from', url);
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'document';
    req.onload = () => {
      const doc = req.response;
      let temperature = doc.querySelector('city-current-conditions .current-temp');
      let cUnit = true;
      const icon = doc.querySelector('city-current-conditions img');

      if (temperature) {
        const tmp = /([\d\-.]+)/.exec(temperature.textContent);
        cUnit = temperature.textContent.indexOf('F') === -1;
        if (tmp && tmp.length) {
          temperature = tmp[1];
        }
        else {
          temperature = '';
        }
      }
      const feelsLike = (function(elem) {
        if (elem) {
          const tmp = /([\d\-.]+)/.exec(elem.textContent);
          if (tmp && tmp.length) {
            return tmp[1] + (cUnit ? '\u00B0C' : '\u00B0F');
          }
        }
      })(doc.querySelector('city-current-conditions .feels-like span'));
      let location;
      try {
        location = doc.querySelector('.city-header h1').textContent.trim();
      }
      catch (e) {}
      const unit = cUnit ? `${temperature}\u00B0C or ${Math.round(temperature * 9 / 5 + 32)}\u00B0F` :
        `${Math.round((temperature - 32) * 5 / 9)}\u00B0C or ${temperature}\u00B0F`;

      resolve({
        icon: icon && icon.getAttribute('src'),
        temperature,
        tooltip: `Forecast Plus

Last Updated: ${(new Date()).toLocaleTimeString()}
Temperature: ${unit}
Location: ${location || '--'}
Feels Like: ${feelsLike || '--'}`
      });
    };
    req.onerror = e => {
      if (req.status === 404) {
        chrome.storage.local.set({
          url: 'https://www.wunderground.com/'
        });
      }
      reject(e);
    };
    req.send();
  });
}

// check
function schedule(delay = 2) {
  log('setting a new alarm', delay);
  chrome.alarms.clearAll(() => {
    chrome.storage.local.get({
      timeout: 10
    }, prefs => {
      chrome.alarms.create('timer', {
        when: Date.now() + delay * 1000,
        periodInMinutes: prefs.timeout
      });
    });
  });
}

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'top-level') {
    const url = request.url;
    if (
      url.indexOf('/weather/') !== -1 ||
      url.indexOf('zmw:') !== -1 ||
      url.indexOf('weather-station') !== -1 ||
      url.indexOf('weatherstation') !== -1 ||
      url.indexOf('/q/') !== -1 ||
      url.indexOf('/weather-forecast/') !== -1 ||
      url.indexOf('/global/stations/') !== -1 ||
      url.indexOf('/cgi-bin/findweather/getForecast') !== -1
    ) {
      if (!/set\w/.test(url)) { // setunits, setpref
        log('validating the new URL', url);
        validate(url).then(
          () => {
            log('new URL is valid');
            chrome.storage.local.set({url});
          },
          e => log('Invalid URL', url, e)
        );
      }
    }
  }
  else if (request.method === 'schedule') {
    schedule();
  }
});

chrome.alarms.onAlarm.addListener(() => {
  log('alarm event');
  chrome.storage.local.get({
    url: 'https://www.wunderground.com/',
    accurate: false
  }, prefs => {
    update(prefs.url).then(
      ({temperature, icon, tooltip}) => {
        button.badge(temperature, prefs.accurate);
        button.tooltip(tooltip);
        if (icon) {
          button.icon(icon);
        }
      },
      e => {
        button.badge('');
        button.tooltip(e.message || e);
      }
    );
  });
});

(callback => {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(() => {
  chrome.storage.local.get({
    color: '#485a81'
  }, prefs => {
    chrome.browserAction.setBadgeBackgroundColor({
      color: prefs.color
    });
  });
  //
  schedule(2);
  // FAQs & Feedback
  chrome.storage.local.get({
    'version': null,
    'faqs': navigator.userAgent.indexOf('Firefox') === -1
  }, prefs => {
    const version = chrome.runtime.getManifest().version;

    if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
      chrome.storage.local.set({version}, () => {
        chrome.tabs.create({
          url: 'http://add0n.com/forecast-plus.html?version=' + version +
            '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
        });
      });
    }
  });
  {
    const {name, version} = chrome.runtime.getManifest();
    chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
  }
});
//
chrome.idle.onStateChanged.addListener(s => {
  if (s === 'active') {
    log('onStateChanged', s);
    schedule(10);
  }
});
window.addEventListener('online', () => schedule());
//
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.url || prefs.accurate || prefs.timeout) {
    schedule();
  }
  if (prefs.color) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: prefs.color.newValue
    });
  }
});
