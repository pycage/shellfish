/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2019 Martin Grimme <martin.grimme@gmail.com>

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

require([__dirname + "/../low.js", __dirname + "/control.js"], function (low, ctrl)
{
    let d = new WeakMap();

    /* Class representing a menu item.
     */
    exports.MenuItem = class MenuItem extends ctrl.Control
    {
        constructor()
        {
            super();
            d.set(this, {
                icon: "",
                text: "",

                item: $(
                    low.tag("li")
                    .style("position", "relative")
                    .on("click", "")
                    .content(
                        low.tag("span").class("sh-left sh-fw-icon")
                        .style("padding-left", "0.1rem")
                    )
                    .content(
                        low.tag("span")
                        .style("padding-left", "1.2rem")
                        .content("")
                    )
                    .html()
                )
            });

            let that = this;
            d.get(this).item.on("click", function (event)
            {
                if (that.onClicked)
                {
                    that.onClicked();
                }
            });

            this.notifyable("icon");
            this.notifyable("text");
        }

        get icon() { return d.get(this).icon; }
        set icon(name)
        {
            let old = d.get(this).icon;
            d.get(this).item.find("span").first()
            .removeClass("sh-icon-" + old)
            .addClass("sh-icon-" + name);
            d.get(this).icon = name;
            this.iconChanged();
        }

        get text() { d.get(this).text; }
        set text(text)
        {
            d.get(this).item.find("span").last()
            .html(low.resolveIcons(low.escapeHtml(text)));
            d.get(this).text = text;
            this.textChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});