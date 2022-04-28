/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2022 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

"use strict";

/**
 * **Module ID:** `shellfish/3d`
 * 
 * This module provides elements for constructing server applications.
 * The supported environment is currently Node.js.
 * 
 * @namespace server
 */

exports.__id = "shellfish/server";

const includes = [
    "davsession",
    "httpauth",
    "httproute",
    "httpserver",
    "httpsession",
    "localfs",
    "websession"
];

shRequire(includes.map(m => __dirname + "/server/" + m + ".js"), (...args) =>
{
    args.forEach(a => exports.include(a));
});
