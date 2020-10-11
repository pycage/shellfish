/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/object.js", __dirname + "/util/bezier-easing.js"], function (low, obj, bezier)
{
    /* Creates an interpolation function for the given key points.
     */
    function interpolation(keyPoints)
    {
        const ks = Object.keys(keyPoints).sort();
        return v => {
            for (let i = 1; i < ks.length; ++i)
            {
                if (v >= ks[i - 1] && v <= ks[i])
                {
                    const x1 = ks[i - 1];
                    const x2 = ks[i];
                    const y1 = keyPoints[x1];
                    const y2 = keyPoints[x2];
                    const x = (v - x1) / (x2 - x1);
                    return y1 + (y2 - y1) * x;
                }
            }
            return 1;
        };
    }

    /* Creates and returns an easing function for the easing given its name.
     */
    function createEasing(name)
    {
        // easing functions taken from the Easing Functions Cheat Sheet
        // by Andrey Sitnik and Ivan Solovev (https://easings.net)
        switch (name)
        {
        case "Linear": return v => v;

        case "InSine": return bezier.bezier(0.47, 0, 0.745, 0.715);
        case "OutSine": return bezier.bezier(0.39, 0.575, 0.565, 1);
        case "InOutSine": return bezier.bezier(0.445, 0.05, 0.55, 0.95);

        case "InQuad": return bezier.bezier(0.55, 0.085, 0.68, 0.53);
        case "OutQuad": return bezier.bezier(0.25, 0.46, 0.45, 0.94);
        case "InOutQuad": return bezier.bezier(0.455, 0.03, 0.515, 0.955);

        case "InCubic": return bezier.bezier(0.55, 0.055, 0.675, 0.19);
        case "OutCubic": return bezier.bezier(0.215, 0.61, 0.355, 1);
        case "InOutCubic": return bezier.bezier(0.645, 0.045, 0.355, 1);

        case "InQuart": return bezier.bezier(0.895, 0.03, 0.685, 0.22);
        case "OutQuart": return bezier.bezier(0.165, 0.84, 0.44, 1);
        case "InOutQuart": return bezier.bezier(0.77, 0, 0.175, 1);

        case "InQuint": return bezier.bezier(0.755, 0.05, 0.855, 0.06);
        case "OutQuint": return bezier.bezier(0.23, 1, 0.32, 1);
        case "InOutQuint": return bezier.bezier(0.86, 0, 0.07, 1);

        case "InExpo": return bezier.bezier(0.95, 0.05, 0.795, 0.035);
        case "OutExpo": return bezier.bezier(0.19, 1, 0.22, 1);
        case "InOutExpo": return bezier.bezier(1, 0, 0, 1);

        case "InCirc": return bezier.bezier(0.6, 0.04, 0.98, 0.335);
        case "OutCirc": return bezier.bezier(0.075, 0.82, 0.165, 1);
        case "InOutCirc": return bezier.bezier(0.785, 0.135, 0.15, 0.86);

        case "InBack": return bezier.bezier(0.6, -0.28, 0.735, 0.045);
        case "OutBack": return bezier.bezier(0.175, 0.885, 0.32, 1.275);
        case "InOutBack": return bezier.bezier(0.68, -0.55, 0.265, 1.55);

        case "InElastic": return interpolation({
            0: 0,
            0.18: 0,
            0.26: -0.01,
            0.28: -0.01,
            0.4: 0.02,
            0.42: 0.02,
            0.56: -0.05,
            0.58: -0.04,
            0.72: 0.13,
            0.86: -0.37,
            1: 1
        });
        case "OutElastic": return interpolation({
            0: 0,
            0.16: 1.32,
            0.28: 0.87,
            0.44: 1.05,
            0.59: 0.98,
            0.73: 1.01,
            0.88: 1,
            1: 1
        });
        case "InOutElastic": return interpolation({
            0: 0,
            0.08: 0,
            0.18: -0.01,
            0.2: 0,
            0.28: 0.02,
            0.3: 0.02,
            0.38: -0.09,
            0.4: -0.12,
            0.6: 1.12,
            0.62: 1.09,
            0.7: 0.98,
            0.72: 0.98,
            0.8: 1,
            0.82: 1.01,
            0.9: 1,
            1: 1
        });

        case "InBounce": return interpolation({
            0: 0,
            0.04: 0.02,
            0.08: 0.01,
            0.18: 0.06,
            0.26: 0.02,
            0.46: 0.25,
            0.64: 0.02,
            0.76: 0.56,
            0.88: 0.89,
            1: 1
        });

        case "OutBounce": return interpolation({
            0: 0,
            0.12: 0.11,
            0.24: 0.44,
            0.36: 0.98,
            0.54: 0.75,
            0.74: 0.98,
            0.82: 0.94,
            0.92: 0.99,
            0.96: 0.98,
            1: 1
        });

        case "InOutBounce": return interpolation({
            0: 0,
            0.02: 0.01,
            0.04: 0,
            0.1: 0.03,
            0.14: 0.01,
            0.22: 0.12,
            0.32: 0.01,
            0.42: 0.4,
            0.5: 0.5,
            0.58: 0.6,
            0.68: 0.99,
            0.78: 0.88,
            0.86: 0.99,
            0.9: 0.97,
            0.96: 1,
            0.98: 0.99,
            1: 1
        });
        }

        return v => 0;
    }

    const d = new WeakMap();

    /**
     * Class representing a number animation along an easing curve between
     * two values.
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {number} duration - (default: `300`) The duration of the animation in ms.
     * @property {string} easing - (default: `"InOutQuad"`) The easing curve of the animation.
     * @property {bool} enabled - (default: `true`) Whether the animation is enabled.
     * @property {function} interpolate - (default: `(v1, v2, x) => v1 + (v2 - v1) * x`) The interpolation function.
     * @property {number} from - (default: `0`) The starting value.
     * @property {number} to - (default: `1`) The ending value.
     */
    exports.NumberAnimation = class NumberAnimation extends obj.Object
    {
        constructor()
        {
            super();
            this._sh_animation = true;
            d.set(this, {
                interpolate: (v1, v2, x) => v1 + (v2 - v1) * x,
                enabled: true,
                duration: 3000,
                from: 0,
                to: 1,
                easing: "InOutQuad",
                handle: null
            });

            this.notifyable("enabled");
            this.notifyable("duration");
            this.notifyable("from");
            this.notifyable("to");
            this.notifyable("easing");

            /**
             * Is triggered for each animation frame.
             * @event next
             * @param {number} value - The value for the animation frame.
             * @memberof mid.NumberAnimation
             */
            this.registerEvent("next");
            /**
             * Is triggered when the animation finished.
             * @event finished
             * @memberof mid.NumberAnimation
             */
            this.registerEvent("finished");

            this.onDestruction = () =>
            {
                if (d.get(this).handle)
                {
                    d.get(this).handle.cancel();
                }
            };
        }

        get enabled() { return d.get(this).enabled; }
        set enabled(v)
        {
            d.get(this).enabled = v;
            this.enabledChanged();
        }

        get duration() { return d.get(this).duration; }
        set duration(duration)
        {
            d.get(this).duration = duration;
            this.durationChanged();
        }

        get from() { return d.get(this).from; }
        set from(v)
        {
            d.get(this).from = v;
            this.fromChanged();
        }

        get to() { return d.get(this).to; }
        set to(v)
        {
            d.get(this).to = v;
            this.toChanged();
        }

        get interpolate() { return d.get(this).interpolate; }
        set interpolate(f)
        {
            d.get(this).interpolate = f;
        }

        get easing() {return d.get(this).easing; }
        set easing(easing)
        {
            d.get(this).easing = easing;
            this.easingChanged();
        }

        /**
         * Starts the animation.
         * @memberof mid.NumberAnimation
         * @param {function} valueCallback - The callback that is invoked with a value for each animation frame.
         */
        start(valueCallback)
        {
            let t = 0;
            let prevTimestamp = 0;
            const priv = d.get(this);
            const from = priv.from;
            const to = priv.to;
            const duration = priv.duration;
            const interpolate = priv.interpolate;
            const easing = createEasing(priv.easing);

            const callback = (timestamp) =>
            {
                let diff = 0;
                if (prevTimestamp > 0)
                {
                    diff = timestamp - prevTimestamp;
                }
                prevTimestamp = timestamp;

                t += diff;
                const value = (t >= duration) ? to
                                              : interpolate(from, to, easing(Math.min(t / duration, 1)));
                this.next(value);

                if (valueCallback)
                {
                    valueCallback(value);
                }

                if (t >= duration)
                {
                    priv.handle.cancel();
                    priv.handle = null;
                    this.finished();
                }
            };

            if (priv.handle)
            {
                priv.handle.cancel();
            }

            priv.handle = low.addFrameHandler(callback, this.objectLocation);
        }
    };

});