/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/listmodel.js"], lm =>
{
    function symmetricFloor(v)
    {
        return v < 0 ? Math.ceil(v) : Math.floor(v);
    }
    
    function symmetricCeil(v)
    {
        return v < 0 ? Math.floor(v) : Math.ceil(v);
    }
    
    /**
     * Rounds a value to the closest tick position.
     *
     * @param {number} v - The value to round.
     * @returns {number} The rounded value.
     */
    function roundValue(v)
    {
        if (! Math.abs(v) > 0.0)
        {
            // value is 0.0
            return 0.0;
        }
    
        let testValue = v;
        let count = 0;
        let factor = 1;
    
        // count how often a factor has to be applied before the value
        // may be rounded
        if (Math.abs(testValue) > 1.0)
        {
            // divide by 10 until the value is not greater than 1.0
            while (Math.abs(testValue) > 1.0)
            {
                testValue /= 10.0;
                ++count;
                if (count >= 10) break;
            }
            factor = 10;
        }
        else if (Math.abs(testValue) > 0.0)
        {
            // multiply by 10 until the value not less than 1.0
            while (Math.abs(testValue) < 1.0)
            {
                testValue *= 10.0;
                ++count;
                if (count >= 10) break;
            }
            --count;
            factor = 0.1;
        }
    
        // scale value, ceil value, scale value back
    
        for (let i = 0; i < count; ++i)
        {
          v /= factor;
        }
        v = symmetricCeil(v);
        for (let i = 0; i < count; ++i)
        {
          v *= factor;
        }
    
        return v;
    }
    
    /**
     * Finds the amount of decimal digits required for the scale.
     *
     * @param {number} distance - The distance between ticks.
     * @returns {number} The amount of decimal digits.
     */
    function findPrecision(distance)
    {
        let count = 0;
        while (Math.abs(distance) > 0.0 && Math.abs(distance) < 1.0)
        {
            distance *= 10.0;
            ++count;
        }
        return count;
    }
    
    
    const d = new WeakMap();
    
    /**
     * Class representing a model for generating a scale. This model computes
     * the position of tick lines between two points. The precision is
     * determined automatically.
     * 
     * The model items are dictionary objects of the form
     * `{ position, value }`
     * with `position` being a position between `0.0` and `1.0` and `value`
     * being a value between `begin` and `end`.
     * 
     * Example of a simple scale display using a {@link core.Repeater}:
     * ```
     * Box {
     *     id: scale
     * 
     *     fill: true
     *
     *     ScaleModel {
     *         id: scaleModel
     * 
     *         begin: 0.0
     *         end: 60.0
     *         maxTicks: 50
     *     }
     *
     *     Repeater {
     *         model: scaleModel
     *
     *         delegate: template Box {
     *             position: "free"
     *             y: modelData.value.position * scale.bboxHeight
     *             width: 30
     *             height: 1
     *             color: "black"
     *         }
     *     }
     * }
     * ```
     * 
     * @memberof core
     * @extends core.ListModel
     * 
     * @property {number} begin - (default: `0`) The beginning point of the scale. This value may be greater than `end` for flipping the direction.
     * @property {number} end - (default: `100`) The ending point of the scale. This value may be less than `begin` for flipping the direction.
     * @property {number} maxTicks - (default: `10`) The maximum amount of tick lines. If this maximum would be exceeded, the precision is decreased instead.
     * @property {number} precision - [readonly] The current precision, i.e. the number of digits required after the decimal point for representing the tick values.
     */
    class ScaleModel extends lm.ListModel
    {
        constructor()
        {
            super();
            d.set(this, {
                begin: 0,
                end: 100,
                maxTicks: 10,
                precision: 0
            });
    
            this.notifyable("begin");
            this.notifyable("end");
            this.notifyable("maxTicks");
            this.notifyable("precision");
        }
    
        get begin() { return d.get(this).begin; }
        set begin(b)
        {
            d.get(this).begin = b;
            this.beginChanged();
            this.updateModel();
        }
    
        get end() { return d.get(this).end; }
        set end(e)
        {
            d.get(this).end = e;
            this.endChanged();
            this.updateModel();
        }
    
        get maxTicks() { return d.get(this).maxTicks; }
        set maxTicks(m)
        {
            d.get(this).maxTicks = m;
            this.maxTicksChanged();
            this.updateModel();
        }
    
        get precision() { return d.get(this).precision; }
    
        /**
         * Returns the position of the given value on the scale.
         * The position is a value between `0.0` and `1.0`.
         * 
         * @param {number} v - The value.
         * @returns {number} The position of the value.
         */
        valueToPosition(v)
        {
            const priv = d.get(this);
            const scale = (priv.end - priv.begin) / 1.0;
            return scale !== 0 ? (v - priv.begin) / scale
                               : 0;
        }
    
        updateModel()
        {
            const priv = d.get(this);
    
            const rangeSize = priv.end - priv.begin;
            const tickDistance = roundValue(rangeSize / priv.maxTicks);
    
            let tickAmount = 0;
            if (tickDistance !== 0)
            {
                tickAmount = Math.floor(Math.abs(rangeSize / tickDistance)) + 1;
            }
    
            // displace ticks by offset
            const offset = priv.begin < priv.end ? symmetricCeil(priv.begin / tickDistance) * tickDistance - priv.begin
                                                 : symmetricFloor(priv.begin / tickDistance) * tickDistance - priv.begin;
    
            const newTicks = [];
    
            for (let i = 0; i < tickAmount; ++i)
            {
                const value = priv.begin + offset + i * tickDistance;
                const pos = this.valueToPosition(value);
    
                if (pos < 0.0 || pos > 1.0)
                {
                    // not in visible range
                    continue;
                }
    
                newTicks.push({ position: pos, value });
            }
    
            newTicks.sort((a, b) => a.position - b.position);
    
            priv.precision = findPrecision(tickDistance);
            this.precisionChanged();
    
    
            // update model
    
            if (Math.abs(newTicks.length - this.size) < this.size / 2)
            {
                // remove exceeding ticks
                while (this.size > newTicks.length)
                {
                    this.remove(this.size - 1);
                }
    
                // update or insert ticks
                for (let idx = 0; idx < newTicks.length; ++idx)
                {
                    const tick = newTicks[idx];
                    if (idx < this.size)
                    {
                        this.replace(idx, tick);
                    }
                    else
                    {
                        this.bulkInsert(this.size, newTicks.slice(idx));
                        break;
                    }
                }
            }
            else
            {
                this.reset(newTicks);
            }
        }
    }
    exports.ScaleModel = ScaleModel;
});


