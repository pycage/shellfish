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

shRequire(["shellfish/low", __dirname + "/object.js"], (low, obj) =>
{
    const d = new WeakMap();

    exports.FpsMeter = class FpsMeter extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                fps: 0,
                running: false,
                handle: null
            });

            this.notifyable("fps");
            this.notifyable("running");

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                if (priv.handle)
                {
                    priv.handle.cancel();
                }
            };
        }

        get fps() { return d.get(this).fps; }

        get running() { return d.get(this).running; }
        set running(v)
        {
            const priv = d.get(this);
            
            priv.running = v;
            this.runningChanged();

            if (v)
            {
                if (! priv.handle)
                {
                    let count = 0;
                    let prevTime = 0;
                    let accumulatedFps = 0;

                    priv.handle = low.addFrameHandler((now) =>
                    {
                        if (prevTime === 0)
                        {
                            prevTime = now;
                        }

                        
                        if (now > prevTime)
                        {
                            accumulatedFps += 1000.0 / (now - prevTime);
                            
                            ++count;
                            if (count === 10)
                            {
                                priv.fps = accumulatedFps / count;
                                this.fpsChanged();
                                count = 0;
                                accumulatedFps = 0;
                            }
                            
                            prevTime = now;
                        }
                        
                    }, this.objectLocation);
                }
            }
            else
            {
                if (priv.handle)
                {
                    priv.handle.cancel();
                    priv.handle = null;
                }
            }
        }
    };
});