/*******************************************************************************
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2017 Alexis Jaksone

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

'use strict';

var log = document.getElementById('status');

function restore () {
  chrome.storage.local.get({
    width: 800,
    height: 520,
    timeout: 10,
    color: '#485a81',
    accurate: false,
    faqs: true
  }, (prefs) => {
    Object.keys(prefs).forEach (name => {
      document.getElementById(name)[typeof prefs[name] === 'boolean' ? 'checked' : 'value'] = prefs[name];
    });
  });
}

function save () {
  let prefs = {
    width: Math.min(800, Math.max(document.getElementById('width').value, 300)),
    height: Math.min(800, Math.max(document.getElementById('height').value, 300)),
    timeout: Math.max(document.getElementById('timeout').value, 3),
    color: document.getElementById('color').value,
    accurate: document.getElementById('accurate').checked,
    faqs: document.getElementById('faqs').checked
  };

  chrome.storage.local.set(prefs, () => {
    log.textContent = 'Options saved.';
    setTimeout(() => log.textContent = '', 750);
    restore();
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', () => {
  try {
    save();
  }
  catch (e) {
    log.textContent = e.message;
    setTimeout(() => log.textContent = '', 750);
  }
});
