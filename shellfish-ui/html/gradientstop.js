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

shRequire(["shellfish/core"], function (core)
{
    let d = new WeakMap();

    /**
     * Class representing a gradient stop for use in gradient elements.
     * 
     * @memberof mid
     * @extends core.Object
     * 
     * @property {string} color - (default: `"red"`) The color at this stop.
     * @property {number} position - (default: `0`) The position of this stop as a value between `0` and `1`.
     */
    class GradientStop extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                color: this.colorName("red"),
                position: 0
            });

            this.notifyable("color");
            this.notifyable("position");

            /**
             * Is triggered when the values change.
             * @event valuesChange
             * @memberof html.GradientStop
             */
            this.registerEvent("valuesChange");
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).color = col;
            this.colorChanged();
            this.valuesChange();
        }

        get position() { return d.get(this).position; }
        set position(p)
        {
            d.get(this).position = p;
            this.positionChanged();
            this.valuesChange();
        }        
    }
    exports.GradientStop = GradientStop;
});
