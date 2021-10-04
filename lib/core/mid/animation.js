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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    /**
     * Base class for animations.
     * 
     * @memberof mid
     * @extends mid.Object
     * 
     * @property {bool} busy - [readonly] Whether the animation is currently running.
     * @property {bool} repeat - (default: `false`) Whether the animation repeats itself.
     * @property {running} running - (default: `false`) Whether the animation should be running.
     */
    class Animation extends obj.Object
    {
        constructor()
        {
            super();
            this._sh_animation = true;
            d.set(this, {
                busy: false,
                repeat: false,
                running: false,
                finishHandler: null
            });

            this.notifyable("busy");
            this.notifyable("repeat");
            this.notifyable("running");

            /**
             * Is triggered when the animation begins.
             * @event begin
             * @memberof mid.Animation
             */            
            this.registerEvent("begin");
            /**
             * Is triggered when the animation finishes.
             * @event finish
             * @memberof mid.Animation
             */            
            this.registerEvent("finish");

            this.onBegin = () =>
            {
                d.get(this).busy = true;
                this.busyChanged();
            };

            this.onFinish = () =>
            {
                const f = d.get(this).finishHandler;
                if (f)
                {
                    d.get(this).finishHandler = null;
                    f();
                }
                d.get(this).busy = false;
                this.busyChanged();
            };

            this.onRunningChanged = () =>
            {
                if (d.get(this).running)
                {
                    if (this.lifeCycleStatus === "initialized")
                    {
                        this.start();
                    }
                    else
                    {
                        const handle = low.addFrameHandler(this.safeCallback(() =>
                        {
                            handle.cancel();
                            this.start();
                        }));
                    }
                }
            };
        }

        get busy() { return d.get(this).busy; }

        get repeat() { return d.get(this).repeat; }
        set repeat(v)
        {
            d.get(this).repeat = v;
            this.repeatChanged();
        }

        get running() { return d.get(this).running; }
        set running(v)
        {
            d.get(this).running = v;
            this.runningChanged();
        }

        /**
         * Starts the animation and returns a Promise.
         * 
         * @returns {Promise} A Promise that resolves when the animation finished.
         */
        start()
        {
            this.begin();

            return new Promise((resolve, reject) =>
            {
                d.get(this).finishHandler = resolve;
            });
        }
    }
    exports.Animation = Animation;
});