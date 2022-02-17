/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/core"], function (core)
{
    /**
     * Class for testing the capabilities of the runtime environment.
     * 
     * @memberof mid
     * @extends core.Object
     * 
     * @property {bool} atomics - [readonly] Whether atomics are supported.
     * @property {bool} canvas - [readonly] Whether canvas is supported.
     * @property {bool} crossOriginIsolated - [readonly] Whether the environment is cross-origin-isolated.
     * @property {bool} fullscreen - [readonly] Whether fullscreen mode is supported.
     * @property {bool} gamePad - [readonly] Whether game pads and other game controllers are supported.
     * @property {bool} indexedDB - [readonly] Whether Indexed DB is supported.
     * @property {bool} mediaDevices - [readonly] Whether media devices are supported.
     * @property {bool} pointerEvent - [readonly] Whether pointer events are supported.
     * @property {bool} webAssembly - [readonly] Whether Web Assembly is supported.
     * @property {bool} webGL - [readonly] Whether WebGL is supported.
     * @property {bool} webGL2 - [readonly] Whether WebGL version 2 is supported.
     * @property {bool} webWorkers - [readonly] Whether Web Workers are supported.
     * @property {bool} webXR - [readonly] Whether WebXR for Virtual Reality and Augmented Reality is supported.
     */
    class Capabilities extends core.Object
    {
        constructor()
        {
            super();
        }

        get atomics()
        {
            return !! window.Atomics;
        }

        get canvas()
        {
            const cnv = document.createElement("canvas");
            return !! cnv.getContext;
        }

        get crossOriginIsolated()
        {
            return window.crossOriginIsolated !== undefined ? window.crossOriginIsolated : false;
        }

        get fullscreen()
        {
            return document.fullscreenElement !== undefined;
        }

        get gamePad()
        {
            return !! navigator.getGamepads;
        }

        get indexedDB()
        {
            return !! (window.indexedDB ||
                       window.mozIndexedDB ||
                       window.webkitIndexedDB ||
                       window.msIndexedDB);
        }

        get mediaDevices()
        {
            return !! navigator.mediaDevices;
        }

        get pointerEvent()
        {
            return !! window.PointerEvent;
        }

        get sharedArrayBuffer()
        {
            return !! window.SharedArrayBuffer;
        }

        get webAssembly()
        {
            return !! window.WebAssembly;
        }

        get webGL()
        {
            if (this.canvas)
            {
                const cnv = document.createElement("canvas");
                const ctx = cnv.getContext("webgl");
                return !! ctx;
            }
            return false;
        }

        get webGL2()
        {
            if (this.canvas)
            {
                const cnv = document.createElement("canvas");
                const ctx = cnv.getContext("webgl2");
                return !! ctx;
            }
            return false;
        }

        get webWorkers()
        {
            return !! window.Worker;
        }

        get webXR()
        {
            return !! navigator.xr;
        }
    }
    exports.Capabilities = Capabilities;
});