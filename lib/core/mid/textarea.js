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
     * Class representing a text area.
     * @extends mid.Item
     * @memberof mid
     */
    exports.TextArea = class TextArea extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                spellCheck: false,
                item: low.createElementTree(
                    low.tag("textarea")
                    .attr("wrap", "off")
                    .attr("spellcheck", "false")
                    .html()
                )
            });

            this.notifyable("bold", true);
            this.notifyable("color", true);
            this.notifyable("column");
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
            this.notifyable("row");
            this.notifyable("selectionStart", true);
            this.notifyable("selectionEnd", true);
            this.notifyable("spellCheck");
            this.notifyable("text", true);

            this.addHtmlEventListener(d.get(this).item, "input", (ev) =>
            {
                this.textChanged();
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.contentWidthChanged();
                    this.contentHeightChanged();
                }, this.objectLocation);
            }, false);

            this.addHtmlEventListener(d.get(this).item, "keydown", (ev) =>
            {
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.selectionStartChanged();
                    this.selectionEndChanged();
                    this.columnChanged();
                    this.rowChanged();
                }, this.objectLocation);

                if (! ev.altKey && ! ev.ctrlKey && ! ev.metaKey)
                {
                    // stop propagation but allow default action
                    ev.stopPropagation();
                }
            });

            this.addHtmlEventListener(d.get(this).item, "click", () =>
            {
                this.selectionStartChanged();
                this.selectionEndChanged();
                this.columnChanged();
                this.rowChanged();
            });
        }

        get text() { return this.get().value; }
        set text(t)
        {
            this.get().value = t;
            this.textChanged();
            this.columnChanged();
            this.rowChanged();
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

        get selectionStart() { return d.get(this).item.selectionStart; }
        get selectionEnd() { return d.get(this).item.selectionEnd; }

        get spellCheck() { return d.get(this).spellCheck; }
        set spellCheck(v)
        {
            if (v)
            {
                d.get(this).item.setAttribute("spellcheck", "true");
            }
            else
            {
                d.get(this).item.setAttribute("spellcheck", "false");
                const text = d.get(this).item.value;
                d.get(this).item.value = "";
                d.get(this).item.value = text;
            }
            d.get(this).spellCheck = v;
            this.spellCheckChanged();
        }

        get column()
        {
            
            const pos = d.get(this).item.selectionStart;
            const idx = d.get(this).item.value.lastIndexOf("\n", pos - 1);

            return idx === -1 ? pos : pos - idx - 1;
        }

        get row()
        {
            let pos = d.get(this).item.selectionStart;
            let row = 0;
            while (pos !== -1)
            {
                pos = d.get(this).item.value.lastIndexOf("\n", pos - 1);
                ++row;
            }
            return row - 1;
        }

        get()
        {
            return d.get(this).item;
        }
    };

});