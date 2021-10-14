/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2021 Martin Grimme <martin.grimme@gmail.com>

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
 * This module provides the mid-level Shellfish API.
 * 
 * This is an object-oriented API with classes for UI elements but
 * also for abstract objects that have no UI representation (e.g. {@link mid.Timer Timer}).
 * 
 * New abstract objects may be created by deriving from the {@link mid.Object Object class}.
 * 
 * New UI elements may be created by deriving from the {@link mid.Item Item class}.
 * 
 * This module is available by default in Shui code as `mid` and does not have to be
 * imported explicitly. The classes listed here are directly available to Shui code.
 * 
 * ### Lists and Models
 * * {@link mid.ListModel} - A model for storing sequential data
 * * {@link mid.ListView} - Display lists or grids fed from a list model
 * * {@link mid.Repeater} - Repeat a delegate element according to a list model
 * 
 * ### Animation
 * * {@link mid.Animation} - Animation base class
 * * {@link mid.NumberAnimation} - Animate numeric properties
 * * {@link mid.ParallelAnimation} - Run animations in parallel
 * * {@link mid.SequentialAnimation} - Run animation in sequence
 * * {@link mid.ScriptAction} - Run code scripts during an animation
 * * {@link mid.WaitAction} - Halt an animation until a condition is fulfilled
 * 
 * ### Timer
 * * {@link mid.Timer} - Run a timer for repeated or timed actions
 * * {@link mid.FrameTimer} - Run a timer in sync with the screen refresh rate
 * 
 * ### Data Storage
 * * {@link mid.FileSelector} - Open a file selection dialog
 * * {@link mid.Filesystem} - Filesystem implementation base class
 * * {@link mid.DavFS} - Access WebDAV filesystems
 * * {@link mid.OfflineFS} - Access a private offline filesystem (based on Indexed DB)
 * * {@link mid.LocalStorage} - Persist property values across sessions using the HTML5 local storage.
 * * {@link mid.FileStorage} - Persist property values across sessions using a file on a {@link mid.Filesystem}.
 * 
 * ### Drag and Drop
 * * {@link mid.Draggable} - Make an element draggable by mouse
 * * {@link mid.DropArea} - Accept dropping draggable items, even from external sources
 * 
 * ### Multimedia
 * * {@link mid.Canvas} - Draw freely on a HTML5 2D canvas
 * * {@link mid.CameraView} - Access camera devices
 * * {@link mid.Video} - Play video files
 * * {@link mid.Gamepad} - Access gamepad devices and similar input controls
 * * {@link mid.GamepadModel} - Enumerate and monitor the connected gamepad devices
 * * {@link mid.FpsMeter} - Measure the current screen refresh rate
 * * {@link mid.Html} - Render generic HTML
 * 
 * ### Tile-based Map Rendering
 * * {@link mid.TileSet} - Create tile sets from images
 * * {@link mid.TileMap} - Render a scrollable map of tiles on screen
 * 
 * ### Navigation
 * * {@link mid.History} - Manage the document history.
 * 
 * ### Threads and Concurrency
 * * {@link mid.ThreadPool} - Run asynchronous tasks in a thread pool
 * 
 * @example <caption>Importing in JavaScript</caption>
 * shRequire("shellfish/mid", mid =>
 * {
 *     const myLabel = new mid.Label();
 *     myLabel.color = myLabel.rgb(0, 0, 1);
 *     myLabel.text = "Some text goes here";
 * });
 * 
 * @example <caption>Instantiating and parameterizing a class in Shui code</caption>
 * Label {
 *     color: rgb(0, 0, 1)
 *     text: "Some text goes here"
 * }
 * 
 * @namespace mid
 */

exports.__id = "shellfish/mid";
exports.SHELLFISH_BUILD = "%PKG_GIT_SHORTHASH%-%PKG_DATE%";

const mods = [
    "util/matrix",
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
    "filestorage",
    "fpsmeter",
    "frametimer",
    "fsmodel",
    "gamepad",
    "gamepadmodel",
    "gradientstop",
    "history",
    "html",
    "image",
    "item",
    "label",
    "lineargradient",
    "listmodel",
    "listview",
    "localstorage",
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
    "threadpool",
    "tilemap",
    "tileset",
    "timer",
    "video",
    "waitaction",
    "wasm",
    "websocket"
];

shRequire(mods.map(m => __dirname + "/mid/" + m + ".js"), function ()
{
    for (var i = 0; i < arguments.length; ++i)
    {
        exports.include(arguments[i]);
    }
});
