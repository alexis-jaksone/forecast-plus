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
    browserWindows = require('sdk/windows').browserWindows,
    {viewFor} = require('sdk/view/core'),
    {resolve, defer} = require('sdk/core/promise'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {Cc, Ci} = require('chrome'),
    {on, off, once, emit} = require('sdk/event/core'),
    config = require('../config');

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
    set label (val) { // jshint ignore:line
      button.label = val;
    },
    set badge (val) { // jshint ignore:line
      button.badge = val + '';
      button.badgeColor = config.badge.color;
    },
    color: () => button.badgeColor = config.badge.color,
    obj: button
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

  return {
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

exports.get = function (url, headers, data) {
  var d = defer();
  new Request({
    url: url,
    headers: headers || {},
    content: data,
    onComplete: function (response) {
      if (response.status >= 400) {
        d.reject(response.status);
      }
      else {
        d.resolve(response.text);
      }
    }
  })[data ? 'post' : 'get']();
  return d.promise;
};

exports.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      tabs.activeTab.url = url;
    }
    else {
      tabs.open({
        url: url,
        inBackground: typeof inBackground === 'undefined' ? false : inBackground
      });
    }
  },
  list: function () {
    var temp = [];
    for each (var tab in tabs) {
      temp.push(tab);
    }
    return resolve(temp);
  },
  options: function () {
    for each (var tab in tabs) {
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
  var workers = [], options_arr = [];
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
exports.observer = function (callback) {
  let httpRequestObserver = {
    observe: function(subject, topic) {
      if (topic === 'http-on-modify-request') {
        try {
          let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
          let loadInfo = httpChannel.loadInfo;
          if (loadInfo) {
            let rawtype = loadInfo.externalContentPolicyType !== undefined ?
              loadInfo.externalContentPolicyType : loadInfo.contentPolicyType;
            if (rawtype === 6 || rawtype === 7) {
              callback(httpChannel.URI.spec);
            }
          }

        }
        catch (e) {}
      }
    }
  };
  nsIObserverService.addObserver(httpRequestObserver, 'http-on-modify-request', false);
  unload.when(function () {
    nsIObserverService.removeObserver(httpRequestObserver, 'http-on-modify-request');
  });
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
