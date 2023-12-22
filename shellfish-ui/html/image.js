/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/item.js"], function (low, item)
{

    const d = new WeakMap();

    /**
     * Class representing an image.
     * 
     * @extends html.Item
     * @memberof html
     * 
     * @property {string} fitMode - (default: `"fill"`) The mode for fitting the original image into this element. One of: `fill|contain|cover|scale-down|none`
     * @property {number} originalWidth - [readonly] The original width of the image.
     * @property {number} originalHeight - [readonly] The original height of the image.
     * @property {string} source - The image source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    class Image extends item.Item
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
                    //.style("pointer-events", "none")
                    .html()
                )
            });

            this.notifyable("status");
            this.notifyable("fitMode");
            this.notifyable("source");
            this.notifyable("originalWidth");
            this.notifyable("originalHeight");

            d.get(this).item.onload = this.safeCallback(ev =>
            {
                d.get(this).status = "success";
                this.originalWidthChanged();
                this.originalHeightChanged();
                this.statusChanged();
                this.updateSizeFrom(null, false);

                // work around Chromium not rendering images with
                // HW acceleration enabled
                this.css("image-rendering", "pixelated");
                this.wait(100).then(() =>
                {
                    this.css("image-rendering", "auto");
                });
            });

            d.get(this).item.onerror = this.safeCallback(() =>
            {
                if (d.get(this).source !== "")
                {
                    d.get(this).status = "error";
                    this.statusChanged();
                }
            });
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
            if (s === undefined)
            {
                s = "";
            }

            d.get(this).source = s;
            this.sourceChanged();
            
            if (s !== "")
            {
                d.get(this).status = "loading";
            }
            else
            {
                d.get(this).status = "empty";
            }
            this.statusChanged();
            
            d.get(this).item.setAttribute("src", shRequire.resource(s));
        }

        get originalWidth() { return d.get(this).item.naturalWidth; }
        get originalHeight() { return d.get(this).item.naturalHeight; }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Image = Image;

});