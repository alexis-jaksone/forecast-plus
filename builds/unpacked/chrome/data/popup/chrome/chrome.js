/* globals chrome */
'use strict';

var background = {
  send: function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function (request) {
      if (request.method === id) {
        callback(request.data);
      }
    });
  }
};

var manifest = {
  url: chrome.extension.getURL('')
};

