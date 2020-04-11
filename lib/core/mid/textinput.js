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
    let d = new WeakMap();

    exports.TextInput = class TextInput extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                item: low.createElementTree(
                    low.tag("input")
                    .attr("type", "text")
                    .style("flex-grow", "1")
                    .style("flex-shrink", "1")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("background-color", "transparent")
                    .style("border-width", "0")                 
                    .style("overflow", "hidden")
                    .html()
                )
            });

            this.notifyable("text", true);
            this.notifyable("bold", true);
            this.notifyable("color", true);
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
            this.notifyable("password", true);


            d.get(this).item.addEventListener("input", (ev) =>
            {
                console.log("input changed");
                this.textChanged();
            }, false);
        }

        get text() { return this.get().value; }
        set text(t)
        {
            this.get().value = t;
            this.textChanged();
        }

        get bold() { return d.get(this).bold; }
        set bold(value)
        {
            d.get(this).bold = value;
            low.css(d.get(this).item, "font-weight", value ? "bold" : "normal");
            this.boldChanged();
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

        get password() { return d.get(this).item.type === "password"; }
        set password(value)
        {
            d.get(this).item.type = value ? "password" : "text";
            this.passwordChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };
});