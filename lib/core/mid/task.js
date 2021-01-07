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

shRequire([__dirname + "/object.js"], (obj) =>
{
    const d = new WeakMap();

    /**
     * Class representing an asynchronous task for execution in a thread pool.
     * 
     * @memberof mid
     * @extends mid.Object
     */
    exports.Task = class Task extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                pool: null,
                script: ""
            });

            this.notifyable("pool");
            this.notifyable("script");
            
            this.registerEvent("finished");
            this.registerEvent("taskYield");
        }

        get pool() { return d.get(this).pool; }
        set pool(p)
        {
            d.get(this).pool = p;
            this.poolChanged();
        }

        get script() { return d.get(this).script; }
        set script(s)
        {
            d.get(this).script = s;
            this.scriptChanged();
        }

        start()
        {
            const priv = d.get(this);
            if (! priv.pool || ! priv.pool.run)
            {
                console.error("Task requires a ThreadPool instance to run in");
                return;
            }

            priv.pool.run(priv.script, { }, 
            this.safeCallback((value) =>
            {
                this.taskYield(value);
            }),
            this.safeCallback((value) =>
            {
                this.finished(value);
            }));
        }
    };
});