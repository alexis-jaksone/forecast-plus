var app = {};

app.Promise = Promise;

app.storage = {
  read: function (id) {
    return localStorage[id] || null;
  },
  write: function (id, data) {
    localStorage[id] = data + "";
  }
};

app.get = function (url, headers, data) {
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
  xhr.open(data ? "POST" : "GET", url, true);
  for (var id in headers) {
    xhr.setRequestHeader(id, headers[id]);
  }
  if (data) {
    var arr = [];
    for(e in data) {
      arr.push(e + "=" + data[e]);
    }
    data = arr.join("&");
  }
  xhr.send(data ? data : "");
  return d.promise;
}

app.button = (function () {
  var callback;
  chrome.browserAction.onClicked.addListener(function(tab) {
    if (callback) {
      callback();
    }
  });
  return {
    onCommand: function (c) {
      callback = c;
    },
    onContext: function () {},
    set label (val) {
      chrome.browserAction.setTitle({
        title: val
      })
    },
    set badge (val) {
      chrome.browserAction.setBadgeText({
        text: (val ? val : "") + ""
      });
    }
  }
})();

app.popup = {
  send: function (id, data) {
    chrome.extension.sendRequest({method: id, data: data});
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender, callback2) {
      if (request.method == id && !sender.tab) {
        callback(request.data);
      }
    });
  }
}

app.tab = {
  open: function (url, inBackground, inCurrent) {
    if (inCurrent) {
      chrome.tabs.update(null, {url: url});
    }
    else {
      chrome.tabs.create({
        url: url,
        active: typeof inBackground === 'undefined' ? true : !inBackground
      });
    }
  },
  list: function () {
    var d = app.Promise.defer();
    chrome.tabs.query({
      currentWindow: false
    },function(tabs) {
      d.resolve(tabs);
    });
    return d.promise;
  }
}

app.version = function () {
  return chrome[chrome.runtime && chrome.runtime.getManifest ? "runtime" : "extension"].getManifest().version;
};

app.timer = window;

app.DOMParser = DOMParser;

app.options = {
  send: function (id, data) {
    chrome.tabs.query({}, function (tabs) {
      tabs.forEach(function (tab) {
        if (tab.url.indexOf("options/index.html") !== -1) {
          chrome.tabs.sendMessage(tab.id, {method: id, data: data}, function () {});
        }
      });
    });
  },
  receive: function (id, callback) {
    chrome.extension.onRequest.addListener(function(request, sender, c) {
      if (request.method == id && sender.tab && sender.tab.url.indexOf("options/index.html") !== -1) {
        callback(request.data);
      }
    });
  }
};

app.observer = function (callback) {
  var listener = function (details) {
    callback(details.url, details.type === 'main_frame' || details.type === 'sub_frame');
  };
  chrome.webRequest.onBeforeRequest.addListener(listener, {
    urls: ['<all_urls>']
  }, ['blocking']);
}

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
