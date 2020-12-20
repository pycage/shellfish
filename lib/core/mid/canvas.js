/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

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
     * Class representing a HTML5 canvas.
     * @extends mid.Item
     * @memberof mid
     * 
     * @property {object} context2d - [readonly] The 2D canvas context.
     * @property {number} originalHeight - (default: `100`) The original unscaled height.
     * @property {number} originalWidth - (default: `100`) The original unscaled width.
     */
    exports.Canvas = class Canvas extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                item: low.createElementTree(
                    low.tag("canvas")
                    .attr("width", "100")
                    .attr("height", "100")
                    .style("touch-action", "none")
                    .html()
                )
            });

            this.notifyable("originalWidth");
            this.notifyable("originalHeight");
        }

        get context2d() { return this.get().getContext("2d"); }

        get originalWidth() { return this.get().width; }
        set originalWidth(w)
        {
            if (w !== this.get().width)
            {
                this.get().width = w;
            }
            this.originalWidthChanged();
        }

        get originalHeight() { return this.get().height; }
        set originalHeight(h)
        {
            if (h !== this.get().height)
            {
                this.get().height = h;
            }
            this.originalHeightChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});