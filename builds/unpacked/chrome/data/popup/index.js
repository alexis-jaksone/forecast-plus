/* global self, background */
'use strict';

function init () {
  background.send('load');
}

if (typeof self !== 'undefined' && self.port) {
  self.port.on('show', init);
}

if (typeof chrome !== 'undefined') {
  background.receive('resize', function (o) {
    document.body.style.width = o.width + 'px';
    //document.body.style.height = (o.height - 250) + 'px';
    document.querySelector('html').style.height = (o.height - 20) + 'px';
  });
  window.addEventListener('load', init, false);
}

background.receive('load', function (url) {
  document.querySelector('iframe').src = url;
});

background.send('resize');

document.addEventListener('click', function (e) {
  var cmd = e.target.dataset.cmd;
  if (cmd) {
    background.send(cmd);
  }
});
