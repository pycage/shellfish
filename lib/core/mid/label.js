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
     * Class representing a text label.
     * @extends mid.Item
     * @memberof mid
     * 
     * @property {bool} bold - Show text in bold face.
     * @property {string} color - The text color.
     * @property {string} fontFamily - The font family.
     * @property {number} fontSize - The font size in CSS pixels.
     * @property {string} horizontalAlignment - Horizontal text alignment: left|center|right
     * @property {bool} italic - Show text in italics.
     * @property {bool} literal - If true, icons are not resolved and line breaks and spaces are preserved.
     * @property {string} overflowBehavior - Overflow behavior: clip|ellipsis|wrap
     * @property {string} text - The text to show.
     * @property {string} verticalAlignment - Vertical text alignment: top|center|bottom
     */
    exports.Label = class Label extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                text: "",
                bold: false,
                italic: false,
                horizontalAlignment: "left",
                verticalAlignment: "center",
                overflowBehavior: "clip",  // clip | ellipsis | wrap
                literal: false,
                item: low.createElementTree(
                    low.tag("p").class("sh-label")
                    .style("flex-grow", "1")
                    .style("flex-shrink", "1")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("align-items", "center")
                    .style("justify-content", "left")
                    .style("text-align", "left")
                    .style("white-space", "nowrap")
                    .style("text-overflow", "clip")
                    .style("overflow", "hidden")
                    .content("")
                    .html()
                )
            });

            this.notifyable("text");
            this.notifyable("bold");
            this.notifyable("italic");
            this.notifyable("literal");
            this.notifyable("horizontalAlignment");
            this.notifyable("verticalAlignment");
            this.notifyable("overflowBehavior");
            this.notifyable("color", true);
            this.notifyable("fontFamily", true);
            this.notifyable("fontSize", true);
        }

        get bold() { return d.get(this).bold; }
        set bold(value)
        {
            d.get(this).bold = value;
            low.css(d.get(this).item, "font-weight", value ? "bold" : "normal");
            this.boldChanged();
            this.bboxChanged();
        }

        get italic() { return d.get(this).italic; }
        set italic(value)
        {
            d.get(this).italic = value;
            low.css(d.get(this).item, "font-style", value ? "italic" : "normal");
            this.italicChanged();
            this.bboxChanged();
        }

        get literal() { return d.get(this).literal; }
        set literal(value)
        {
            d.get(this).literal = value;
            this.text = this.text;
            this.literalChanged();
            this.bboxChanged();
        }

        get text() { return d.get(this).text; }
        set text(text)
        {
            d.get(this).text = text;
            const literal = d.get(this).literal;
            let out = low.escapeHtml("" + text)
                         .replace(/\n/g, "<br>");
            if (! literal)
            {
                out = low.resolveIcons(out);
            }
            else
            {
                out = out.replace(/  /g, " &nbsp;");
            }
            d.get(this).item.innerHTML = out;
            this.textChanged();
            this.bboxChanged();
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
            this.bboxChanged();
        }

        get fontSize() { return low.css(d.get(this).item, "font-size").replace("px", ""); }
        set fontSize(s)
        {
            low.css(d.get(this).item, "font-size", s + "px");
            this.fontSizeChanged();
            this.bboxChanged();
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

        get overflowBehavior() { d.get(this).overflowBehavior; }
        set overflowBehavior(m)
        {
            d.get(this).overflowBehavior = m;
            if (m === "clip" || m === "ellipsis")
            {
                low.css(d.get(this).item, "text-overflow", m);
                low.css(d.get(this).item, "white-space", "nowrap");
            }
            else if (m === "wrap")
            {
                low.css(d.get(this).item, "text-overflow", "clip");
                low.css(d.get(this).item, "white-space", "normal");
            }
            this.overflowBehaviorChanged();
            this.bboxChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});
