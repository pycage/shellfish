/*******************************************************************************
This file is part of Shellfish.
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

/* This module contains internal compatiblity function to cover multiple
 * platforms.
 */

const isWeb = (typeof window !== "undefined" && typeof navigator !== "undefined");
const isNode = (typeof process !== "undefined" && typeof process.versions.node !== "undefined");

const modWorkerThreads = isNode ? require("worker_threads") : null;
const modFs = isNode ? require("fs") : null;
const modOs = isNode ? require("os") : null;


function addEventListener(target, event, callback, options)
{
    if (isWeb)
    {
        target.addEventListener(event, callback, options);
    }
    else
    {
        target.on(event, callback);
    }
}
exports.addEventListener = addEventListener;

function createWorkerThread(code)
{
    if (isWeb)
    {
        const blob = new Blob([code], { type: "application/javascript" });
        const url = URL.createObjectURL(blob);
        const w = new Worker(url);
        URL.revokeObjectURL(url);
        return w;
    }
    else if (isNode)
    {
        const w = new modWorkerThreads.Worker(code, { eval: true });
        return w;
    }
}
exports.createWorkerThread = createWorkerThread;

function extractMessageData(obj)
{
    if (isWeb)
    {
        return obj.data;
    }
    else
    {
        return obj;
    }
}
exports.extractMessageData = extractMessageData;

function hardwareConcurrency()
{
    if (isWeb)
    {
        return navigator.hardwareConcurrency || 1;
    }
    else if (isNode)
    {
        return modOs.cpus().length;
    }
}
exports.hardwareConcurrency = hardwareConcurrency;