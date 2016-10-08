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
/* globals config */
'use strict';

function EventEmitter () {
  this.callbacks = {};
}
EventEmitter.prototype.on = function (name, callback) {
  this.callbacks[name] = this.callbacks[name] || [];
  this.callbacks[name].push(callback);
};
EventEmitter.prototype.emit = function (name, value) {
  (this.callbacks[name] || []).forEach(function (callback) {
    try {
      callback(value);
    }
    catch (e) {
      console.error(e);
    }
  });
};

var app = new EventEmitter();
var canvas = document.createElement('canvas');
document.body.appendChild(canvas);
var image = document.createElement('img');
image.crossOrigin = 'Anonymous';
document.body.appendChild(image);

if (!Promise.defer) {
  Promise.defer = function () {
    let deferred = {};
    let promise = new Promise(function (resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject  = reject;
    });
    deferred.promise = promise;
    return deferred;
  };
}
app.Promise = Promise;

app.storage = {
  read: (id) => localStorage[id] || null,
  write: (id, data) => localStorage[id] = data + ''
};

app.get = function (url) {
  var xhr = new XMLHttpRequest();
  var d = app.Promise.defer();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 400) {
        d.reject(xhr.status);
      }
      else {
        d.resolve(xhr.responseText);
      }
    }
  };
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Cache-Control', 'no-cache');

  xhr.send();
  return d.promise;
};

app.button = {
  set label (val) { // jshint ignore:line
    chrome.browserAction.setTitle({
      title: val
    });
  },
  set badge (val) { // jshint ignore:line
    chrome.browserAction.setBadgeText({
      text:  isNaN(val) ? '' : val + ''
    });
    chrome.browserAction.setBadgeBackgroundColor({
      color: config.badge.color
    });
  },
  color: () => chrome.browserAction.setBadgeBackgroundColor({
    color: config.badge.color
  }),
  icon: (url) => {
    let ctx = canvas.getContext('2d');
    image.onload = function() {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      if (canvas.width && canvas.height) {
        ctx.drawImage(image, 0, 0);
        chrome.browserAction.setIcon({
          imageData: ctx.getImageData(0, 0, canvas.width, canvas.height)
        });
      }
    };
    image.src = url;
  }
};

app.online = (c) => window.addEventListener('online', c, false);

app.popup = {
  send: (method, data) => chrome.extension.sendRequest({method, data}),
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender) {
      if (request.method === id && !sender.tab) {
        callback(request.data);
      }
    });
  },
  hide: function () {}
};

app.tab = {
  open: (url) => chrome.tabs.create({url}),
  options: function () {
    let url = chrome.extension.getURL('data/options/index.html');

    chrome.tabs.query({url}, function (tabs) {
      if (tabs.length) {
        chrome.tabs.update(tabs[0].id, {active: true});
      }
      else {
        chrome.tabs.create({url});
      }
    });
  }
};

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? 'runtime' : 'extension'].getManifest().version;
};

app.timer = window;
app.DOMParser = DOMParser;
app.webRequest = chrome.webRequest;

app.options = {
  send: (method, data) => chrome.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      if (tab.url.indexOf('options/index.html') !== -1) {
        chrome.tabs.sendMessage(tab.id, {method, data}, function () {});
      }
    });
  }),
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender) {
      if (request.method === id && sender.tab && sender.tab.url.indexOf('options/index.html') !== -1) {
        callback(request.data);
      }
    });
  }
};

// startup
app.startup = (function () {
  var loadReason, callback;
  function check () {
    if (loadReason === 'startup' || loadReason === 'install') {
      if (callback) {
        callback();
      }
    }
  }
  chrome.runtime.onInstalled.addListener(function (details) {
    loadReason = details.reason;
    check();
  });
  chrome.runtime.onStartup.addListener(function () {
    loadReason = 'startup';
    check();
  });
  return function (c) {
    callback = c;
    check();
  };
})();
