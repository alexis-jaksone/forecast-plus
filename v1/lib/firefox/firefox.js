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

var self = require('sdk/self'),
    data = self.data,
    sp = require('sdk/simple-prefs'),
    Request = require('sdk/request').Request,
    prefs = sp.prefs,
    tabs = require('sdk/tabs'),
    timers = require('sdk/timers'),
    loader = require('@loader/options'),
    unload = require('sdk/system/unload'),
    Worker = require('sdk/content/worker').Worker,  // jshint ignore:line
    {defer} = require('sdk/core/promise'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {open} = require('sdk/preferences/utils'),
    {Cc, Ci} = require('chrome'),
    {on, emit} = require('sdk/event/core'),
    config = require('../config');

var {WebRequest} = require('resource://gre/modules/WebRequest.jsm');
var {MatchPattern} = require('resource://gre/modules/MatchPattern.jsm');

var nsIObserverService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);

// Event Emitter
exports.on = on.bind(null, exports);
exports.emit = emit.bind(null, exports);

//toolbar button
exports.button = (function () {
  var button = new ToggleButton({
    id: self.name,
    label: 'Forecast Plus',
    icon: {
      '16': './icons/16.png',
      '32': './icons/32.png'
    },
    onChange: function (state) {
      if (state.checked) {
        exports.popup.show();
      }
    }
  });
  return {
    obj: button,
    set label (val) { // jshint ignore:line
      button.label = val;
    },
    set badge (val) { // jshint ignore:line
      button.badge = val + '';
      button.badgeColor = config.badge.color;
    },
    color: () => button.badgeColor = config.badge.color,
    icon: (url) => {
      exports.popup.obj.port.emit('icon', url);
    }
  };
})();

exports.popup = (function () {
  var popup = require('sdk/panel').Panel({
    contentURL: data.url('./popup/index.html'),
    contentScriptFile: [
      data.url('./popup/firefox/firefox.js'),
      data.url('./popup/index.js')
    ],
    contentStyleFile : data.url('./content_script/inject.css'),
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    },
    onShow: () => popup.port.emit('show'),
    onHide: () => {
      popup.contentURL = 'about:blank';
      popup.contentURL = data.url('./popup/index.html');
      exports.button.obj.state('window', {
        checked: false
      });
    }
  });

  popup.port.on('icon', (url) => exports.button.obj.icon = url);

  return {
    obj: popup,
    send: (id, data) => popup.port.emit(id, data),
    receive: (id, callback) => popup.port.on(id, callback),
    show: () => popup.show({
      width: config.popup.width,
      height: config.popup.height,
      position: exports.button.obj
    }),
    hide: () => popup.hide()
  };
})();

exports.online = (function (callback) {
  exports.popup.receive('online', () => callback());
  return c => callback = c;
})(function () {});

exports.storage = {
  read: (id) => prefs[id],
  write: (id, data) => prefs[id] = data
};

exports.get = function (url) {
  let d = defer();
  new Request({
    url: url,
    onComplete: function (response) {
      if (response.status >= 400) {
        d.reject(response.status);
      }
      else {
        d.resolve(response.text);
      }
    }
  }).get();
  return d.promise;
};

exports.tab = {
  open: function (url) {
    tabs.open({url});
  },
  options: function () {
    open({
      id: self.id
    });
  }
};

exports.version = () => self.version;

exports.timer = timers;

exports.DOMParser = function () {
  return Cc['@mozilla.org/xmlextras/domparser;1']
    .createInstance(Ci.nsIDOMParser);
};

// webRequest
exports.webRequest = {
  onCompleted: {
    addListener: function (callback) {
      let pattern = new MatchPattern([
        'http://www.wunderground.com/*',
        'https://www.wunderground.com/*'
      ]);
      WebRequest.onCompleted.addListener(callback, {
        urls: pattern,
        types: ['main_frame', 'sub_frame']
      });
      unload.when(() => WebRequest.onCompleted.removeListener(callback));
    }
  }
};

// startup
exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};

// injecting script to the iframe of the panel
(function () {
  let documentInsertedObserver = {
    observe: function (document, topic) {
      if (topic !== 'document-element-inserted' || !document.location) {
        return;
      }
      let window = document.defaultView;
      if (!window || !window.parent || window.parent.location.href !== data.url('./popup/index.html')) {
        return;
      }
      if (window.top === window) {
        return;
      }
      new Worker({
        window,
        contentScriptFile: data.url('./content_script/inject.js'),
      });
    }
  };
  nsIObserverService.addObserver(documentInsertedObserver, 'document-element-inserted', false);
  unload.when(function () {
    nsIObserverService.removeObserver(documentInsertedObserver, 'document-element-inserted');
  });
})();
// options
sp.on('width', () => {
  timers.setTimeout(() => {
    prefs.width = Math.max(300, prefs.width);
  }, 2000);
});
sp.on('height', () => {
  timers.setTimeout(() => {
    prefs.height = Math.max(300, prefs.height);
  }, 2000);
});
let idTimeout;
sp.on('timeout', () => {
  timers.clearTimeout(idTimeout);
  idTimeout = timers.setTimeout(() => {
    prefs.timeout = Math.max(1, prefs.timeout);
    exports.emit('timeout-changed');
  }, 2000);
});
sp.on('color', () => {
  exports.emit('color-changed');
});
