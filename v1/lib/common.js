/*******************************************************************************
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2016 Alexis Jaksone

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

var app = require('./firefox/firefox');
var config = require('./config');

var checkNotifications;

function guess () {
  return app.get('http://www.wunderground.com/?MR=1').then(function (content) {
    let tmp = content.split('wui.bootstrapped.citypage');
    if (tmp && tmp[1]) {
      let zmw = /zmw\:\s*[\'\"]([\d\w\.]+)[\'\"]/.exec(tmp[1]);
      if (zmw && zmw.length) {
        config.weather.currentURL = 'http://www.wunderground.com/q/zmw:' + zmw[1];
        checkNotifications();
      }
    }
  }, function () {});
}

checkNotifications = (function () {
  let id, oURL, oTime;

  return function (forced) {
    let url = config.weather.currentURL;
    if (!url) {
      return;
    }
    let time = (new Date()).getTime();
    if (oURL && oTime && oURL === url && time - oTime < 59 * 1000 && !forced) {
      return;
    }
    app.timer.clearTimeout(id);
    app.get(url).then(function (content) {
      let parser = new app.DOMParser();
      let doc = parser.parseFromString(content, 'text/html');
      let temperature = doc.getElementById('curTemp');
      let cUnit = true;
      let icon = doc.querySelector('#curIcon img');
      if (icon) {
        app.button.icon('https:' + icon.getAttribute('src'));
      }
      if (temperature) {
        let tmp = /([\d\-\.]+)/.exec(temperature.textContent);
        cUnit = temperature.textContent.indexOf('F') === -1;
        if (tmp && tmp.length) {
          temperature = config.weather.accurate ? tmp[1] : Math.round(tmp[1]);
          if (isNaN(temperature)) {
            temperature = '-';
          }
          else {
            app.button.badge = temperature;
          }
        }
        config.weather.lastValidURL = url;
      }
      let feelsLike = (function (elem) {
        if (elem) {
          let tmp = /([\d\-\.]+)/.exec(elem.textContent);
          if (tmp && tmp.length) {
            return tmp[1] + (cUnit ? '\u00B0C' : '\u00B0F');
          }
        }
      })(doc.getElementById('curFeel'));
      let location;
      try {
        location = doc.getElementById('location').querySelector('h1').textContent.trim();
      }
      catch (e) {}
      let unit = cUnit ? `${temperature}\u00B0C or ${Math.round(temperature * 9 / 5 + 32)}\u00B0F` :
        `${Math.round((temperature - 32) * 5 / 9)}\u00B0C or ${temperature}\u00B0F`;
      let tooltip = `Forecast Plus \n\nLast Updated: ${(new Date()).toLocaleTimeString()}\nTemperature: ${unit}\nLocation: ${location || '--'}\nFeels Like: ${feelsLike || '--'}`;
      app.button.label = tooltip.trim();
    }, function (e) {
      if (e === 404) {
        if (config.weather.lastValidURL) {
          config.weather.currentURL = config.weather.lastValidURL;
        }
        else {
          config.weather.currentURL = '';
          guess();
        }
      }
    });
    id = app.timer.setTimeout(checkNotifications, 1000 * 60 * config.weather.timeout);
    oTime = time;
    oURL = url;
  };
})();

(function (callback) {
  app.webRequest.onCompleted.addListener((details) => {
    if (details.type === 'main_frame' || details.type === 'sub_frame') {
      callback(details.url);
    }
  });
})(function (url) {
  if (
    url.indexOf('zmw:') !== -1 ||
    url.indexOf('weather-station') !== -1 ||
    url.indexOf('weatherstation') !== -1 ||
    url.indexOf('/q/') !== -1 ||
    url.indexOf('/weather-forecast/') !== -1 ||
    url.indexOf('/global/stations/') !== -1 ||
    url.indexOf('/cgi-bin/findweather/getForecast') !== -1
  ) {
    if (url !== config.weather.currentURL) {
      let unitChange = url.indexOf('setunits') !== -1;
      let setPref = url.indexOf('setpref') !== -1;
      if (!unitChange && !setPref) {
        config.weather.currentURL = url;
        checkNotifications();
      }
      else {
        app.timer.setTimeout(checkNotifications, 15 * 1000, true);
      }
    }
  }
});

function init (forced) {
  if (config.weather.currentURL) {
    checkNotifications(forced);
  }
  else {
    guess();
  }
}

init();
app.online(function () {
  app.timer.setTimeout(init, 5 * 1000, true);
});
// popup
app.popup.receive('load', function () {
  app.popup.send('load', config.weather.url);
});
app.popup.receive('resize', function () {
  app.popup.send('resize', {
    width: config.popup.width,
    height: config.popup.height
  });
});
app.popup.receive('open-bug', function () {
  app.tab.open('https://github.com/alexis-jaksone/forecast-plus/issues');
  app.popup.hide();
});
app.popup.receive('open-faq', function () {
  app.tab.open('http://add0n.com/forecast-plus.html?type=context');
  app.popup.hide();
});
app.popup.receive('open-options', function () {
  app.tab.options();
  app.popup.hide();
});
app.popup.receive('refresh-location', function () {
  app.button.badge = '-';
  config.weather.currentURL = '';
  guess().then(() => app.popup.send('load', config.weather.url));
});
app.popup.receive('refresh', function () {
  app.button.badge = '-';
  init(true);
});
// welcome
app.startup(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      if (config.welcome.open) {
        app.tab.open(
          'http://add0n.com/forecast-plus.html?v=' +
          app.version() +
          (version ? '&p=' + version + '&type=upgrade' : '&type=install')
        );
      }
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
// prefs changes
app.on('color-changed', app.button.color);
app.on('timeout-changed', function () {
  app.timer.setTimeout(checkNotifications, 15 * 1000, true);
});
