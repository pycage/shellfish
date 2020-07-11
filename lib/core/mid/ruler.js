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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    /**
     * Class representing a ruler for aligning multiple items.
     * 
     * The ruler has `min` and `max` properties with minimum and maximum values,
     * respectively. By calling `request` with a bounding box, these properties
     * are updated. Items call `request` automatically if they have the `ruler`
     * property set. See {@link Item#ruler}.
     * 
     * Items may use the ruler for alignment.
     * 
     * #### Example:
     * 
     *     // both labels have the same minimum width, which matches the wider
     *     // one of the labels
     *     Ruler { id: labelsRuler }
     *     Label {
     *         ruler: labelsRuler
     *         minWidth: labelsRuler.max.width
     *         text: "A label"
     *     }
     *     Label {
     *         ruler: labelsRuler
     *         minWidth: labelsRuler.max.width
     *         text: "Another label"
     *     }
     * 
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {object} max - [readonly] The maximum values: `{ x, y, width, height }`
     * @property {object} min - [readonly] The minimum values: `{ x, y, width, height }`
     * 
     */
    exports.Ruler = class Ruler extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                frameHandle: null,
                min: {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                },
                max: {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                }
            });

            this.notifyable("min");
            this.notifyable("max");
        }

        get min() { return d.get(this).min; }
        get max() { return d.get(this).max; }

        reset()
        {
            d.get(this).min = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
            d.get(this).max = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
            this.minChanged();
            this.maxChanged();
        }

        /**
         * Takes a bounding box into account for aligning the `min` and `max`
         * values.
         * @memberof mid.Ruler
         * 
         * @param {object} bbox - The bounding box `{ x, y, width, height }`.
         */
        request(bbox)
        {
            const min = d.get(this).min;
            const max = d.get(this).max;
            let minChanged = false;
            let maxChanged = false;

            if (bbox.width < min.width || min.width === 0)
            {
                min.width = bbox.width;
                minChanged = true;
            }

            if (bbox.width > max.width)
            {
                max.width = bbox.width;
                maxChanged = true;
            }

            if (bbox.height < min.height || min.height === 0)
            {
                min.height = bbox.height;
                minChanged = true;
            }

            if (bbox.height > max.height)
            {
                max.height = bbox.height;
                maxChanged = true;
            }

            if ((minChanged || maxChanged) && ! d.get(this).frameHandle)
            {
                d.get(this).frameHandle = low.addFrameHandler(() =>
                {
                    d.get(this).frameHandle.cancel();
                    d.get(this).frameHandle = null;
                    this.minChanged();
                    this.maxChanged();
                });
            }
        }
    };
});