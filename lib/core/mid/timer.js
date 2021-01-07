/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js"], function (obj)
{
    const d = new WeakMap();

    /* Class representing a timer.
     */
    exports.Timer = class Timer extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                running: false,
                repeat: false,
                interval: 0,
                currentTimer: null
            });

            this.notifyable("running");
            this.notifyable("repeat");
            this.notifyable("interval");

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

        get interval() { return d.get(this).interval; }
        set interval(v)
        {
            d.get(this).interval = v;
            this.intervalChanged();
        }

        start()
        {
            this.stop();

            const priv = d.get(this);

            const cb = () =>
            {
                this.timeout();

                if (priv.repeat && priv.running)
                {
                    priv.currentTimer = setTimeout(cb, priv.interval);
                }
                else
                {
                    priv.currentTimer = null;
                }

            };

            priv.currentTimer = setTimeout(cb, priv.interval);
        }

        stop()
        {
            const priv = d.get(this);
            if (priv.currentTimer)
            {
               clearTimeout(priv.currentTimer);
               priv.currentTimer = null;
            }
        }
    };
});