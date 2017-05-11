// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
    // Query filter to be passed to chrome.tabs.query - see
    // https://developer.chrome.com/extensions/tabs#method-query
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
        // chrome.tabs.query invokes the callback with a list of tabs that match the
        // query. When the popup is opened, there is certainly a window and at least
        // one tab, so we can safely assume that |tabs| is a non-empty array.
        // A window can only have one active tab at a time, so the array consists of
        // exactly one tab.
        var tab = tabs[0];

        // A tab is a plain object that provides information about the tab.
        // See https://developer.chrome.com/extensions/tabs#type-Tab
        var url = tab.url;

        // tab.url is only available if the "activeTab" permission is declared.
        // If you want to see the URL of other tabs (e.g. after removing active:true
        // from |queryInfo|), then the "tabs" permission is required to see their
        // "url" properties.
        console.assert(typeof url == 'string', 'tab.url should be a string');

        callback(url);
    });

    // Most methods of the Chrome extension APIs are asynchronous. This means that
    // you CANNOT do something like this:
    //
    // var url;
    // chrome.tabs.query(queryInfo, function(tabs) {
    //   url = tabs[0].url;
    // });
    // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} fullURL - Original long URL.
 * @param {function(string)} callback - Called when url is shortened.
 *   The callback function gets the shortened URL., width and height of the image.
 * @param {function(string)} errorCallback - Called when the URL is not shortened.
 *   The callback gets a string that describes the failure reason.
 */
function getShortUrl(fullURL, callback, errorCallback) {
    // Baidu Short URL(dwz.cn)
    // http://dwz.cn/create.php
    // url=<http://some.longurl.com/xxxxxxxxxxxxxxxxxxxxxxxxx>
    var apiUrl = 'http://dwz.cn/create.php';
    var x = new XMLHttpRequest();
    x.open('POST', apiUrl);
    // The Baidu Short URL API responds with JSON, so let Chrome parse it.
    x.responseType = 'json';
    x.onload = function() {
        // Parse and process the response from dwz.cn
        //
        // OK
        // {
        //  "tinyurl": "http:\/\/dwz.cn\/cTGri",
        //  "status": 0,
        //  "longurl": "http://help.baidu.com/question?prod_en=webmaster",
        //  "err_msg": ""
        // }
        //
        // Err
        // {
        //  "status": -1,
        //  "err_msg": "您输入的网址不存在，请重新输入",
        //  "longurl": "http://help.baiduom/qu"
        // }
        //
        // {
        //  "status": -1,
        //  "err_msg": "网址不能为空",
        //  "longurl": ""
        // }
        var response = x.response;
        // console.log('response: ' + JSON.stringify(response));
        if (!response) {
            errorCallback('no response from dwz.cn');
            return;
        }

        // console.log('err_msg: ' + response.err_msg);
        if (response.status !== 0 && response.err_msg.length > 0) {
            errorCallback(response.err_msg);
            return;
        }

        // console.log('tinyurl: ' + response.tinyurl);
        if (response.tinyurl.length == 0) {
            errorCallback('empty tinyurl');
        }
        callback(response.tinyurl);
    };
    x.onerror = function() {
        errorCallback('Network error.');
    };
    data = 'url=' + fullURL
    // console.log('data: ' + data);
    x.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    x.send(data);
}

function renderStatus(statusText) {
    document.getElementById('status').textContent = statusText;
}

function renderShortURL(title, shortURL) {
    content = '\u300A' + title + '\u300B'
    content = content + '\n' + shortURL
    document.getElementById('short-url').value = content;
    document.getElementById('short-url').hidden = false;
    document.getElementById("short-url").select();
}

document.addEventListener('DOMContentLoaded', function() {
    getCurrentTabUrl(function(url) {
        // Put the image URL in Google search.
        renderStatus('Shortenning URL ...');

        // console.log('shortenning url: ' + url);

        getShortUrl(url, function(shortUrl) {

            renderStatus('Copied!');
            // console.log('shortUrl: ' + shortUrl);

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                title = tabs[0].title;
                renderShortURL(title, shortUrl)
            });

            // copy selected field to clipboard
            document.execCommand("Copy", false, null);

        }, function(errorMessage) {
            renderStatus('Get short URL error: ' + errorMessage);
        });
    });
});
