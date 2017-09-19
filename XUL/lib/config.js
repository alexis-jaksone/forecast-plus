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

var app = app || require('./firefox/firefox');
var config = typeof exports !== 'undefined' ? exports : {};

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

config.badge = {
  get color () {
    return app.storage.read('color') || '#485a81';
  },
  set color (val) {
    if (val[0] !== '#' && val[0] !== 'r') {
      val = '';
    }
    app.storage.write('color', val);
    app.emit('color-changed');
  }
};

config.welcome = {
  get version () {
    return app.storage.read('version');
  },
  set version (val) {
    app.storage.write('version', val);
  },
  get open () {
    return app.storage.read('faqs') === 'false' ? false : true;
  },
  set open (val) {
    app.storage.write('faqs', val);
  },
  timeout: 3
};

config.weather = {
  get lastValidURL () {
    return app.storage.read('last-valid-url');
  },
  set lastValidURL (val) {
    app.storage.write('last-valid-url', val);
  },
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
    return +app.storage.read('timeout') || 10;
  },
  set timeout (val) {
    val = +val;
    if (val < 1) {
      val = 1;
    }
    app.storage.write('timeout', val);
    app.emit('timeout-changed');
  },
  get accurate () {
    return app.storage.read('accurate') === 'true' ? true : false;
  },
  set accurate (val) {
    app.storage.write('accurate', val);
  },
};
