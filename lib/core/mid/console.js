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

shRequire([__dirname + "/../low.js", __dirname + "/object.js"], function (low, obj)
{
    let isConsoleCaptured = false;

    function captureConsole(target)
    {
        try
        {
            const clear = console.clear;
            const error = console.error;
            const warn = console.warn;
            const info = console.info;
            const log = console.log;
            const debug = console.debug;

            console.clear = (...args) => { clear(...args); target.clear(...args); };
            console.error = (...args) => { error(...args); target.error(...args); };
            console.warn = (...args) => { warn(...args); target.warn(...args); };
            console.info = (...args) => { info(...args); target.info(...args); };
            console.log = (...args) => { log(...args); target.log(...args); };
            console.debug = (...args) => { debug(...args); target.debug(...args); };

            isConsoleCaptured = true;
        }
        catch (err)
        {
            // could not capture console
        }
    }

    const d = new WeakMap();

    /**
     * Class representing the a debug console list model.
     * 
     * Console messages are globally redirected to this model if at least one
     * instance of this class exists.
     */
    exports.Console = class Console extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                buffer: []
            });

            this.notifyable("size");

            this.registerEvent("modelReset");
            this.registerEvent("modelInsert");
            this.registerEvent("modelRemove");

            if (! isConsoleCaptured)
            {
                captureConsole(this);
            }
        }

        get size() { return d.get(this).buffer.length; }

        append(level, msg)
        {
            d.get(this).buffer.push({
                timestamp: new Date().getTime(),
                level: level,
                message: msg
            });
            this.modelInsert(d.get(this).buffer.length - 1, 1);
            this.sizeChanged();
        }

        clear()
        {
            d.get(this).buffer = [];
            this.sizeChanged();
            this.modelReset();
        }

        error(msg)
        {
            this.append("error", msg);
        }

        warn(msg)
        {
            this.append("warn", msg);
        }

        info(msg)
        {
            this.append("info", msg);
        }

        log(msg)
        {
            this.append("log", msg);
        }

        debug(msg)
        {
            this.append("debug", msg);
        }

        at(n)
        {
            return d.get(this).buffer[n];
        }
    };
});