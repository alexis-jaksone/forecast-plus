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

/* global query log */

self.importScripts('extra.js');
self.importScripts('context.js');

const config = {
  'skip-update': 1000, // ms
  'extract-timeout': 120000, // ms
  'idle-timeout': 5 * 60 * 1000, // ms
  'idle-delay': 20, // ms
  'update-error': 2 * 60 // seconds
};

const extract = async href => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), config['extract-timeout']);
  const r = await fetch(href, {
    signal: controller.signal
  });
  const content = await r.text();

  const type = href.indexOf('/pws/') === -1 ? 'nrm' : 'pws';
  const parent = await query(content, {
    name: type === 'nrm' ? 'DIV' : 'SECTION',
    match(n) {
      if (type === 'nrm') {
        return (n?.attributes?.CLASS || '').indexOf('condition-data') !== -1;
      }
      return n?.attributes?.ID === 'main-page-content';
    }
  });
  if (parent) {
    const r = {};
    r.value = parent.child({
      name: 'SPAN',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('wu-value') !== -1;
      }
    })?.text;
    if (r.value) {
      r.value = parseFloat(r.value);
    }
    const unit = parent.child({
      name: 'SPAN',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('wu-label') !== -1;
      }
    });
    if (unit && unit.children.length) {
      r.unit = unit.children[1].text;
    }
    r.feels = parent.child({
      name: 'DIV',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('feels-like') !== -1;
      }
    })?.child({
      match(n) {
        const c = (n?.attributes?.CLASS || '');
        return c.indexOf('wu-value') !== -1 || c.indexOf('temp') !== -1;
      }
    })?.text;
    if (r.feels) {
      r.feels = parseFloat(r.feels);
    }

    const icon = (await query(content, {
      name: 'DIV',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('condition-icon') !== -1;
      }
    }));
    if (icon && icon.child) {
      r.icon = icon.child({name: 'IMG'})?.attributes?.SRC;
    }
    if (!icon && type === 'pws') {
      const station = (await query(content, {
        name: 'A',
        match(n) {
          return (n?.attributes?.CLASS || '').indexOf('location-name') !== -1;
        }
      }));
      if (station) {
        let href = 'https://www.wunderground.com' + station.attributes.HREF;
        // this PWS points to another PWS or itself; try to guess the nearest station from homepage
        if (station.attributes.HREF === '' || href.indexOf('/pws/') !== -1) {
          try {
            href = await guess();
          }
          catch (e) {}
        }
        if (href && href.indexOf('/pws/') === -1) {
          try {
            r.icon = await extract(href).then(n => n.icon);
          }
          catch (e) {}
        }
      }
    }

    // location
    r.location = type === 'pws' ? (await query(content, {
      name: 'DIV',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('station-header') !== -1;
      }
    }))?.child({name: 'H1'})?.text : (await query(content, {
      name: 'DIV',
      match(n) {
        return (n?.attributes?.CLASS || '').indexOf('city-header') !== -1;
      }
    }))?.child({name: 'H1'})?.child({name: 'SPAN'})?.text;

    return r;
  }
  return;
};

const guess = () => fetch('https://www.wunderground.com/').then(r => r.text()).then(content => {
  const hrefs = content.split('https://api.weather.com/').slice(1).map(s => {
    return 'https://api.weather.com/' + s.split('&q;')[0].replaceAll('&a;', '&');
  });
  const near = hrefs.filter(s => s.indexOf('location/near') !== -1).shift();
  if (near) {
    return fetch(near).then(r => r.json()).then(j => {
      if (j && j?.location?.stationId.length) {
        return 'https://www.wunderground.com/weather/' + j.location.stationId[0];
      }
    });
  }
});

const validate = async url => {
  const prefs = await new Promise(resolve => chrome.storage.local.get({
    url: ''
  }, resolve));
  if (prefs.url !== url) {
    log('validating', url);
    const o = await extract(url);

    if (!o || isNaN(o.value) || o.location === 'undefined') {
      throw Error('not a valid station');
    }
    chrome.storage.local.set({
      url
    });
    log('looks good!', url);
  }
};

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.method === 'validate') {
    validate(request.href);
  }
  else if (request.method === 'responsive-validate') {
    validate(request.href).then(() => response(true)).catch(e => response(e.message));

    return true;
  }
});

// extract('https://www.wunderground.com/weather/us/ca/san-francisco/37.78,-122.42').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/KCASANFR591').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/pa/havertown/KPAHAVER15').then(r => console.log(r));
// extract('https://www.wunderground.com/dashboard/pws/KPAHAVER15?cm_ven=localwx_pwsdash').then(r => console.log(r));
// PWS that points to itself (icon resolving uses guess)
// extract('https://www.wunderground.com/dashboard/pws/ISOUTHHA2').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/oh/mason/null#isIframeBuster=1&id=3860').then(r => console.log(r));

