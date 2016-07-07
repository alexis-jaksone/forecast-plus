/* globals self */
'use strict';

var background = {
  send: function (id, data) {
    self.port.emit(id, data);
  },
  receive: function (id, callback) {
    self.port.on(id, callback);
  }
};

var manifest = {
  url: self.options.base
};

self.port.on('icon', function (url) {
  let img = document.querySelector('img');
  let canvas = document.querySelector('canvas');
  let ctx = canvas.getContext('2d');
  let xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (this.status === 200) {
      let xml = xhr.responseXML;
      if (xml) {
        let svg = xml.querySelector('svg');
        let viewBox = svg.getAttribute('viewBox');
        let width = 52;
        let height = 52;
        let tmp = /(\d+) (\d+) (\d+) (\d+)/.exec(viewBox);
        if (tmp && tmp.length) {
          width = +tmp[3];
          height = +tmp[4];
        }
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        img.onload = function() {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          if (canvas.width && canvas.height) {
            ctx.drawImage(img, 0, 0);
            self.port.emit('icon', canvas.toDataURL());
          }
        };
        img.src = URL.createObjectURL(new Blob([svg.outerHTML], {
          type: 'image/svg+xml;charset=utf-8'
        }));
      }
    }
  };
  xhr.send();
});
