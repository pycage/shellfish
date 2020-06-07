/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/../low.js", __dirname + "/item.js"], function (low, item)
{

    const d = new WeakMap();

    /**
     * Class representing an image.
     * @extends item.Item
     * @memberof mid
     * 
     * @property {string} fitMode - (default: `"fill"`) The mode for fitting the original image into this element. One of: `fill|contain|cover|scale-down|none`
     * @property {number} originalWidth - [readonly] The original width of the image.
     * @property {number} originalHeight - [readonly] The original height of the image.
     * @property {string} source - The image source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    exports.Image = class Image extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                status: "empty",
                fitMode: "fill",
                source: "",
                item: low.createElementTree(
                    low.tag("img")
                    .style("object-fit", "fill")
                    .style("pointer-events", "none")
                    .html()
                )
            });

            this.notifyable("status");
            this.notifyable("fitMode");
            this.notifyable("source");
            this.notifyable("originalWidth");
            this.notifyable("originalHeight");

            d.get(this).item.onload = (ev) =>
            {
                d.get(this).status = "success";
                this.statusChanged();
                this.originalWidthChanged();
                this.originalHeightChanged();
            };

            d.get(this).item.onerror = () =>
            {
                d.get(this).status = "error";
                this.statusChanged();
            };
        }

        get status() { return d.get(this).status; }

        get fitMode() { return d.get(this).fitMode; }
        set fitMode(m)
        {
            d.get(this).fitMode = m;
            low.css(d.get(this).item, "object-fit", m);
            this.fitModeChanged();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            d.get(this).status = "loading";
            this.statusChanged();

            d.get(this).source = s;
            d.get(this).item.setAttribute("src", shRequire.resource(s));
            this.sourceChanged();
        }

        get originalWidth() { return d.get(this).item.naturalWidth; }
        get originalHeight() { return d.get(this).item.naturalHeight; }

        /**
         * Loads the image from a HTML5 file object.
         * 
         * @param {object} fileObj - The file object to read.
         */
        fromFile(fileObj)
        {
            if (! ("" + fileObj.type).startsWith("image/"))
            {
                d.get(this).status = "error";
                this.statusChanged();
                return;
            }

            const reader = new FileReader();

            reader.onload = () =>
            {
                this.source = reader.result;
            };

            reader.readAsDataURL(fileObj);
        }

        get()
        {
            return d.get(this).item;
        }
    };

});