/**
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

const log = (...args) => false && console.log(...args);

chrome.webRequest.onHeadersReceived.addListener(info => {
  if (info.tabId === -1) {
    const responseHeaders = info.responseHeaders;
    for (let i = responseHeaders.length - 1; i >= 0; --i) {
      const header = responseHeaders[i].name.toLowerCase();
      if (header == 'x-frame-options' || header == 'frame-options') {
        responseHeaders.splice(i, 1);
      }
    }
    return {responseHeaders};
  }
}, {
  urls: ['*://www.wunderground.com/*'],
  types: ['sub_frame', 'xmlhttprequest']
}, ['blocking', 'responseHeaders', 'extraHeaders']);

// get notified when homepage is loaded
const ports = [];
chrome.runtime.onConnect.addListener(port => {
  ports.push(port);
  port.onDisconnect.addListener(() => {
    const index = ports.indexOf(port);
    if (index !== -1) {
      ports.splice(index, 1);
    }
  });
});
chrome.webRequest.onHeadersReceived.addListener(() => {
  for (const port of ports) {
    port.postMessage({
      method: 'detect-station'
    });
  }
}, {
  urls: ['*://api.weather.com/*/dateTime*'],
  types: ['xmlhttprequest']
}, []);

const button = ((canvas, image) => {
  document.body.appendChild(canvas);
  image.crossOrigin = 'Anonymous';
  document.body.appendChild(image);
  const ctx = canvas.getContext('2d');

  return {
    badge: (val, accurate) => {
      if ((!val && val !== 0) || isNaN(val)) {
        val = '';
      }
      else if (accurate) {
        val = Number(val).toFixed(1);
      }
      else {
        val = Math.round(Number(val));
      }
      chrome.browserAction.setBadgeText({
        text: String(val)
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

function query(doc, selector) {
  switch (selector) {
  case 'current-temperature':
    return doc.querySelector('.current-temp') ||
      doc.querySelector('city-current-conditions .current-temp') ||
      doc.querySelector('.cur-temp') ||
      doc.getElementById('curTemp');
  case 'icon':
    return doc.querySelector('city-current-conditions img') ||
    doc.querySelector('.condition-icon img') ||
    doc.querySelector('#curIcon img');
  case 'feels-like':
    return doc.querySelector('.feels-like') ||
      doc.querySelector('.feelslike') ||
      doc.querySelector('city-current-conditions .feels-like span') ||
      doc.getElementById('curFeel');
  case 'location':
    return doc.querySelector('.city-header h1 span') ||
      doc.querySelector('#location h1') ||
      doc.querySelector('.condition-location');
  case 'full-forecast':
    return doc.querySelector('.fct-button');
  }
}

function validate(url) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'document';
    req.onload = () => {
      const curTemp = query(req.response, 'current-temperature');
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
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open('GET', url);
    req.responseType = 'document';
    req.onload = async () => {
      const doc = req.response;
      // try to switch to full-forecast
      if (url === 'https://www.wunderground.com/') {
        const button = query(doc, 'full-forecast');
        if (button && button.href) {
          const prefs = await new Promise(resolve => chrome.storage.local.get({
            'forecast-button-invalid-url': ''
          }, resolve));
          if (prefs['forecast-button-invalid-url'] !== button.href) {
            if (await onMessage({
              method: 'top-level',
              url: button.href
            })) {
              return;
            }
            else { // blacklist the URL
              chrome.storage.local.set({
                'forecast-button-invalid-url': button.href
              });
            }
          }
          else {
            log('forecast-button\'s URL is in blacklist', button.href);
          }
        }
      }


      let temperature = query(doc, 'current-temperature');
      let cUnit = true;
      const icon = query(doc, 'icon');
      if (temperature) {
        const tmp = /([\d\-.]+)/.exec(temperature.textContent);
        cUnit = temperature.textContent.indexOf('F') === -1;
        if (temperature.classList.contains('funits')) {
          cUnit = false;
        }
        else if (temperature.classList.contains('cunits')) {
          cUnit = true;
        }
        if (tmp && tmp.length) {
          temperature = tmp[1];
        }
        else {
          temperature = '';
        }
      }
      const feelsLike = (elem => {
        if (elem) {
          const tmp = /([\d\-.]+)/.exec(elem.textContent);
          if (tmp && tmp.length) {
            return cUnit ? `${tmp[1]}\u00B0C or ${Math.round(tmp[1] * 9 / 5 + 32)}\u00B0F` :
              `${Math.round((tmp[1] - 32) * 5 / 9)}\u00B0C or ${tmp[1]}\u00B0F`;
          }
        }
      })(query(doc, 'feels-like'));
      let location;
      try {
        location = query(doc, 'location').textContent.trim();
      }
      catch (e) {}
      const unit = cUnit ? `${temperature}\u00B0C or ${Math.round(temperature * 9 / 5 + 32)}\u00B0F` :
        `${Math.round((temperature - 32) * 5 / 9)}\u00B0C or ${temperature}\u00B0F`;

      resolve({
        icon: icon && icon.getAttribute('src'),
        temperature,
        metric: cUnit,
        tooltip: temperature ? `Forecast Plus

Temperature: ${unit}
Feels Like: ${feelsLike || '--'}
Location: ${location || '--'}

Last Updated: ${(new Date()).toLocaleTimeString()}` : 'To adjust badge icon: Open popup -> Find location -> Press "View Full Forecast"'
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

const onMessage = request => {
  if (request.method === 'top-level') {
    //
    const url = request.url;
    if (
      url.indexOf('/weather/') !== -1 ||
      url.indexOf('zmw:') !== -1 ||
      url.indexOf('weather-station') !== -1 ||
      url.indexOf('weatherstation') !== -1 ||
      url.indexOf('/q/') !== -1 ||
      url.indexOf('/weather-forecast/') !== -1 ||
      url.indexOf('/global/stations/') !== -1 ||
      url.indexOf('/cgi-bin/findweather/getForecast') !== -1 ||
      url.indexOf('?utm_source=HomeCard') !== -1
    ) {
      if (!/set\w/.test(url)) { // setunits, setpref
        log('validating the new URL', url);
        return validate(url).then(
          () => {
            log('new URL is valid', 'Metric', request.metric);
            chrome.storage.local.set({url});
            return true;
          },
          e => {
            log('Invalid URL', url, e);
            return false;
          }
        );
      }
    }
  }
  else if (request.method === 'schedule') {
    schedule();
  }
};
chrome.runtime.onMessage.addListener(onMessage);

chrome.alarms.onAlarm.addListener(() => {
  log('alarm event');
  chrome.storage.local.get({
    url: 'https://www.wunderground.com/',
    accurate: false
  }, prefs => {
    update(prefs.url).then(
      ({temperature, icon, tooltip, metric}) => {
        chrome.storage.local.get({
          metric: true
        }, prefs => {
          if (prefs.metric && !metric) {
            temperature = (temperature - 32) * 5 / 9;
          }
          if (!prefs.metric && metric) {
            temperature = temperature * 9 / 5 + 32;
          }
          button.badge(temperature, prefs.accurate);
        });
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

{
  const callback = () => {
    chrome.storage.local.get({
      color: '#485a81'
    }, prefs => {
      chrome.browserAction.setBadgeBackgroundColor({
        color: prefs.color
      });
    });
    //
    schedule(2);
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
//
chrome.idle.onStateChanged.addListener(s => {
  if (s === 'active') {
    log('onStateChanged', s);
    schedule(10);
  }
});
window.addEventListener('online', () => schedule());
//
chrome.windows.onCreated.addListener(() => schedule());
//
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.url || prefs.accurate || prefs.timeout || prefs.metric) {
    schedule();
  }
  if (prefs.metric) {
    chrome.contextMenus.update(prefs.metric.newValue ? 'use.metric' : 'use.imperial', {
      checked: true
    });
  }
  if (prefs.color) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: prefs.color.newValue
    });
  }
});

/* context menus */
chrome.storage.local.get({
  metric: true
}, prefs => {
  chrome.contextMenus.create({
    title: 'Metric Unit (C)',
    id: 'use.metric',
    contexts: ['browser_action'],
    type: 'radio',
    checked: prefs.metric
  });
  chrome.contextMenus.create({
    title: 'Imperial Unit (F)',
    id: 'use.imperial',
    contexts: ['browser_action'],
    type: 'radio',
    checked: prefs.metric === false
  });
});
chrome.contextMenus.onClicked.addListener(info => chrome.storage.local.set({
  metric: info.menuItemId === 'use.metric'
}));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
