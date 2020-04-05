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

    /* Class representing a text label.
     */
    exports.Label = class Label extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                text: "",
                horizontalAlignment: "left",
                verticalAlignment: "center",
                item: low.createElementTree(
                    low.tag("p").class("sh-label")
                    .style("flex-grow", "1")
                    .style("flex-shrink", "1")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("display", "flex")
                    .style("align-items", "center")
                    .style("justify-content", "left")
                    .style("text-align", "left")
                    .style("white-space", "nowrap")
                    .content("")
                    .html()
                )
            });

            this.notifyable("text");
            this.notifyable("horizontalAlignment");
            this.notifyable("verticalAlignment");
            this.notifyable("color", true);
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
        }

        get text() { return d.get(this).text; }
        set text(text)
        {
            d.get(this).text = text;
            d.get(this).item.innerHTML = low.resolveIcons(low.escapeHtml(text));
            this.textChanged();
        }

        get color() { return low.css(d.get(this).item, "color"); }
        set color(c)
        {
            low.css(d.get(this).item, "color", c);
            this.colorChanged();
        }

        get fontFamily() { return low.css(d.get(this).item, "font-family"); }
        set fontFamily(f)
        {
            low.css(d.get(this).item, "font-family", f);
            this.fontFamilyChanged();
        }

        get fontSize() { return low.css(d.get(this).item, "font-size").replace("px", ""); }
        set fontSize(s)
        {
            low.css(d.get(this).item, "font-size", s + "px");
            this.fontSizeChanged();
        }

        get horizontalAlignment() { d.get(this).horizontalAlignment; }
        set horizontalAlignment(a)
        {
            const map = {
                "left": "flex-start",
                "right": "flex-end",
                "center": "center"
            };
            d.get(this).horizontalAlignment = a;
            low.css(d.get(this).item, "justify-content", map[a]);
            low.css(d.get(this).item, "text-align", a);
            this.horizontalAlignmentChanged();
        }

        get verticalAlignment() { d.get(this).verticalAlignment; }
        set verticalAlignment(a)
        {
            const map = {
                "top": "flex-start",
                "bottom": "flex-end",
                "center": "center"
            };
            d.get(this).verticalAlignment = a;
            low.css(d.get(this).item, "align-items", map[a]);
            this.verticalAlignmentChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});
