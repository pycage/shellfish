/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
 * **Module ID:** `shellfish/core`
 * 
 * This module provides the Shellfish Core API.
 *
 * @namespace core
 */

exports.__id = "shellfish/core";
exports.SHELLFISH_BUILD = "%PKG_GIT_SHORTHASH%-%PKG_DATE%";

const mods = [
    "fengshui",
    "declarative",
    "core/util/compat",
    "core/util/matrix",
    "core/util/mime",
    "core/util/vec",
    "core/util/warehouse",
    "core/util/xmlsax"
];

const includes = [
    "action",
    "filestorage",
    "filesystem",
    "fsmodel",
    "listmodel",
    "object",
    "parallelaction",
    "repeater",
    "rpcproxy",
    "scriptaction",
    "sequentialaction",
    "threadpool",
    "timer",
    "waitaction",
    "wasm"
];

shRequire(mods.map(m => __dirname + "/" + m + ".js"), () =>
{
    shRequire(includes.map(m => __dirname + "/core/" + m + ".js"), (...args) =>
    {
        args.forEach(a => exports.include(a));
    });
});
