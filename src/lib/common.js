'use strict';

/**** wrapper (start) ****/
var isFirefox = typeof require !== 'undefined';

if (isFirefox) {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/

var checkNotifications = (function () {
  let id, oURL, oTime;

  return function (forced) {
    let url = config.weather.currentURL;
    if (!url) {
      return;
    }
    let time = (new Date()).getTime();
    if (oURL && oTime && oURL === url && time - oTime < 60 * 1000 && !forced) {
      return;
    }
    app.timer.clearTimeout(id);
    app.get(url).then(function (content) {
      let parser = new app.DOMParser();
      let doc = parser.parseFromString(content, 'text/html');
      let temperature = doc.getElementById('curTemp');
      let cUnit = true;
      if (temperature) {
        let tmp = /([\d\-\.]+)/.exec(temperature.textContent);
        cUnit = temperature.textContent.indexOf('F') === -1;
        if (tmp && tmp.length) {
          temperature = config.weather.accurate ? tmp[1] : Math.round(tmp[1]);
          app.button.badge = temperature;
        }
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
      let tooltip = `Forecast Plus \n\nTemperature: ${unit}\nLocation: ${location || '--'}\nFeels Like: ${feelsLike || '--'}`;
      app.button.label = tooltip.trim();
    }, function () {});
    id = app.timer.setTimeout(checkNotifications, 1000 * 60 * config.weather.timeout);
    oTime = time;
    oURL = url;
  };
})();

app.observer(function (url) {
  if (
    url.indexOf('http://www.wunderground.com/q/') === 0 ||
    url.indexOf('https://www.wunderground.com/q/') === 0 ||
    url.indexOf('http://www.wunderground.com/weather-forecast/') === 0 ||
    url.indexOf('https://www.wunderground.com/weather-forecast/') === 0 ||
    url.indexOf('http://www.wunderground.com/cgi-bin/findweather/getForecast') === 0 ||
    url.indexOf('https://www.wunderground.com/cgi-bin/findweather/getForecast') === 0
  ) {
    if (url !== config.weather.currentURL) {
      let unitChange = url.indexOf('setunits') !== -1;
      if (!unitChange) {
        config.weather.currentURL = url;
        checkNotifications();
      }
      else {
        app.timer.setTimeout(checkNotifications, 15 * 1000, true);
      }
    }
  }
});

if (config.weather.currentURL) {
  checkNotifications();
}
else {
  app.get('http://www.wunderground.com/?MR=1').then(function (content) {
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

// options
app.options.receive('changed', function (o) {
  config.set(o.pref, o.value);
  app.options.send('set', {
    pref: o.pref,
    value: config.get(o.pref)
  });
});
app.options.receive('get', function (pref) {
  app.options.send('set', {
    pref: pref,
    value: config.get(pref)
  });
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
// welcome
app.startup(function () {
  var version = config.welcome.version;
  if (app.version() !== version) {
    app.timer.setTimeout(function () {
      app.tab.open(
        'http://add0n.com/forecast-plus.html?v=' +
        app.version() +
        (version ? '&p=' + version + '&type=upgrade' : '&type=install')
      );
      config.welcome.version = app.version();
    }, config.welcome.timeout);
  }
});
