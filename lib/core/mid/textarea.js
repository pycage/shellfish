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
     * @property {number} column - The column of the current cursor position (the first column is `0`).
     * @property {string} fontFamily - The font family.
     * @property {number} fontSize - The font size in CSS pixels.
     * @property {number} row - The row of the current cursor position (the first row is `0`).
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
                color: this.colorName("black"),
                caretColor: this.colorName("black"),
                selectionColor: this.colorName("white"),
                selectionBackgroundColor: this.colorName("navy"),
                spellCheck: false,
                item: low.createElementTree(
                    low.tag("textarea")
                    .class("sh-text-selectable sh-no-scrollbars")
                    .attr("wrap", "off")
                    .attr("spellcheck", "false")
                    .style("color", "black")
                    .style("caret-color", "black")
                    .style("--sh-selection-color", "white")
                    .style("--sh-selection-background-color", "navy")
                    .html()
                )
            });

            this.notifyable("bold", true);
            this.notifyable("caretColor");
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
            }, false);

            this.addHtmlEventListener(d.get(this).item, "keydown", (ev) =>
            {
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    if (this.lifeCycleStatus === "initialized")
                    {
                        this.selectionStartChanged();
                        this.selectionEndChanged();
                        this.columnChanged();
                        this.rowChanged();
                    }
                });

                if (! ev.altKey && ! ev.ctrlKey && ! ev.metaKey)
                {
                    // stop propagation but allow default action
                    ev.stopPropagation();
                }
            });

            this.addHtmlEventListener(d.get(this).item, "select", (ev) =>
            {
                this.selectionStartChanged();
                this.selectionEndChanged();
                this.columnChanged();
                this.rowChanged();
            });

            this.addHtmlEventListener(d.get(this).item, "click", () =>
            {
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    if (this.lifeCycleStatus === "initialized")
                    {
                        this.selectionStartChanged();
                        this.selectionEndChanged();
                        this.columnChanged();
                        this.rowChanged();
                    }
                });
            });

            this.addHtmlEventListener(d.get(this).item, "mousemove", (ev) =>
            {
                if (ev.buttons !== 0)
                {
                    const handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        if (this.lifeCycleStatus === "initialized")
                        {
                            this.columnChanged();
                            this.rowChanged();
                        }
                    });
                }
            });

            this.onTextChanged = () =>
            {
                this.contentWidthChanged();
                this.contentHeightChanged();
                this.columnChanged();
                this.rowChanged();
            };

            this.onBboxChanged = () =>
            {
                this.contentWidthChanged();
                this.contentHeightChanged();
            };
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

        get caretColor() { return d.get(this).caretColor; }
        set caretColor(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            this.css("caret-color", col.toCss());
            d.get(this).caretColor = col;
            this.caretColorChanged();
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
            return this.rowAt(d.get(this).item.selectionStart);
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
            this.selectionStartChanged();
            this.selectionEndChanged();
        }

        /**
         * Inserts a text string at the given text position.
         * 
         * @param {number} pos - The text position to insert at. The text is inserted before the character at this position.
         * @param {string} text - The text to insert.
         * @see {@link mid.TextArea#positionAt positionAt}
         */
        insertAt(pos, text)
        {
            const selStart = this.selectionStart;
            const selEnd = this.selectionEnd;

            const t = this.text;
            if (pos >= 0 && pos < t.length)
            {
                this.text = t.substr(0, pos) + text + t.substr(pos);
            }
            else
            {
                this.text = t + text;
            }

            // restore selection / cursor
            if (selStart < selEnd)
            {
                d.get(this).item.setSelectionRange(selStart, selEnd + text.length);
            }
            else
            {
                d.get(this).item.setSelectionRange(selStart + text.length, selStart + text.length);
            }
        }

        /**
         * Erases a text string at the given text position.
         * 
         * @param {number} pos - The text position to erase from.
         * @param {number} n - The amount of characters to erase.
         * @see {@link mid.TextArea#positionAt positionAt}
         */
        eraseAt(pos, n)
        {
            const selStart = this.selectionStart;
            const selEnd = this.selectionEnd;

            const t = this.text;
            this.text = t.substr(0, pos) + t.substr(pos + n);

            // restore selection / cursor
            if (selStart < selEnd)
            {
                d.get(this).item.setSelectionRange(selStart, selEnd - n);
            }
            else
            {
                d.get(this).item.setSelectionRange(selStart - n, selStart - n);
            }
        }

        /**
         * Shifts the given rows by an amount.
         * 
         * @param {number} rowStart - The first row to shift.
         * @param {number} rowEnd - The last row to shift.
         * @param {number} by - The positive or negative amount of lines to shift.
         */
        shiftRows(rowStart, rowEnd, by)
        {
            const selStart = this.selectionStart;
            const selEnd = this.text[this.selectionEnd - 1] !== "\n" ? this.selectionEnd : this.selectionEnd - 1;
            const selStartRow = this.rowAt(selStart);
            const selStartCol = selStart - this.positionAt(selStartRow, 0);
            const selEndRow = this.rowAt(selEnd);
            const selEndCol = selEnd - this.positionAt(selEndRow, 0);

            // shift lines
            const parts = this.text.split("\n");
            if (rowStart + by < 0 || rowEnd + by >= parts.length)
            {
                return;
            }
            const linesToShift = parts.splice(rowStart, rowEnd - rowStart + 1);
            parts.splice(rowStart + by, 0, ...linesToShift);
            this.text = parts.join("\n");

            // restore selection / cursor
            let newSelStartRow = selStartRow;
            let newSelEndRow = selEndRow;
            if (selStartRow >= rowStart && selStartRow <= rowEnd)
            {
                newSelStartRow += by;
            }
            else if (selStartRow < rowStart && selStartRow >= rowStart + by)
            {
                newSelStartRow -= by;
            }
            else if (selStartRow > rowEnd && selStartRow <= rowEnd + by)
            {
                newSelStartRow -= by;
            }
            if (selEndRow >= rowStart && selEndRow <= rowEnd)
            {
                newSelEndRow += by;
            }
            else if (selEndRow < rowStart && selEndRow >= rowStart + by)
            {
                newSelEndRow -= by;
            }
            else if (selEnd > rowEnd && selEndRow <= rowEnd + by)
            {
                newSelEndRow -= by;
            }

            d.get(this).item.setSelectionRange(
                this.positionAt(newSelStartRow, selStartCol),
                this.positionAt(newSelEndRow, selEndCol)
            );
        }

        /**
         * Sets the input cursor position.
         * 
         * @param {number} row - The row number (the first row is `0`).
         * @param {number} column - The column number (the first column is `0`).
         * @see {@link mid.TextArea#positionAt positionAt}
         */
        setCursor(row, column)
        {
            const pos = this.positionAt(row, column);
            d.get(this).item.setSelectionRange(pos, pos);
            this.rowChanged();
            this.columnChanged();
        }

        /**
         * Returns the text position of the given cursor position.
         * 
         * @param {number} row - The row number (the first row is `0`).
         * @param {number} column - The column number (the first column is `0`).
         * @returns {number} The text position.
         */
        positionAt(row, column)
        {
            const t = this.text;
            let pos = 0;
            for (let i = 0; i < row; ++i)
            {
                pos = t.indexOf("\n", pos) + 1;
                if (pos === 0)
                {
                    // past the last row
                    break;
                }
            }
            return pos + column;
        }

        /**
         * Returns the row at the given text position. To get the column,
         * calculate `position - positionAt(rowAt(position), 0)`.
         * 
         * @param {number} position - The text position.
         * @returns {number} The row.
         */
        rowAt(position)
        {
            if (position === -1)
            {
                return 0;
            }

            let pos = d.get(this).item.value.indexOf("\n");
            let row = 0;
            while (pos !== -1 && pos < position)
            {
                pos = d.get(this).item.value.indexOf("\n", pos + 1);
                ++row;
            }
            return row;
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.TextArea = TextArea;

});