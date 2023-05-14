/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/core"], core =>
{
    const d = new WeakMap();

    /**
     * Base class representing an abstract object in a HTML environment.
     * 
     * @alias html.Object
     * @extends core.Object
     * @memberof html
     */
    class Obj extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                blobUrls: [],
                htmlEventListeners: []
            });

            this.onTermination = () =>
            {
                d.get(this).blobUrls.forEach(url =>
                {
                    URL.revokeObjectURL(url);
                    console.log(this.objectType + "@" + this.objectLocation + " released object URL: " + url);
                });
                d.get(this).blobUrls = [];
                
                d.get(this).htmlEventListeners.forEach(entry =>
                {
                    //console.log("removeEventListener: " + entry.type + ", " + JSON.stringify(entry.options));
                    entry.target.removeEventListener(entry.type, entry.listener, entry.options);
                });
                d.get(this).htmlEventListeners = [];
            };
        }

        /**
         * Creates an URL for the given blob. The URL is automatically revoked
         * on destruction of this object.
         * 
         * @param {Blob} blob - The blob to create an URL for.
         * @returns {string} - The URL.
         */
        blobUrl(blob)
        {
            const url = URL.createObjectURL(blob);
            //console.log("Creating object URL (object size: " + blob.size + " bytes, type: " + (blob.type || "<unknown>") + "): " + url);
            d.get(this).blobUrls.push(url);
            return url;
        }

        /**
         * Adds a HTML event listener and registers it for proper removal when this
         * object gets destroyed.
         * This method is prefered to just using `addEventListener`, which may leak
         * event listener callbacks along with their closures.
         * @see {@link core.Object#removeHtmlEventListener removeHtmlEventListener}
         * 
         * @param {HTMLElement} target - The target HTML element.
         * @param {string} type - The event type.
         * @param {function} listener - The listener function.
         * @param {object} [options] - Optional HTML event listener options.
         */
        addHtmlEventListener(target, type, listener, options)
        {
            target.addEventListener(type, listener, options);
            d.get(this).htmlEventListeners.push({
                target, type, listener, options
            });
        }

        /**
         * Removes the given HTML event listener. This is prefered to just using
         * `removeEventListener`.
         * @see {@link core.Object#addHtmlEventListener addHtmlEventListener}
         * 
         * @param {HTMLElement} target - The target HTML element.
         * @param {string} type - The event type.
         * @param {function} listener - The listener function.
         * @param {object} [options] - Optional HTML event listener options.
         */
        removeHtmlEventListener(target, type, listener, options)
        {
            target.removeEventListener(type, listener, options);
            const listeners = d.get(this).htmlEventListeners;
            
            const idx = listeners.findIndex(entry =>
            {
                return entry.target === target &&
                       entry.type === type &&
                       entry.listener === listener &&
                       entry.options === options;
            });

            if (idx !== -1)
            {
                listeners.splice(idx, 1);
            }
        }
    }
    exports.Object = Obj;
});