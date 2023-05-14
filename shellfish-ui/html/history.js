/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    /**
     * Class representing the browser history.
     * 
     * This element allows you to forge artificial history entries in order to
     * make use of the Back and Forward buttons of the browser.
     * 
     * @extends html.Object
     * @memberof html
     */
    class History extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {

            });

            /**
             * Is triggered when a history object is to be loaded.
             * @event load
             * @param {any} state - A state object representing the history entry.
             * @memberof html.History
             */
            this.registerEvent("load");

            this.addHtmlEventListener(window, "popstate", (ev) =>
            {
                this.load(ev.state);
            });
        }

        /**
         * Appends the history by a new entry represented by a state object.
         * Entries newer than the current entry will be lost.
         * 
         * Most browsers use the current document title to name the history entry.
         * 
         * @param {any} state - The history state. This may be any JSON-serializable object.
         */
        append(state)
        {
            try
            {
                window.history.pushState(state, "");
            }
            catch (err)
            {
                // Firefox Focus?
            }
        }

        /**
         * Replaces the current entry of the history by a new entry represented by a state object.
         * 
         * Most browsers use the current document title to name the history entry.
         * 
         * @param {any} state - The history state. This may be any JSON-serializable object.
         */
        replace(state)
        {
            try
            {
                window.history.replaceState(state, "");
            }
            catch (err)
            {
                // Firefox Focus?
            }
        }

        /**
         * Moves the history back by the given amount of entries, which will trigger
         * the `load` event with the corresponding state object.
         * 
         * @param {number} amount - (default: `1`) The amount of entries to move back.
         */
        back(amount)
        {
            if (amount !== undefined)
            {
                window.history.go(-amount);
            }
            else
            {
                window.history.back();
            }
        }

        /**
         * Moves the history forward by the given amount of entries, which will trigger
         * the `load` event with the corresponding state object.
         * 
         * @param {number} amount - (default: `1`) The amount of entries to move forward.
         */
        forward(amount)
        {
            if (amount !== undefined)
            {
                window.history.go(amount);
            }
            else
            {
                window.history.forward();
            }
        }

    }
    exports.History = History;
});