/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2023 Martin Grimme <martin.grimme@gmail.com>

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
    const HTML = low.createElementTree(
        low.tag("p").class("sh-type-label")
        .style("color", "black")
        .style("width", "auto")
        .style("height", "auto")
        .style("align-items", "center")
        .style("justify-content", "left")
        .style("text-align", "left")
        .style("white-space", "nowrap")
        .style("text-overflow", "clip")
        .style("font-famiy", "sans-serif")
        .style("font-size", "12")
        .style("line-height", "1.2")
        .style("user-select", "none")
        .style("-webkit-user-select", "none")
        .content("")
        .html()
    );

    const d = new WeakMap();

    /**
     * Class representing a text label with support for simple markup.
     * 
     * @extends html.Item
     * @memberof html
     * 
     * @property {bool} bold - (default: `false`) Show text in bold face.
     * @property {html.Color} color - The text color.
     * @property {function} filter - (default: `null`) A function for filtering the text.
     * @property {string} fontFamily - The font family.
     * @property {number} fontSize - The font size in CSS pixels.
     * @property {string} horizontalAlignment - (default: `"left"`) Horizontal text alignment: `left|center|right`
     * @property {bool} italic - (default: `false`) Show text in italics.
     * @property {bool} literal - (default: `false`) If true, markup code is not interpreted and line breaks and spaces are preserved.
     * @property {string} overflowBehavior - (default: `"clip"`) Overflow behavior: `clip|ellipsis|wrap|break`
     * @property {bool} selectable - (default: `false`) If `true`, text may be selected by the mouse.
     * @property {string} text - (default: `""`) The text to show.
     * @property {string} verticalAlignment - (default: `"center"`) Vertical text alignment: `top|center|bottom`
     */
    class Label extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                fontFamily: "sans-serif",
                fontSize: 12,
                text: "",
                bold: false,
                italic: false,
                color: this.colorName("black"),
                horizontalAlignment: "left",
                verticalAlignment: "center",
                overflowBehavior: "clip",  // clip | ellipsis | wrap
                literal: false,
                filter: null,
                selectable: false,
                textInvalidated: true,
                contentSizeInvalidated: false,
                item: HTML.cloneNode()
            });

            this.notifyable("bold");
            this.notifyable("color");
            this.notifyable("filter");
            this.notifyable("fontFamily");
            this.notifyable("fontSize");
            this.notifyable("horizontalAlignment");
            this.notifyable("italic");
            this.notifyable("literal");
            this.notifyable("overflowBehavior");
            this.notifyable("selectable");
            this.notifyable("text");
            this.notifyable("verticalAlignment");

            this.onBboxWidthChanged = () =>
            {
                d.get(this).contentSizeInvalidated = true;
            };
        }

        get bold() { return d.get(this).bold; }
        set bold(value)
        {
            if (value !== d.get(this).bold)
            {
                d.get(this).bold = value;
                this.css("font-weight", value ? "bold" : "normal");
                this.boldChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
        }

        get italic() { return d.get(this).italic; }
        set italic(value)
        {
            if (value !== d.get(this).italic)
            {
                d.get(this).italic = value;
                this.css("font-style", value ? "italic" : "normal");
                this.italicChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
        }

        get literal() { return d.get(this).literal; }
        set literal(value)
        {
            if (value !== d.get(this).literal)
            {
                d.get(this).literal = value;
                d.get(this).textInvalidated = true;
                this.text = this.text;
                this.literalChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
        }

        get filter() { return d.get(this).filter; }
        set filter(f)
        {
            if (f !== d.get(this).filter)
            {
                d.get(this).filter = f;
                d.get(this).textInvalidated = true;
                this.text = this.text;
                this.filterChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
        }

        get selectable() { return d.get(this).selectable; }
        set selectable(s)
        {
            if (s !== d.get(this).selectable)
            {
                d.get(this).selectable = s;
                this.css("user-select", s ? "text" : "none");
                this.css("-webkit-user-select", s ? "text" : "none");
                this.selectableChanged();
            }
        }

        get text() { return d.get(this).text; }
        set text(text)
        {
            const priv = d.get(this);
            if (! priv.textInvalidated && text.length === priv.text.length && text === priv.text)
            {
                return;
            }
            priv.textInvalidated = false;

            const isLiteral = priv.literal;

            priv.text = text;
            let out = "" + text;
            if (isLiteral)
            {
                out = this.escapeHtml(out)
                          .replace(/\r?\n /g, "<br>&nbsp;")
                          .replace(/\r?\n/g, "<br>")
                          .replace(/  /g, "&nbsp; ");
            }
            else if (typeof priv.filter === "function")
            {
                out = priv.filter(out);
            }
            else
            {
                out = low.resolveMarkup(low.resolveIcons(this.escapeHtml(out).replace(/\n/g, "<br>")));
            }
            if (out === text)
            {
                priv.item.textContent = out;
            }
            else
            {
                priv.item.innerHTML = out;
            }
            this.textChanged();
            d.get(this).contentSizeInvalidated = true;
            this.updateSizeFrom(null, false);
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            if (col !== d.get(this).color)
            {
                this.css("color", col.toCss());
                d.get(this).color = col;
                this.colorChanged();
            }
        }

        get fontFamily() { return d.get(this).fontFamily; }
        set fontFamily(f)
        {
            if (f !== d.get(this).fontFamily)
            {
                this.css("font-family", f);
                d.get(this).fontFamily = f;
                this.fontFamilyChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
        }

        get fontSize() { return d.get(this).fontSize; }
        set fontSize(s)
        {
            if (s !== d.get(this).fontSize)
            {
                this.css("font-size", s + "px");
                d.get(this).fontSize = s;
                this.fontSizeChanged();
                d.get(this).contentSizeInvalidated = true;
                this.updateSizeFrom(null, false);
            }
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

        get verticalAlignment() { d.get(this).verticalAlignment; }
        set verticalAlignment(a)
        {
            if (a !== d.get(this).verticalAlignment)
            {
                const map = {
                    "top": "flex-start",
                    "bottom": "flex-end",
                    "center": "center"
                };
                d.get(this).verticalAlignment = a;
                this.css("align-items", map[a]);
                this.verticalAlignmentChanged();
            }
        }

        get overflowBehavior() { d.get(this).overflowBehavior; }
        set overflowBehavior(m)
        {
            if (m !== d.get(this).overflowBehavior)
            {
                d.get(this).overflowBehavior = m;
                if (m === "clip" || m === "ellipsis")
                {
                    this.css("text-overflow", m);
                    this.css("white-space", "nowrap");
                    this.css("word-break", "normal");
                }
                else if (m === "wrap" || m === "break")
                {
                    this.css("text-overflow", "clip");
                    this.css("white-space", "normal");
                    this.css("word-break", m === "wrap" ? "normal" : "break-all");
                }
                this.overflowBehaviorChanged();
                this.updateSizeFrom(null, false);
            }
        }

        updateContentSize()
        {
            if (d.get(this).contentSizeInvalidated)
            {
                d.get(this).contentSizeInvalidated = false;
                super.updateContentSize();
            }
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Label = Label;

});
