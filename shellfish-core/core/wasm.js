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

/**
 * A generic C++ STL vector: `std::vector<T>`.
 * @typedef StdVector
 * @memberof html.Wasm
 */

shRequire([__dirname + "/object.js"], (obj) =>
{
    const d = new WeakMap();

    /**
     * Class representing a WASM runtime, compatible with Emscripten.
     * 
     * Modularization of the runtime is taking place internally, so Emscripten
     * does not have to be instructed to build a modularized runtime.
     * 
     * @deprecated Since WASM modules can be imported directly, this class is
     * deprecated and will be removed eventually.
     * 
     * @memberof core
     * @extends core.Object
     *
     * @property {html.Canvas} canvas - (default: `null`) A canvas for graphical output.
     * @property {string} source - (default: `""`) The URL of the .wasm file. An accompanying .js file for setting up the runtime must be present.
     * @property {object} instance - [readonly] The WASM instance once loaded.
     */
    class Wasm extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                canvas: null,
                source: "",
                instance: null
            });

            this.notifyable("canvas");
            this.notifyable("source");
            this.notifyable("instance");

            /**
             * Is triggered when the WASM instance is ready.
             * @event ready
             * @memberof html.Wasm
             */
            this.registerEvent("ready");
        }

        get canvas() { return d.get(this).canvas; }
        set canvas(cnv)
        {
            d.get(this).canvas = cnv;
            cnv.get().id = "canvas";
            this.canvasChanged();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            d.get(this).source = s;
            this.sourceChanged();
        }

        get instance() { return d.get(this).instance; }

        /**
         * Converts a C++ embind std::vector<T> to an ArrayBuffer.
         * Do not forget to explicitly delete the vector after it is no longer
         * required, or use the `del` flag.
         * 
         * @param {StdVector} vec - The vector.
         * @param {bool} [del = false] - Whether to delete the std::vector<T> after conversion.
         * @returns {ArrayBuffer} The vector as ArrayBuffer.
         */
        vectorToArrayBuffer(vec, del)
        {
            const priv = d.get(this);
            const buffer = new ArrayBuffer(vec.size());
            new Uint8Array(buffer).set(new Uint8Array(priv.instance.HEAP8.buffer, vec.data(), vec.size()));
            if (del)
            {
                vec.delete();
            }
            return buffer;
        }

        /**
         * Loads the WASM module and emits the `ready` event when the module
         * is ready to be used.
         */
        load()
        {
            const priv = d.get(this);

            const wasmUrl = priv.source;
            const runtimeUrl = wasmUrl.replace(/\.wasm$/i, ".js");

            const pos = wasmUrl.lastIndexOf("/");
            const wasmDirectory = pos > 0 ? wasmUrl.substr(0, pos) : wasmUrl;

            function processor(u, code)
            {
                return `
                    exports.init = (Module) =>
                    {
                        ${code}
                        return Module;
                    };
                `;
            }

            shRequire([shRequire.resource(runtimeUrl)], (mod) =>
            {
                let runTime = null;

                const Module = {
                    mainScriptUrlOrBlob: runtimeUrl,
                    canvas: priv.canvas ? priv.canvas.get() : null,
                    locateFile: (path, scriptDirectory) =>
                    {
                        //console.log("locate file: " + path + ", " + scriptDirectory);
                        return wasmDirectory + "/" + path;
                    },
                    onRuntimeInitialized: () =>
                    {
                        priv.instance = runTime;
                        this.instanceChanged();
                        this.ready();
                    }
                };
                runTime = mod.init(Module);
            }, processor);
        }
    }
    exports.Wasm = Wasm;
});