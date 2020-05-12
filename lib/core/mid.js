/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2020 Martin Grimme <martin.grimme@gmail.com>

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
 * **Module ID:** `shellfish/mid`
 * 
 * This module provides the mid-level Shellfish API.
 * 
 * The mid-level API is an object-oriented API with classes for UI elements and
 * abstract objects (with no UI representation, such as a timer).
 * 
 * New abstract objects are created by deriving from the mid.Object class.
 * 
 * New UI elements are created by deriving from the mid.Item class.
 * 
 * @module mid
 */

exports.__id = "shellfish/mid";

const mods = [
    "box",
    "cameraview",
    "canvas",
    "document",
    "draggable",
    "droparea",
    "fileselector",
    "fsmodel",
    "gradientstop",
    "image",
    "item",
    "label",
    "lineargradient",
    "listmodel",
    "listview",
    "mousebox",
    "numberanimation",
    "object",
    "offlinefs",
    "parallelanimation",
    "repeater",
    "ruler",
    "scriptaction",
    "sequentialanimation",
    "textarea",
    "textinput",
    "timer"
];

shRequire(mods.map(m => __dirname + "/mid/" + m + ".js"), function ()
{
    for (var i = 0; i < arguments.length; ++i)
    {
        exports.include(arguments[i]);
    }
});
