/* global self, background */
'use strict';

var isFirefox = typeof self !== 'undefined' && self.port,
    isChrome = typeof chrome !== 'undefined';

/**** wrapper (start) ****/
if (isChrome) {
  window.addEventListener('load', init, false);
}
if (isFirefox) {
  self.port.on('show', init);
}
/**** wrapper (end) ****/

background.receive('load', function (url) {
  if (isFirefox) {
    document.location.href = url;
  }
  else {
    document.querySelector('iframe').src = url;
  }
});
function init () {
  background.send('load');
}

background.receive('resize', function (o) {
  document.body.style.width = o.width + 'px';
  document.body.style.height = (o.height - 20) + 'px';
  document.querySelector('html').style.height = (o.height - 20) + 'px';
});
background.send('resize');
