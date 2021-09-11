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

shRequire([__dirname + "/../low.js", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    /**
     * Class representing a frame timer that triggers in sync with the screen
     * refresh rate.
     * 
     * @memberof mid
     * @extends mid.Object
     * 
     * @property {number} fps (default: `60`) How many times the timer should trigger per second.
     * @property {bool} repeat (default: `false`) Whether the timer repeats itself.
     * @property {bool} running (default: `false`) Whether the timer should be running.
     */
    class FrameTimer extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                running: false,
                repeat: false,
                currentTimer: null,
                interval: Math.floor(1000.0 / 60),
                fps: 60
            });

            this.notifyable("fps");
            this.notifyable("running");
            this.notifyable("repeat");

            /**
             * Is triggered on timeout.
             * @event timeout
             * @memberof mid.FrameTimer
             * @param {number} now - The current timestamp.
             * @param {number} elapsed - The amount of milliseconds elapsed since the previous timeout.
             */
            this.registerEvent("timeout");

            this.onInitialization = () =>
            {
                if (d.get(this).running)
                {
                    this.start();
                }
            };

            this.onDestruction = () =>
            {
                this.stop();
            };
        }

        get fps() { return d.get(this).fps; }
        set fps(v)
        {
            d.get(this).fps = v;
            d.get(this).interval = Math.floor(1000.0 / v);
            this.fpsChanged();
        }

        get running() { return d.get(this).running; }
        set running(v)
        {
            d.get(this).running = v;
            this.runningChanged();

            if (v)
            {
                if (this.lifeCycleStatus === "initialized")
                {
                    this.start();
                }
            }
            else
            {
                this.stop();
            }
        }

        get repeat() { return d.get(this).repeat; }
        set repeat(v)
        {
            d.get(this).repeat = v;
            this.repeatChanged();
        }

        /**
         * Starts or restarts the timer.
         */
        start()
        {
            this.stop();

            const priv = d.get(this);

            let prevNow = 0;
            priv.currentTimer = low.addFrameHandler(this.safeCallback(now =>
            {
                if (prevNow === 0)
                {
                    prevNow = now;
                }
                const elapsed = now - prevNow;
                if (elapsed >= priv.interval)
                {
                    this.timeout(now, elapsed);
                    prevNow = now;
                }

                if (priv.repeat && priv.running)
                {
                    // repeat
                }
                else if (priv.currentTimer)
                {
                    priv.currentTimer.cancel();
                    priv.currentTimer = null;
                }
            }), this.objectType + "@" + this.objectLocation);
        }

        /**
         * Stops the timer.
         */
        stop()
        {
            const priv = d.get(this);
            if (priv.currentTimer)
            {
                priv.currentTimer.cancel();
                priv.currentTimer = null;
            }
        }
    }
    exports.FrameTimer = FrameTimer;
});