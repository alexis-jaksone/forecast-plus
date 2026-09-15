/*
    Weather Underground (Forecast Plus) - local and long range weather forecast.

    Copyright (C) 2014-2022 Alexis Jaksone

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

    GitHub: https://github.com/alexis-jaksone/forecast-plus/
*/

'use strict';

// homepage
if (location.pathname === '/') {
  const find = async () => {
    for (let n = 0; n < 10; n += 1) {
      for (const link of document.links) {
        if (link.href.includes('HomeCardCurrentCondition')) {
          chrome.runtime.sendMessage({
            method: 'validate',
            href: link.href
          });
          return;
        }
      }
      // Try to find the first station
      const re = /\/weather\/[^/]+\/[^/]+\/[^/]+\/([A-Z0-9]+)$/;
      for (const link of document.links) {
        if (re.test(link.pathname)) {
          chrome.runtime.sendMessage({
            method: 'validate',
            href: link.href
          });
          return;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const prefs = await chrome.storage.local.get({
      url: 'https://www.wunderground.com/'
    });
    // only find station if there it is not set yet
    if (prefs.url === 'https://www.wunderground.com/') {
      find();
    }
    // or if we dont know the geocode
    else if (prefs.url.includes('format=json')) {
      try {
        const url = new URL(prefs.url);
        const geocode = url.searchParams.get('geocode');
        if (geocode === '0,0') {
          find();
        }
      }
      catch (e) {
        find();
      }
    }
  });
}
else {
  chrome.runtime.sendMessage({
    method: 'validate',
    href: location.href
  });
}
