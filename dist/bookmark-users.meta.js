// ==UserScript==
// @name        Bookmark Users
// @version     1.4.3
// @author      Martijn Pieters
// @description Shows what user bookmarked a question. Fetches the bookmarking users from the StackExchange data explorer (data can be up to a week old)
// @homepage    https://github.com/mjpieters/SO-userscripts
// @supportURL  https://github.com/mjpieters/SO-userscripts/issues
// @match       http*://*.stackoverflow.com/questions/*
// @match       http*://*.serverfault.com/questions/*
// @match       http*://*.superuser.com/questions/*
// @match       http*://*.askubuntu.com/questions/*
// @match       http*://*.mathoverflow.net/questions/*
// @match       http*://*.stackexchange.com/questions/*
// @namespace   https://github.com/mjpieters/SO-userscripts
// @downloadURL https://github.com/mjpieters/SO-userscripts/raw/main/dist/bookmark-users.user.js
// @updateURL   https://github.com/mjpieters/SO-userscripts/raw/main/dist/bookmark-users.meta.js
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @connect     data.stackexchange.com
// ==/UserScript==
