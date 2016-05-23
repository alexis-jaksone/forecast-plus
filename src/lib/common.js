'use strict';

/**** wrapper (start) ****/
var isFirefox = typeof require !== 'undefined';

if (isFirefox) {
  var app = require('./firefox/firefox');
  var config = require('./config');
}
/**** wrapper (end) ****/
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
    }, function (e) {
      if (e === 404) {
        config.weather.currentURL = '';
        guess();
      }
    });
    id = app.timer.setTimeout(checkNotifications, 1000 * 60 * config.weather.timeout);
    oTime = time;
    oURL = url;
  };
})();
app.observer(function (url) {
  if (
    url.startsWith('http://www.wunderground.com/q/') ||
    url.startsWith('https://www.wunderground.com/q/') ||
    url.startsWith('http://www.wunderground.com/weather-forecast/') ||
    url.startsWith('https://www.wunderground.com/weather-forecast/') ||
    url.startsWith('http://www.wunderground.com/cgi-bin/findweather/getForecast') ||
    url.startsWith('https://www.wunderground.com/cgi-bin/findweather/getForecast') ||
    (url.startsWith('https://www.wunderground.com') && url.indexOf('zmw:') !== -1) ||
    (url.startsWith('https://www.wunderground.com') && url.indexOf('weather-station') !== -1) ||
    (url.startsWith('https://www.wunderground.com') && url.indexOf('weatherstation') !== -1)
  ) {
    if (url !== config.weather.currentURL) {
      let unitChange = url.indexOf('setunits') !== -1;
      let setPref = url.indexOf('setpref') !== -1;
      if (!unitChange && !setPref) {
        //console.error(url);
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
  guess();
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
app.popup.receive('open-options', function () {
  app.tab.options();
  app.popup.hide();
});
app.popup.receive('refresh-location', function () {
  config.weather.currentURL = '';
  guess().then(() => app.popup.send('load', config.weather.url));
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