const update = async reason => {
  if (Date.now() - update.now < config['skip-update']) {
    log('update rejected for', reason);
    return;
  }

  update.now = Date.now();
  const prefs = await new Promise(resolve => chrome.storage.local.get({
    'url': '',
    'user-station': false,
    'accurate': false,
    'metric': true
  }, resolve));
  const href = prefs['user-station'] || prefs.url;


  if (href && href !== 'https://www.wunderground.com/') {
    log('update', href, 'reason', reason);
    try {
      const o = await extract(href);
      if (prefs.metric && o.unit === 'F') {
        o.value = (o.value - 32) * 5 / 9;
        o.feels = (o.feels - 32) * 5 / 9;
        o.unit = 'C';
      }
      if (!prefs.metric && o.unit === 'C') {
        o.value = o.value * 9 / 5 + 32;
        o.feels = o.feels * 9 / 5 + 32;
        o.unit = 'F';
      }

      // Badge Text
      if ((!o.value && o.value !== 0) || isNaN(o.value)) {
        o.value = '';
      }
      else if (prefs.accurate) {
        o.value = o.value.toFixed(1);
        o.feels = o.feels.toFixed(1);
      }
      else {
        o.value = Math.round(Number(o.value));
        o.feels = Math.round(Number(o.feels));
      }
      chrome.action.setBadgeText({
        text: o.value.toString()
      });
      // tooltip
      const title = `Forecast Plus

Temperature: ${o.value} °${o.unit}
Feels Like: ${isNaN(o.feels) ? '--' : o.feels} °${o.unit}
Location: ${o.location || '--'}

Last Updated: ${new Date().toLocaleString(navigator.language, {hour12: false})}`;
      chrome.action.setTitle({
        title
      });
      // icon
      try {
        const path = '/data/icons/assets/png/' + (o.icon || '').split('/').pop().replace('.svg', '.png');
        await fetch(path).then(r => r.blob()).then(async b => {
          const img = await createImageBitmap(b);
          const offscreen = new OffscreenCanvas(img.width, img.height);
          const ctx = offscreen.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          chrome.action.setIcon({
            imageData: {
              [img.width]: ctx.getImageData(0, 0, img.width, img.height)
            }
          });
        });
      }
      catch (e) {
        console.warn('cannot set icon', o.icon, e);
        chrome.action.setIcon({
          path: {
            '16': 'data/icons/16.png',
            '32': 'data/icons/32.png',
            '48': 'data/icons/48.png'
          }
        });
      }
    }
    catch (e) {
      const v = await chrome.action.getBadgeText({});
      // only display error when needed
      if (v === '...' || v === '') {
        chrome.action.setBadgeText({
          text: 'E'
        });
        // let's try in 2 minutes
        schedule(false, config['update-error'], 'error');
      }
      chrome.action.setTitle({
        title: `To get badge notification, open popup -> Find location -> Press 'View Full Forecast'


Error: ${e.message}

Last Check: ${new Date().toLocaleString(navigator.language, {hour12: false})}`
      });

      console.warn('Schedule job failed', e);
    }
  }
  // try to extract location
  else {
    log('Try to guess location');
    update.now = 0;
    const href = await guess();
    if (href) {
      await validate(href);
    }
  }
};
update.now = 0;

// check
const schedule = (forced = false, delay = 0, reason = '') => {
  log('new alarm; delay: ', delay, 'forced', forced, 'reason', reason);
  if (forced) {
    chrome.action.setBadgeText({
      text: '...'
    });
  }

  chrome.storage.local.get({
    timeout: 10
  }, prefs => chrome.alarms.create('timer', {
    when: Date.now() + delay * 1000,
    periodInMinutes: prefs.timeout
  }));
};
chrome.runtime.onInstalled.addListener(() => schedule(true, 0, 'installed'));
chrome.runtime.onStartup.addListener(() => schedule(true, 0, 'startup'));
chrome.storage.onChanged.addListener(ps => {
  if (ps.url || ps.timeout || ps.metric || ps.accurate) {
    schedule(true, 0, 'prefs');
  }
  if (ps['user-station'] && ps['user-station'].newValue === false) {
    schedule(true, 0, 'prefs');
  }
  if (ps.metric) {
    chrome.contextMenus.update(ps.metric.newValue ? 'use.metric' : 'use.imperial', {
      checked: true
    });
  }
  if (ps.color) {
    chrome.action.setBadgeBackgroundColor({
      color: ps.color.newValue
    });
  }
});
chrome.idle.setDetectionInterval(config['idle-timeout']);
chrome.idle.onStateChanged.addListener(s => {
  if (s === 'active') {
    schedule(false, config['idle-delay'], 'idle');
  }
});
// chrome.windows.onCreated.addListener(() => schedule(false, 0, 'window'));

/* startup; we do check for updates on each activate event */
self.addEventListener('activate', e => e.waitUntil(update('activate')));
chrome.alarms.onAlarm.addListener(o => {
  if (o.name === 'timer') {
    update('timer');
  }
});

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
