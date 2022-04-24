/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", "shellfish/core"], function (low, core)
{
    function escape(s)
    {
        return low.escapeHtml(s).replace(/\n/g, "<br>").replace(/ /g, "&nbsp;");
    }

    const d = new WeakMap();

    /**
     * Class representing a syntax token defined by a regular expression.
     * 
     * @memberof html
     * @extends core.Object
     * 
     * @property {RegExp} regexp - (default: `/./`) The regular expression to match the token.
     * @property {html.Color} color - (default: `"black"`) The color of the token.
     */
    class SyntaxToken extends core.Object
    {
        constructor()
        {
            super();
            this._sh_syntaxtoken = true;
            d.set(this, {
                regexp: new RegExp("."),
                color: this.colorName("black")
            });

        }

        get regexp() { return d.get(this).regexp; }
        set regexp(re) { d.get(this).regexp = re; }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).color = col;
        }
    }
    exports.SyntaxToken = SyntaxToken;

    /**
     * Class representing a syntax highlighter.
     * 
     * The syntax highlighter provides a {@link html.SyntaxHighlighter#filter filter}
     * method for processing text according to its child tokens of type
     * {@link html.SyntaxToken}.
     * 
     * The order of child elements is important as the first matching token will
     * be used. Also be sure to use the non-greedy repeaters `*?` and `+?`
     * where it makes a difference.
     * 
     * When matching multiple lines with the `m` flag of the regular expression,
     * remember that `.` never matches a line break (`\n`) and you should use
     * `[\s\S]` instead.
     *
     * @memberof html
     * @extends core.Object
     */
    class SyntaxHighlighter extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                tokens: []
            });
        }

        /**
         * Applies syntax highlighting on the given text string according to
         * the syntax tokens of this syntax highlighter. The result is in HTML
         * format.
         * 
         * @param {string} s - The text string to process.
         * @returns {string} - The string with syntax highlighting.
         */
        filter(s)
        {
            const priv = d.get(this);

            let out = "";
            let pos = 0;
            while (pos < s.length)
            {
                const matches = priv.tokens
                .map(t => [s.substr(pos).match(t.regexp), t])
                .filter(m => m[0] !== null);
                //.sort((a, b) => a[0][0].length > b[0][0].length ? -1 : 1);
                
                if (matches.length === 0)
                {
                    ++pos;
                    out += escape(s.substr(pos - 1, 1));
                }
                else
                {
                    //console.log(matches);
                    const match = matches[0];
                    pos += match[0][0].length;
                    out += "<span style=\"color: " + match[1].token.color.toCss() + "\">" + escape(match[0][0]) + "</span>";
                    //console.log("<span style=\"color: " + match[1].token.color.toCss() + "\">" + escape(match[0][0]) + "</span>");
                }
            }
            return out;
        }

        add(token)
        {
            if (token._sh_syntaxtoken)
            {
                token.parent = this;
                const re = new RegExp("^(" + token.regexp.source + ")", token.regexp.flags);
                d.get(this).tokens.push({ regexp: re, token: token });
            }
            else
            {
                console.error("Only syntax tokens may be added to a SyntaxHighlighter.");
            }
        }
    }
    exports.SyntaxHighlighter = SyntaxHighlighter;

});