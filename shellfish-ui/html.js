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
 * This module provides the HTML-oriented Shellfish API.
 * 
 * This is an object-oriented API with classes for UI elements but
 * also for abstract objects that have no UI representation (e.g. {@link html.Timer Timer}).
 * 
 * New abstract objects may be created by deriving from the {@link html.Object Object class}.
 * 
 * New UI elements may be created by deriving from the {@link html.Item Item class}.
 * 
 * This module is available by default in Shui code as `mid` and does not have to be
 * imported explicitly. The classes listed here are directly available to Shui code.
 * 
 * ### Lists and Models
 * * {@link html.ListModel} - A model for storing sequential data
 * * {@link html.ListView} - Display lists or grids fed from a list model
 * * {@link html.Repeater} - Repeat a delegate element according to a list model
 * 
 * ### Animation
 * * {@link html.Animation} - Animation base class
 * * {@link html.NumberAnimation} - Animate numeric properties
 * * {@link html.ParallelAnimation} - Run animations in parallel
 * * {@link html.SequentialAnimation} - Run animation in sequence
 * * {@link html.ScriptAction} - Run code scripts during an animation
 * * {@link html.WaitAction} - Halt an animation until a condition is fulfilled
 * 
 * ### Timer
 * * {@link html.Timer} - Run a timer for repeated or timed actions
 * * {@link html.FrameTimer} - Run a timer in sync with the screen refresh rate
 * 
 * ### Data Storage
 * * {@link html.FileSelector} - Open a file selection dialog
 * * {@link html.Filesystem} - Filesystem implementation base class
 * * {@link html.DavFS} - Access WebDAV filesystems
 * * {@link html.OfflineFS} - Access a private offline filesystem (based on Indexed DB)
 * * {@link html.LocalStorage} - Persist property values across sessions using the HTML5 local storage.
  * * {@link html.FSModel} - A list model for listing file system contents.
 * 
 * ### Drag and Drop
 * * {@link html.Draggable} - Make an element draggable by mouse
 * * {@link html.DropArea} - Accept dropping draggable items, even from external sources
 * 
 * ### Multimedia
 * * {@link html.Canvas} - Draw freely on a HTML5 2D canvas
 * * {@link html.CameraView} - Access camera devices
 * * {@link html.Video} - Play video files
 * * {@link html.Gamepad} - Access gamepad devices and similar input controls
 * * {@link html.GamepadModel} - Enumerate and monitor the connected gamepad devices
 * * {@link html.FpsMeter} - Measure the current screen refresh rate
 * * {@link html.Html} - Render generic HTML
 * 
 * ### Tile-based Map Rendering
 * * {@link html.TileSet} - Create tile sets from images
 * * {@link html.TileMap} - Render a scrollable map of tiles on screen
 * 
 * ### Navigation
 * * {@link html.History} - Manage the document history.
 * 
 * ### Text Processing
 * * {@link html.SyntaxHighlighter} - Apply syntax highlighting.
 * * {@link html.SyntaxToken} - Define tokens for syntax highlighting.
 * 
 * ### Threads and Concurrency
 * * {@link html.ThreadPool} - Run asynchronous tasks in a thread pool
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
 * Label {
 *     color: rgb(0, 0, 1)
 *     text: "Some text goes here"
 * }
 * 
 * @namespace html
 */

exports.__id = "shellfish/html";
exports.SHELLFISH_BUILD = "%PKG_GIT_SHORTHASH%-%PKG_DATE%";

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
    "scriptaction",
    "sequentialanimation",
    "syntaxhighlighter",
    "textarea",
    "textinput",
    "tilemap",
    "tileset",
    "video",
    "waitaction",
    "websocket",
];

shRequire(css.map(s => __dirname + "/style/" + s + ".css"), () =>
{
    shRequire(mods.map(m => __dirname + "/html/" + m + ".js"), (...args) =>
    {
        args.forEach(a => exports.include(a));
    });
});
