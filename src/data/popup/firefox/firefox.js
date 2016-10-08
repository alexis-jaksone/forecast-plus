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
/* globals self */
'use strict';

var background = {
  send: self.port.emit,
  receive: self.port.on
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

self.port.on('show', () => background.send('load'));

window.addEventListener('online', () => background.send('online'), false);
