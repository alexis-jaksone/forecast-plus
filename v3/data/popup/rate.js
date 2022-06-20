chrome.storage.local.get({
  'rate': true,
  'crate': 0
}, prefs => {
  document.getElementById('rate').dataset.hide = prefs['rate'] === false || prefs.crate < 5 || Math.random() < 0.5;

  if (prefs.crate < 5) {
    prefs.crate += 1;
    chrome.storage.local.set({crate: prefs.crate});
  }
});

document.getElementById('rate').onclick = () => {
  let url = 'https://chrome.google.com/webstore/detail/weather-forecast-plus/ofobaelkgcpicbdoabokjlnmdcbjellg/reviews/';
  if (/Edg/.test(navigator.userAgent)) {
    url = 'https://microsoftedge.microsoft.com/addons/detail/phklfmbdnakdekionmpfdiihnmijfpnl';
  }
  else if (/Firefox/.test(navigator.userAgent)) {
    url = 'https://addons.mozilla.org/firefox/addon/weather-forecast-revived/';
  }
  else if (/OPR/.test(navigator.userAgent)) {
    url = 'https://addons.opera.com/extensions/details/weather-forecast-plus/';
  }

  chrome.storage.local.set({
    'rate': false
  }, () => chrome.tabs.create({
    url
  }));
};
