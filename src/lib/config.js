'use strict';

var config;
var isFirefox = typeof require !== 'undefined';
if (isFirefox) {
  var app = require('./firefox/firefox');
  config = exports;
}
else {
  config = {};
}

config.popup = {
  get width () {
    return +app.storage.read('width') || 800;
  },
  set width (val) {
    val = +val;
    if (val < 300) {
      val = 300;
    }
    if (val > 800) {
      val = 800;
    }
    app.storage.write('width', val);
  },
  get height () {
    return +app.storage.read('height') || 520;
  },
  set height (val) {
    val = +val;
    if (val < 300) {
      val = 300;
    }
    if (val > 600) {
      val = 600;
    }
    app.storage.write('height', val);
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  timeout: 3
};

config.weather = {
  get currentURL () {
    return app.storage.read('current-url');
  },
  set currentURL (val) {
    app.storage.write('current-url', val);
  },
  get url () {
    let url = app.storage.read('current-url');
    return url ? url : 'http://www.wunderground.com/';
  },
  get timeout () {
    return +app.storage.read('timeout') || 3;
  },
  set timeout (val) {
    val = +val;
    if (val < 1) {
      val = 1;
    }
    app.storage.write('timeout', val);
  },
  get accurate () {
    return app.storage.read('accurate') === 'true' ? true : false;
  },
  set accurate (val) {
    app.storage.write('accurate', val);
  },
};

// Complex get and set
config.get = function (name) {
  return name.split('.').reduce(function (p, c) {
    return p[c];
  }, config);
};
config.set = function (name, value) {
  function set(name, value, scope) {
    name = name.split('.');
    if (name.length > 1) {
      set.call((scope || this)[name.shift()], name.join('.'), value)
    }
    else {
      this[name[0]] = value;
    }
  }
  set(name, value, config);
};
