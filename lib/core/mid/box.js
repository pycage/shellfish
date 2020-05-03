/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2020 Martin Grimme <martin.grimme@gmail.com>

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
     * Class representing a box.
     * @extends mid.Item
     * @memberof mid
     * 
     * @property {string} borderColor - (default: `"black"`) The color of the border.
     * @property {number} borderRadius - (default: `0`) The border radius. The higher the value, the more round the corners are. A square with a border radius of half its width is a circle.
     * @property {number} borderWidth - (default: `0`) The border width.
     * @property {string} color - (default: `"transparent"`) The background color.
     * @property {bool} scrollbars - (default: `false`) Whether to show native scrollbars for content overflow.
     */
    exports.Box = class Box extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                borderRadius: 0,
                scrollbars: false,
                item: low.createElementTree(
                    low.tag("div")
                    .class("sh-no-scrollbars")
                    .style("position", "relative")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("border-color", "black")
                    .style("border-width", "0")
                    .style("border-style", "solid")
                    .style("border-radius", "0")
                    .style("overflow", "auto")
                    .html()
                )
            });

            this.notifyable("color", true);
            this.notifyable("borderWidth", true);
            this.notifyable("borderColor", true);
            this.notifyable("borderRadius", true);
            this.notifyable("scrollbars", true);

            d.get(this).item.addEventListener("scroll", () =>
            {
                this.contentXChanged();
                this.contentYChanged();
            }, { passive: true });
        }

        get color() { return low.css(d.get(this).item, "background-color"); }
        set color(c)
        {
            low.css(d.get(this).item, "background-color", c);
            this.colorChanged();
        }

        get borderWidth() { return low.css(d.get(this).item, "border-width"); }
        set borderWidth(w)
        {
            low.css(d.get(this).item, "border-width", w + "px");
            this.borderWidthChanged();
        }

        get borderColor() { return low.css(d.get(this).item, "border-color"); }
        set borderColor(c)
        {
            low.css(d.get(this).item, "border-color", c);
            this.borderColorChanged();
        }

        get borderRadius() { return d.get(this).borderRadius; }
        set borderRadius(r)
        {
            d.get(this).borderRadius = r;
            low.css(d.get(this).item, "border-radius", r + "px");
            this.borderRadiusChanged();
        }

        get scrollbars() { return d.get(this).scrollbars; }
        set scrollbars(value)
        {
            d.get(this).scrollbars = value;
            if (value)
            {
                d.get(this).item.classList.remove("sh-no-scrollbars");
            }
            else
            {
                d.get(this).item.classList.add("sh-no-scrollbars");
            }
            this.scrollbarsChanged();
        }

        /**
         * Adds a child element to this item.
         * 
         * @memberof mid.Box
         * @param {mid.Object} child - The child item.
         */
        add(child)
        {
            child.parent = this;
            if (child.get)
            {
                d.get(this).item.appendChild(child.get());
            }
        }

        get()
        {
            return d.get(this).item;
        }
    };

});
