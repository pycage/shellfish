/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
    let d = new WeakMap();

    /**
     * Class representing a text input field.
     * 
     * @memberof html
     * @extends html.Item
     * 
     * @property {bool} bold - (default: `false`) Show text in bold face.
     * @property {html.Color} color - The text color.
     * @property {string} fontFamily - The font family.
     * @property {number} fontSize - The font size in CSS pixels.
     * @property {string} horizontalAlignment - (default: `"left"`) Horizontal text alignment: `left|center|right`
     * @property {bool} password - (default: `false`) Whether this is a password entry field.
     * @property {string} pattern - (default: `".*"`) A regular expression pattern for restricting allowed input.
     * @property {html.Color} selectionBackgroundColor - The background color of selected text.
     * @property {html.Color} selectionColor - The color of selected text.
     * @property {string} text - (default: `""`) The text to show.
     */
    class TextInput extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                pattern: /.*/,
                selectionColor: this.colorName("white"),
                selectionBackgroundColor: this.colorName("navy"),
                horizontalAlignment: "left",
                item: low.createElementTree(
                    low.tag("input")
                    .class("sh-text-selectable")
                    .attr("type", "text")
                    .attr("autocomplete", "really-off")  // to disable auto-fill and auto-complete
                    .style("flex-grow", "1")
                    .style("flex-shrink", "1")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("color", "black")
                    .style("text-align", "left")
                    .style("--sh-selection-color", "white")
                    .style("--sh-selection-background-color", "navy")
                    .html()
                )
            });

            this.notifyable("text", true);
            this.notifyable("bold", true);
            this.notifyable("color");
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
            this.notifyable("horizontalAlignment");
            this.notifyable("password", true);
            this.notifyable("pattern");
            this.notifyable("selectionBackgroundColor");
            this.notifyable("selectionColor");

            /**
             * Is triggered when input was rejected due to not matching the pattern.
             * @event reject
             * @memberof html.TextInput
             * @param {string} text - The rejected text.
             */
            this.registerEvent("reject");

            let prev = this.text;
            this.addHtmlEventListener(d.get(this).item, "input", (ev) =>
            {
                if (! this.text.match(d.get(this).pattern))
                {
                    this.reject(this.text);
                    d.get(this).item.value = prev;
                }
                else
                {
                    prev = this.text;
                    this.textChanged();
                }
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

        get horizontalAlignment() { d.get(this).horizontalAlignment; }
        set horizontalAlignment(a)
        {
            if (a !== d.get(this).horizontalAlignment)
            {
                const map = {
                    "left": "flex-start",
                    "right": "flex-end",
                    "center": "center"
                };
                d.get(this).horizontalAlignment = a;
                this.css("justify-content", map[a]);
                this.css("text-align", a);
                this.horizontalAlignmentChanged();
            }
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

        get password() { return d.get(this).item.type === "password"; }
        set password(value)
        {
            d.get(this).item.type = value ? "password" : "text";
            this.passwordChanged();
        }

        get pattern() { return d.get(this).pattern.toString(); }
        set pattern(p)
        {
            d.get(this).pattern = new RegExp("^" + p + "$");
            if (! this.text.match(d.get(this).pattern))
            {
                this.text = "";
            }
            this.patternChanged();
        }

        /**
         * Selects the given range.
         * 
         * @param {number} begin - The text position of the begin of the selection.
         * @param {number} end - The text of position of the end of the selection.
         */
        selectRange(begin, end)
        {
            d.get(this).item.setSelectionRange(begin, end);
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.TextInput = TextInput;
});