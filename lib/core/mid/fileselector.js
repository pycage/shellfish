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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    /**
     * Class representing a file selector trigger.
     * 
     * @memberof mid
     * @extends mid.Object
     * 
     * @example
     * Button {
     *     text: "Select Files"
     * 
     *     onClick: () =>
     *     {
     *         fsel.open(files =>
     *         {
     *             console.log(files);
     *         });
     *     }
     * 
     *     FileSelector {
     *         id: fsel
     *         accept: ["audio/*", "video/*"]
     *         multiple: true
     *     }
     * }
     * 
     * @property {string[]} accept - (default: `["*"]`) A list of accepted MIME type patterns.
     * @property {bool} directory - (default: `false`) Whether to select directories instead of files.
     * @property {bool} multiple - (default: `false`) Whether to allow multi-selection.
     */
    class FileSelector extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                accept: ["*"],
                multiple: false,
                directory: false,
                callback: null,
                item: low.createElementTree(
                    low.tag("input")
                    .style("display", "none")
                    .attr("type", "file")
                    .attr("accept", "*")
                    .html()
                )
            });

            this.notifyable("accept");
            this.notifyable("directory");
            this.notifyable("multiple");
            
            /**
             * Is triggered when the user selected files or directories.
             * @event select
             * @memberof mid.FileSelector
             * @param {File[]} files - The selected HTML5 file objects.
             */
            this.registerEvent("select");

            this.addHtmlEventListener(d.get(this).item, "change", (ev) =>
            {
                this.select(ev.target.files);
                const cb = d.get(this).callback;
                if (cb)
                {
                    d.get(this).callback = null;
                    cb(ev.target.files);
                }
            });

            document.body.appendChild(d.get(this).item);
            this.onDestruction = () =>
            {
                document.body.removeChild(d.get(this).item);
            };
        }

        get accept() { return d.get(this).accept; }
        set accept(acc)
        {
            d.get(this).accept = acc;
            d.get(this).item.accept = acc.join(", ");
            this.acceptChanged();
        }

        get directory() { return d.get(this).directory; }
        set directory(value)
        {
            d.get(this).directory = value;
            // non-standard, but widely supported
            d.get(this).item.webkitdirectory = value;
            this.directoryChanged();
        }

        get multiple() { return d.get(this).multiple; }
        set multiple(value)
        {
            d.get(this).multiple = value;
            d.get(this).item.multiple = value;
            this.multipleChanged();
        }

        /**
         * Opens the file dialog.
         * 
         * @param {function} [callback = null] - An optional callback function accepting the selected HTML5 File items.
         */
        open(callback)
        {
            d.get(this).callback = callback;
            d.get(this).item.click();
        }
    }
    exports.FileSelector = FileSelector;
});