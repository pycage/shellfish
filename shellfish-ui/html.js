/*******************************************************************************
This file is part of the Shellfish UI toolkit.
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
 * **Module ID:** `shellfish/html`
 * 
 * This module provides the HTML-oriented Shellfish API.
 * 
 * @example <caption>Importing in JavaScript</caption>
 * shRequire("shellfish/html", html =>
 * {
 *     const myLabel = new html.Label();
 *     myLabel.color = myLabel.rgb(0, 0, 1);
 *     myLabel.text = "Some text goes here";
 * });
 * 
 * @example <caption>Instantiating and parameterizing a class in Shui code</caption>
 * 
 * require "shellfish/html";
 * 
 * Label {
 *     color: rgb(0, 0, 1)
 *     text: "Some text goes here"
 * }
 * 
 * @namespace html
 */

exports.__id = "shellfish/html";

const css = [
    "shellfish",
    "icons",
    "core-icons"
];

const mods = [
    "box",
    "cameraview",
    "canvas",
    "capabilities",
    "console",
    "davfs",
    "document",
    "draggable",
    "droparea",
    "fileselector",
    "fpsmeter",
    "frametimer",
    "gamepad",
    "gamepadmodel",
    "gradientstop",
    "history",
    "html",
    "image",
    "item",
    "label",
    "lineargradient",
    "listview",
    "localstorage",
    "mousebox",
    "numberanimation",
    "offlinefs",
    "parallelanimation",
    "ruler",
    "sequentialanimation",
    "syntaxhighlighter",
    "textarea",
    "textinput",
    "tilemap",
    "tileset",
    "video",
    "waitaction",
    "websocket"
];

shRequire(css.map(s => __dirname + "/style/" + s + ".css"), () =>
{
    shRequire(mods.map(m => __dirname + "/html/" + m + ".js"), (...args) =>
    {
        args.forEach(a => exports.include(a));
    });
});
