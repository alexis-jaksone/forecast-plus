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
    pageMod = require('sdk/page-mod'),
    tabs = require('sdk/tabs'),
    timers = require('sdk/timers'),
    loader = require('@loader/options'),
    array = require('sdk/util/array'),
    unload = require('sdk/system/unload'),
    Worker = require('sdk/content/worker').Worker,  // jshint ignore:line
    {defer} = require('sdk/core/promise'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {Cc, Ci} = require('chrome'),
    {on, off, once, emit} = require('sdk/event/core'),
    config = require('../config');

var {WebRequest} = require('resource://gre/modules/WebRequest.jsm');
var {MatchPattern} = require('resource://gre/modules/MatchPattern.jsm');

var nsIObserverService = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);

// Event Emitter
exports.on = on.bind(null, exports);
exports.once = once.bind(null, exports);
exports.emit = emit.bind(null, exports);
exports.removeListener = function removeListener (type, listener) {
  off(exports, type, listener);
};

//toolbar button
exports.button = (function () {
  var button = new ToggleButton({
    id: self.name,
    label: 'Forecast Plus',
    icon: {
      '16': './icons/16.png',
      '32': './icons/32.png'
    },
    onChange: function(state) {
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

exports.online = (function () {
  let callback = function () {};

  exports.popup.receive('online', () => callback());
  return c => callback = c;
})();

exports.storage = {
  read: (id) => (prefs[id] || prefs[id] + '' === 'false') ? (prefs[id] + '') : null,
  write: function (id, data) {
    data = data + '';
    if (data === 'true' || data === 'false') {
      prefs[id] = data === 'true' ? true : false;
    }
    else if (parseInt(data) + '' === data) {
      prefs[id] = parseInt(data);
    }
    else {
      prefs[id] = data + '';
    }
  }
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
    for each (let tab in tabs) {
      if (tab.url.startsWith(self.data.url(''))) {
        tab.close();
      }
    }
    tabs.open(self.data.url('options/index.html'));
  }
};

exports.version = () => self.version;

exports.timer = timers;

exports.DOMParser = function () {
  return Cc['@mozilla.org/xmlextras/domparser;1']
    .createInstance(Ci.nsIDOMParser);
};

exports.options = (function () {
  let workers = [], options_arr = [];
  pageMod.PageMod({
    include: data.url('options/index.html'),
    contentScriptFile: data.url('options/index.js'),
    contentScriptWhen: 'start',
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    },
    onAttach: function(worker) {
      array.add(workers, worker);
      worker.on('pageshow', function() {
        array.add(workers, this);
      });
      worker.on('pagehide', function() {
        array.remove(workers, this);
      });
      worker.on('detach', function() {
        array.remove(workers, this);
      });

      options_arr.forEach(function (arr) {
        worker.port.on(arr[0], arr[1]);
      });
    }
  });
  return {
    send: function (id, data) {
      workers.forEach(function (worker) {
        if (!worker || !worker.url) {
          return;
        }
        worker.port.emit(id, data);
      });
    },
    receive: (id, callback) => options_arr.push([id, callback])
  };
})();
unload.when(function (e) {
  if (e === 'shutdown') {
    return;
  }
  for each (var tab in tabs) {
    if (tab && tab.url && tab.url.startsWith(self.data.url(''))) {
      tab.close();
    }
  }
});

sp.on('openOptions', exports.tab.options);
sp.on('openFAQs', function() {
  exports.tab.open('http://add0n.com/forecast-plus.html');
});

// webRequest
exports.webRequest = {
  onCompleted: {
    addListener: function (callback, matches, prop) {
      let pattern = new MatchPattern(matches.urls);
      WebRequest.onCompleted.addListener(callback, {urls: pattern}, prop);
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
    observe: function(document, topic) {
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
