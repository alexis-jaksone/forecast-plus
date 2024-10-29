/**
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

/* global sax */

if (typeof importScripts !== 'undefined') {
  self.importScripts('sax.js');
}

self.log = (...args) => console.log(new Date().toISOString(), ...args);

self.query = (code, query, stop = true) => {
  return new Promise((resolve, reject) => {
    const results = [];
    let tree;

    class Node {
      constructor(name, attributes) {
        this.name = name;
        this.attributes = attributes || {};
        this.children = [];
      }
      closest(name) {
        let p = this.parent;
        while (p && p.name !== name) {
          p = p.parent;
        }
        return p;
      }
      child(query, reverse = false) {
        const once = node => {
          if (node.children) {
            for (const n of (reverse ? [...node.children].reverse() : node.children)) {
              if ((query.name ? query.name === n.name : true) && (query.match ? query.match(n) : true)) {
                return n;
              }
              const r = once(n);
              if (r) {
                return r;
              }
            }
          }
        };
        return once(this);
      }
    }
    const parser = sax.parser(false, {});
    parser.onopentag = function(node) {
      const child = new Node(node.name, node.attributes);
      if (!tree) {
        tree = child;
      }
      else {
        tree.children.push(child);
        child.parent = tree;
        tree = child;
      }
    };
    parser.onclosetag = function(name) {
      if ((query.name ? query.name === tree.name : true) && (query.match ? query.match(tree) : true)) {
        results.push(tree);
        if (stop) {
          resolve(tree);
          throw Error('done');
        }
      }
      if (name === tree.name) {
        if (tree.parent) {
          tree = tree.parent;
        }
      }
    };
    parser.ontext = text => tree.text = text;
    parser.onend = () => resolve(stop ? undefined : results);
    parser.onerror = e => reject(e);
    parser.write(code).end();
  });
};

/* badge color */
{
  const callback = () => {
    chrome.storage.local.get({
      color: '#485a81'
    }, prefs => chrome.action.setBadgeBackgroundColor({
      color: prefs.color
    }));
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
