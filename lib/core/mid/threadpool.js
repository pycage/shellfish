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
    const WORKER_CODE = `
        self.addEventListener("message", (ev) =>
        {
            const msg = ev.data;
            if (msg.type === "task")
            {
                self.postYield = (value) =>
                {
                    self.postMessage({ type: "yield", value });
                };
                self.setResult = (value) =>
                {
                    self.result = value;
                };

                self.parameters = msg.params;

                const codeBlob = new Blob([msg.code], { type: "text/javascript" });
                const codeUrl = URL.createObjectURL(codeBlob);
                importScripts(codeUrl);
                URL.revokeObjectURL(codeUrl);
                self.postMessage({ type: "result", value: self.result });
            }
        });
    `;

    const d = new WeakMap();

    /**
     * Class representing a scalable thread pool.
     * 
     * @memberof mid
     * @extends mid.Object
     */
    exports.ThreadPool = class ThreadPool extends obj.Object
    {
        constructor()
        {
            super();

            const runtimeBlob = new Blob([WORKER_CODE], { type: "text/javascript" });

            d.set(this, {
                size: 1,
                runtimeUrl: URL.createObjectURL(runtimeBlob),
                workers: [],
                queue: []
            });

            this.notifyable("free");
            this.notifyable("size");
            this.notifyable("waiting");

            this.scale(1);

            this.onDestruction = () =>
            {
                d.get(this).queue = [];
                d.get(this).workers.forEach(item =>
                {
                    item.worker.terminate();
                });
                d.get(this).workers = [];
            };
        }

        get hardwareConncurrency() { return navigator.hardwareConcurrency || 1; }

        get free() { return d.get(this).workers.filter(item => item.free).length; }
        get waiting() { return d.get(this).queue.length; }

        get size() { return d.get(this).size; }
        set size(s)
        {
            if (s !== d.get(this).size)
            {
                d.get(this).size = s;
                this.scale(s);
            }
            this.sizeChanged();
        }

        scale(n)
        {
            const priv = d.get(this);

            // re-order so we terminate free tasks first
            priv.workers = priv.workers.sort((a, b) => ! a.free && b.free ? -1 : 1);

            while (n < priv.workers.length)
            {
                const item = priv.workers.pop();
                item.worker.terminate();
            }

            while (n > priv.workers.length)
            {
                const w = new Worker(priv.runtimeUrl);
                const item = { worker: w, free: true, yieldHandler: null, resultHandler: null };
                w.onmessage = this.safeCallback((ev) =>
                {
                    const msg = ev.data;
                    if (msg.type === "result")
                    {
                        console.log("Task Result: " + JSON.stringify(msg.value));
                        if (item.resultHandler)
                        {
                            item.resultHandler(msg.value);
                        }
                        item.free = true;
                        item.yieldHandler = null;
                        item.resultHandler = null;
                        this.freeChanged();
                        this.checkQueue();
                    }
                    else if (msg.type === "yield")
                    {
                        if (item.yieldHandler)
                        {
                            item.yieldHandler(msg.value);
                        }
                    }
                });
                priv.workers.push(item);
            }

            this.freeChanged();
        }

        checkQueue()
        {
            const priv = d.get(this);
            const freeWorkers = priv.workers.filter(item => item.free);
            let freeCount = freeWorkers.length;

            while (freeCount > 0 && priv.queue.length > 0)
            {
                const item = priv.queue.shift();
                this.run(item.code, item.params);
                --freeCount;
                this.waitingChanged();
            }
        }

        run(code, params, yieldHandler, resultHandler)
        {
            const priv = d.get(this);
            const freeWorkers = priv.workers.filter(item => item.free);
            if (freeWorkers.length > 0)
            {
                // run
                const item = freeWorkers[0];
                item.worker.postMessage({ type: "task", code: code, params: params });
                item.free = false;
                item.yieldHandler = yieldHandler;
                item.resultHandler = resultHandler;
                this.freeChanged();
            }
            else
            {
                priv.queue.push({ code, params, yieldHandler, resultHandler });
                this.waitingChanged();
            }
        }
    };
});