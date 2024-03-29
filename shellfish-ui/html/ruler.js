/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2023 Martin Grimme <martin.grimme@gmail.com>

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
    const d = new WeakMap();

    /**
     * Class representing a ruler for aligning multiple items.
     * 
     * The ruler has `min` and `max` properties with minimum and maximum values,
     * respectively. By calling {@link html.Ruler#request request} with a bounding box, these properties
     * are updated. Items call {@link html.Ruler#request request} automatically if they have the `ruler`
     * property set. See {@link html.Item Item.ruler}.
     * 
     * @example
     * // both labels have the same minimum width, which matches the wider
     * // one of the labels
     * Ruler { id: labelsRuler }
     * Label {
     *     ruler: labelsRuler
     *     minWidth: labelsRuler.max.width
     *     text: "A label"
     * }
     * Label {
     *     ruler: labelsRuler
     *     minWidth: labelsRuler.max.width
     *     text: "Another label"
     * }
     * 
     * @extends core.Object
     * @memberof html
     * 
     * @property {BoundingBox} max - [readonly] The maximum bounding box.
     * @property {BoundingBox} min - [readonly] The minimum bounding box.
     * 
     */
    class Ruler extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
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

        /**
         * Resets the values collected by this ruler.
         */
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
         * properties.
         * 
         * @param {BoundingBox} bbox - A bounding box.
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

            if (minChanged) this.defer(() => { this.minChanged(); }, "minChanged");
            if (maxChanged) this.defer(() => { this.maxChanged(); }, "maxChanged");
        }
    }
    exports.Ruler = Ruler;
});