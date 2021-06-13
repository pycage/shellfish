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

shRequire([__dirname + "/../low.js", __dirname + "/item.js"], function (low, item)
{
    const d = new WeakMap();

    /**
     * Class representing a multiline area for text input.
     * 
     * @extends mid.Item
     * @memberof mid
     * 
     * @property {bool} bold - (default: `false`) Show text in bold face.
     * @property {mid.Color} color - The text color.
     * @property {number} column - The column of the current cursor position.
     * @property {string} fontFamily - The font family.
     * @property {number} fontSize - The font size in CSS pixels.
     * @property {number} row - The row of the current cursor position.
     * @property {mid.Color} selectionBackgroundColor - The background color of selected text.
     * @property {mid.Color} selectionColor - The color of selected text.
     * @property {number} selectionEnd - [readonly] The ending position of the text selection. This value is the same as `selectionStart` if no text is selected.
     * @property {number} selectionStart - [readonly] The starting position of the text selection.
     * @property {bool} spellCheck - (default: `false`) Whether to enable spell-checking.
     * @property {string} text - (default: `""`) The text to show.
     */
    class TextArea extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                selectionColor: this.colorName("white"),
                selectionBackgroundColor: this.colorName("navy"),
                spellCheck: false,
                item: low.createElementTree(
                    low.tag("textarea")
                    .class("sh-text-selectable")
                    .attr("wrap", "off")
                    .attr("spellcheck", "false")
                    .style("color", "black")
                    .style("--sh-selection-color", "white")
                    .style("--sh-selection-background-color", "navy")
                    .html()
                )
            });

            this.notifyable("bold", true);
            this.notifyable("color");
            this.notifyable("column");
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
            this.notifyable("row");
            this.notifyable("selectionBackgroundColor");
            this.notifyable("selectionColor");
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
                }, this.objectType + "@" + this.objectLocation);
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
                }, this.objectType + "@" + this.objectLocation);

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
            this.css("font-weight", value ? "bold" : "normal");
            this.boldChanged();
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            this.css("color", col.toCss());
            d.get(this).color = col;
            this.colorChanged();
        }

        get selectionColor() { return d.get(this).selectionColor; }
        set selectionColor(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            this.css("--sh-selection-color", col.toCss());
            d.get(this).selectionColor = col;
            this.selectionColorChanged();
        }

        get selectionBackgroundColor() { return d.get(this).selectionBackgroundColor; }
        set selectionBackgroundColor(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            this.css("--sh-selection-background-color", col.toCss());
            d.get(this).selectionBackgroundColor = col;
            this.selectionBackgroundColorChanged();
        }

        get fontFamily() { return low.css(d.get(this).item, "font-family"); }
        set fontFamily(f)
        {
            this.css("font-family", f);
            this.fontFamilyChanged();
        }

        get fontSize() { return low.css(d.get(this).item, "font-size").replace("px", ""); }
        set fontSize(s)
        {
            this.css("font-size", s + "px");
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
    }
    exports.TextArea = TextArea;

});