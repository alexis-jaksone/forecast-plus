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
/* global importScripts, sax */

importScripts('sax.js');

const query = (code, query, stop = true) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let tree;

    class Node {
      constructor(name, attributes) {
        this.name = name;
        this.attributes = attributes || {};
        this.children = [];
      }
      closest(name) {
        let p = this.parent;
        while (p && p.name !== name) {
          p = p.parent;
        }
        return p;
      }
      child(query, reverse = false) {
        const once = node => {
          if (node.children) {
            for (const n of (reverse ? [...node.children].reverse() : node.children)) {
              if ((query.name ? query.name === n.name : true) && (query.match ? query.match(n) : true)) {
                return n;
              }
              const r = once(n);
              if (r) {
                return r;
              }
            }
          }
        };
        return once(this);
      }
    }
    const parser = sax.parser(false, {});
    parser.onopentag = function(node) {
      const child = new Node(node.name, node.attributes);
      if (!tree) {
        tree = child;
      }
      else {
        tree.children.push(child);
        child.parent = tree;
        tree = child;
      }
    };
    parser.onclosetag = function(name) {
      if ((query.name ? query.name === tree.name : true) && (query.match ? query.match(tree) : true)) {
        results.push(tree);
        if (stop) {
          resolve(tree);
          throw Error('done');
        }
      }
      if (name === tree.name) {
        if (tree.parent) {
          tree = tree.parent;
        }
      }
    };
    parser.ontext = text => tree.text = text;
    parser.onend = () => resolve(stop ? undefined : results);
    parser.onerror = e => reject(e);
    parser.write(code).end();
  });
};

const extract = async href => {
  const r = await fetch(href);
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
    console.log(r.feels);
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

const validate = async url => {
  console.log('validating', url);
  const o = await extract(url);
  if (!o || isNaN(o.value)) {
    throw Error('not a valid station');
  }
  chrome.storage.local.set({
    url
  });
  console.log('looks good!', url);
};

chrome.runtime.onMessage.addListener(request => {
  if (request.method === 'validate') {
    validate(request.href);
  }
});
// extract('https://www.wunderground.com/weather/ca/montreal/IMONTREA66?utm_source=HomeCard&utm_content=Button&cm_ven=HomeCardButton').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/fr/teyran').then(r => console.log(r));
// extract('https://www.wunderground.com/dashboard/pws/ITEHRANT19').then(r => console.log(r));
// extract('https://www.wunderground.com/dashboard/pws/ISHEFF62?cm_ven=localwx_pwsdash').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/CYRQ').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/KDUJ').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/ca/windsor').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/oh/lakeside-marblehead/KOHLAKES15').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/ca/hampstead/IHAMPS1').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/ir/mehran').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/iq/diyala/IDIYAL3').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/ORBI').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/co/cotopaxi/KCOCOTOP43').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/co/canon-city/KCOCANON53').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/us/ca/san-francisco/37.78,-122.42').then(r => console.log(r));
// extract('https://www.wunderground.com/weather/KCASANFR591').then(r => console.log(r));
// extract('https://www.wunderground.com/dashboard/pws/ISOUTHHA2').then(r => console.log(r));

const update = () => chrome.storage.local.get({
  url: '',
  accurate: false,
  metric: true
}, async prefs => {
  if (prefs.url && prefs.url !== 'https://www.wunderground.com/') {
    console.log('update', prefs.url);
    try {
      const o = await extract(prefs.url);
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

Last Updated: ${(new Date()).toLocaleTimeString()}`;
      chrome.action.setTitle({
        title
      });
      // icon
      try {
        const path = 'data/icons/assets/png/' + o.icon.split('/').pop().replace('.svg', '.png');
        fetch(path).then(r => r.blob()).then(async b => {
          const img = await createImageBitmap(b);
          console.log(img, b);
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
      chrome.action.setBadgeText({
        text: 'E'
      });
      chrome.action.setTitle({
        title: `To get badge notification, open popup -> Find location -> Press 'View Full Forecast'


Error: + ${e.message}`
      });

      console.warn('Schedule job failed', e);
    }
  }
  // try to extract location
  else {
    console.log('Try to guess location');
    fetch('https://www.wunderground.com/').then(r => r.text()).then(content => {
      const hrefs = content.split('https://api.weather.com/').slice(1).map(s => {
        return 'https://api.weather.com/' + s.split('&q;')[0].replaceAll('&a;', '&');
      });
      const near = hrefs.filter(s => s.indexOf('location/near') !== -1).shift();
      if (near) {
        fetch(near).then(r => r.json()).then(j => {
          if (j && j?.location?.stationId.length) {
            validate('https://www.wunderground.com/weather/' + j.location.stationId[0]);
          }
        });
      }
    });
  }
});

// check
const schedule = (delay = 2) => {
  console.log('setting a new alarm', delay);
  chrome.action.setBadgeText({
    text: '...'
  });

  chrome.storage.local.get({
    timeout: 10
  }, prefs => chrome.alarms.create('timer', {
    when: Date.now() + delay * 1000,
    periodInMinutes: prefs.timeout
  }));
};
chrome.runtime.onInstalled.addListener(() => schedule());
chrome.runtime.onStartup.addListener(() => schedule());
chrome.storage.onChanged.addListener(ps => {
  if (ps.url || ps.timeout || ps.metric || ps.accurate) {
    schedule();
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

chrome.alarms.onAlarm.addListener(o => o.name === 'timer' && update());

/* context menus */
chrome.storage.local.get({
  metric: true
}, prefs => {
  chrome.contextMenus.create({
    title: 'Metric Unit (C)',
    id: 'use.metric',
    contexts: ['action'],
    type: 'radio',
    checked: prefs.metric
  });
  chrome.contextMenus.create({
    title: 'Imperial Unit (F)',
    id: 'use.imperial',
    contexts: ['action'],
    type: 'radio',
    checked: prefs.metric === false
  });
});
chrome.contextMenus.onClicked.addListener(info => chrome.storage.local.set({
  metric: info.menuItemId === 'use.metric'
}));

/* badge color */
{
  const callback = () => {
    chrome.storage.local.get({
      color: '#485a81'
    }, prefs => chrome.action.setBadgeBackgroundColor({
      color: prefs.color
    }));
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}


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