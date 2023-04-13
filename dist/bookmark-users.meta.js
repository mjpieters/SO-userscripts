// ==UserScript==
// @name        Bookmark Users
// @description Shows what user bookmarked a question. Fetches the bookmarking users from the StackExchange data explorer (data can be up to a week old)
// @version     1.5.2
// @author      Martijn Pieters
// @homepage    https://github.com/mjpieters/SO-userscripts/tree/main/scripts/bookmark-users
// @supportURL  https://github.com/mjpieters/SO-userscripts/issues?q=is:issue+is%3Aopen+label:bookmark-users
// @match       http*://*.stackoverflow.com/questions/*
// @match       http*://*.serverfault.com/questions/*
// @match       http*://*.superuser.com/questions/*
// @match       http*://*.askubuntu.com/questions/*
// @match       http*://*.mathoverflow.net/questions/*
// @match       http*://*.stackexchange.com/questions/*
// @connect     data.stackexchange.com
// @downloadURL https://github.com/mjpieters/SO-userscripts/releases/latest/download/bookmark-users.user.js
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @namespace   https://github.com/mjpieters/SO-userscripts
// @updateURL   https://github.com/mjpieters/SO-userscripts/releases/latest/download/bookmark-users.meta.js
// ==/UserScript==
