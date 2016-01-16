'use strict';

var self           = require('sdk/self'),
    data           = self.data,
    sp             = require('sdk/simple-prefs'),
    Request        = require('sdk/request').Request,
    prefs          = sp.prefs,
    pageMod        = require('sdk/page-mod'),
    tabs           = require('sdk/tabs'),
    timers         = require('sdk/timers'),
    loader         = require('@loader/options'),
    array          = require('sdk/util/array'),
    unload         = require('sdk/system/unload'),
    {ToggleButton} = require('sdk/ui/button/toggle'),
    {Cc, Ci, Cu}   = require('chrome'),
    config         = require('../config');

var {Promise} = Cu.import('resource://gre/modules/Promise.jsm');

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
    },
    obj: button
  };
})();

exports.popup = (function () {
  var popup = require('sdk/panel').Panel({
    contentURL: data.url('./popup/index.html'),
    contentScriptFile: [
      data.url('./popup/firefox/firefox.js'),
      data.url('./popup/index.js'),
      data.url('./content_script/inject.js')
    ],
    contentStyleFile : data.url('./content_script/inject.css'),
    contentScriptOptions: {
      base: loader.prefixURI + loader.name + '/'
    }
  });
  popup.on('show', function () {
    popup.port.emit('show');
  });
  popup.on('hide', function () {
    popup.contentURL = 'about:blank';
    popup.contentURL = data.url('./popup/index.html');
    exports.button.obj.state('window', {
      checked: false
    });
  });

  return {
    send: function (id, data) {
      popup.port.emit(id, data);
    },
    receive: function (id, callback) {
      popup.port.on(id, callback);
    },
    show: function () {
      popup.show({
        width: config.popup.width,
        height: config.popup.height,
        position: exports.button.obj
      });
    }
  };
})();

exports.storage = {
  read: function (id) {
    return (prefs[id] || prefs[id] + '' === 'false') ? (prefs[id] + '') : null;
  },
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
  var d = new Promise.defer();
  new Request({
    url: url,
    headers: headers || {},
    content: data,
    onComplete: function (response) {
      d.resolve(response.text);
    }
  })[data ? 'post' : 'get']();
  return d.promise;
}

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
    return Promise.resolve(temp);
  }
};

exports.version = function () {
  return self.version;
};

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

sp.on('openOptions', function() {
  exports.tab.open(data.url('options/index.html'));
});
unload.when(function () {
  exports.tab.list().then(function (tabs) {
    tabs.forEach(function (tab) {
      if (tab.url.indexOf(data.url('')) === 0) {
        tab.close();
      }
    });
  });
});

/////
exports.observer = function (callback) {
  let httpRequestObserver = {
    observe: function(subject, topic) {
      if (topic === 'http-on-modify-request') {
        try {
          let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
          let url = httpChannel.URI.spec;

          callback(url);
        }
        catch (e) {}
      }
    },
    get observerService() {
      return Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
    },
    register: function() {
      this.observerService.addObserver(this, 'http-on-modify-request', false);
    },
    unregister: function() {
      this.observerService.removeObserver(this, 'http-on-modify-request');
    }
  };
  httpRequestObserver.register();
  unload.when(function () {
    httpRequestObserver.unregister();
  });
};

//startup
exports.startup = function (callback) {
  if (self.loadReason === 'install' || self.loadReason === 'startup') {
    callback();
  }
};
