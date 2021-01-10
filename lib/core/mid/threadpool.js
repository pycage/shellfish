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
        const methods = new Map();
        let transferList = [];

        class AtomicInt32
        {
            constructor(buffer)
            {
                this.view = new Int32Array(buffer);
            }
    
            get value() { return Atomics.load(this.view, 0); }
            set value(v) { return Atomics.store(this.view, 0, v); }
    
            add(v) { return Atomics.add(this.view, 0, v); }
            and(v) { return Atomics.and(this.view, 0, v); }
            or(v) { return Atomics.or(this.view, 0, v); }
            sub(v) { return Atomics.sub(this.view, 0, v); }
            wait(forValue, timeout)
            {
                while (true)
                {
                    const status = Atomics.wait(this.view, 0, forValue, timeout);
                    if (status === "timed-out")
                    {
                        return false;
                    }
                    else if (status === "ok")
                    {
                        return true;
                    }
                }
            }
        };

        function sleep(ms)
        {
            const buf = new SharedArrayBuffer(4);
            const view = new Int32Array(buf);
            Atomics.wait(view, 0, 0, ms);
        }

        function transfer(v)
        {
            transferList.push(v);
            return v;
        }

        function registerMethod(name, f)
        {
            methods.set(name, f);
        }

        function setResult(value)
        {
            self.postMessage({ type: "result", value }, transferList);
            transferList = [];
        }

        function processParameters(parameters)
        {
            return parameters.map(p =>
            {
                if (typeof p === "object")
                {
                    if (p.type === "callback")
                    {
                        // create callback function
                        const callbackId = p.safeCallback;
                        return (...parameters) =>
                        {
                            self.postMessage({ type: "callback", callback: callbackId, parameters }, transferList);
                            transferList = [];
                        };
                    }
                    else if (p.type === "atomicInt32")
                    {
                        return new AtomicInt32(p.buffer);
                    }
                }
                else
                {
                    return p;
                }
            });
        }

        self.addEventListener("message", (ev) =>
        {
            const msg = ev.data;
            if (msg.type === "task")
            {
                // start a new task

                const parameters = processParameters(msg.parameters);

                //const codeBlob = new Blob([msg.code], { type: "text/javascript" });
                //const codeUrl = URL.createObjectURL(codeBlob);
                try
                {
                    eval(msg.code);
                    //URL.revokeObjectURL(codeUrl);
                    self.postMessage({ type: "finished" });
                    transferList = [];
                }
                catch (err)
                {
                    //URL.revokeObjectURL(codeUrl);
                    self.postMessage({ type: "error", value: err });
                    transferList = [];
                }
            }
            else if (msg.type === "call")
            {
                // call a registered method

                if (methods.has(msg.name))
                {
                    const parameters = processParameters(msg.parameters);
                    try
                    {
                        const result = methods.get(msg.name)(...parameters);
                        self.postMessage({ type: "callResult", callId: msg.callId, value: result }, transferList);
                        transferList = [];
                    }
                    catch (err)
                    {
                        self.postMessage({ type: "callError", callId: msg.callId, value: err });
                        transferList = [];
                    }
                }
            }
        });
    `;

    class AtomicInt32
    {
        constructor(v)
        {
            this.buffer = new SharedArrayBuffer(4);
            this.view = new Int32Array(this.buffer);
            this.view[0] = v;
        }

        get value() { return Atomics.load(this.view, 0); }
        set value(v) { return Atomics.store(this.view, 0, v); }

        add(v) { return Atomics.add(this.view, 0, v); }
        and(v) { return Atomics.and(this.view, 0, v); }
        or(v) { return Atomics.or(this.view, 0, v); }
        sub(v) { return Atomics.sub(this.view, 0, v); }
    };



    let idCounter = 0;

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
                queue: [],
                transferList: [],
                taskMap: new Map(),
                callMap: new Map(),
                callbackMap: new Map()
            });

            this.notifyable("free");
            this.notifyable("size");
            this.notifyable("waiting");

            this.scale(1);

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                priv.queue = [];
                priv.workers.forEach(item =>
                {
                    item.worker.terminate();
                });
                priv.workers = [];
                priv.transferList = [];
                priv.taskMap.clear();
                priv.callMap.clear();
                priv.callbackMap.clear();
            };
        }

        get hardwareConcurrency() { return navigator.hardwareConcurrency || 1; }

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

        /**
         * Marks the given transferable object for transfer instead of copying.
         * 
         * So far, HTML5 recognizes `ArrayBuffer`, `CanvasProxy`, `ImageBitmap`,
         * and `MessagePort` as transferable.
         * 
         * @param {Transferable} obj - The object to mark for transfer.
         * @returns The object to transfer.
         */
        transfer(obj)
        {
            d.get(this).transferList.push(obj);
            return obj;
        }

        /**
         * Creates an atomic int32 for lock-free inter-thread communication.
         * This feature may only be usable if the environment is cross origin
         * isolated.
         * 
         * @param {number} n - The initial value.
         */
        atomicInt32(v)
        {
            return new AtomicInt32(v);
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
                const workerItem = { worker: w, free: true, taskId: -1 };

                w.onmessage = this.safeCallback((ev) =>
                {
                    const msg = ev.data;
                    if (msg.type === "callResult")
                    {
                        priv.callMap.get(msg.callId).resolve(msg.value);
                        priv.callMap.delete(msg.callId);
                    }
                    else if (msg.type === "callError")
                    {
                        priv.callMap.get(msg.callId).reject(msg.value);
                        priv.callMap.delete(msg.callId);
                    }
                    else if (msg.type === "result")
                    {
                        //console.log("Task Result: " + JSON.stringify(msg.value));
                        priv.taskMap.get(workerItem.taskId).resolve(msg.value);
                        priv.taskMap.get(workerItem.taskId).callbacks.forEach(cbId =>
                        {
                            priv.callbackMap.delete(cbId);
                        });
                        priv.taskMap.delete(workerItem.taskId);
                        workerItem.free = true;
                        workerItem.taskId = -1;
                        this.freeChanged();
                        this.checkQueue();
                    }
                    else if (msg.type === "error")
                    {
                        priv.taskMap.get(workerItem.taskId).reject(msg.value);
                        priv.taskMap.get(workerItem.taskId).callbacks.forEach(cbId =>
                        {
                            priv.callbackMap.delete(cbId);
                        });
                        priv.taskMap.delete(workerItem.taskId);
                        workerItem.free = true;
                        workerItem.taskId = -1;
                        this.freeChanged();
                        this.checkQueue();
                    }
                    else if (msg.type === "callback")
                    {
                        const remove = priv.callbackMap.get(msg.callback)(...msg.parameters);
                        if (remove)
                        {
                            priv.callbackMap.delete(msg.callback);
                        }
                    }
                });
                priv.workers.push(workerItem);
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
                const taskId = priv.queue.shift();
                this.run(taskId);
                --freeCount;
                this.waitingChanged();
            }
        }

        run(taskId)
        {
            const priv = d.get(this);
            const freeWorkers = priv.workers.filter(item => item.free);
            if (freeWorkers.length > 0)
            {
                // run
                const taskItem = priv.taskMap.get(taskId);
                const workerItem = freeWorkers[0];
                workerItem.taskId = taskId;
                workerItem.free = false;
                workerItem.worker.postMessage({ type: "task", code: taskItem.code, parameters: taskItem.parameters }, taskItem.transferList);
                this.freeChanged();
            }
            else
            {
                priv.queue.push(taskId);
                this.waitingChanged();
            }
        }

        call(callId)
        {
            const priv = d.get(this);
            const callItem = priv.callMap.get(callId);

            const workerItem = priv.workers.find(item => item.taskId === callItem.taskId);
            if (workerItem)
            {
                workerItem.worker.postMessage({ type: "call", name: callItem.name, callId, parameters: callItem.parameters }, callItem.transferList);
            }
        }

        processParameters(taskId, parameters)
        {
            const priv = d.get(this);

            return parameters.map(p =>
            {
                //console.log(typeof p);
                if (typeof p === "function")
                {
                    const callbackId = idCounter;
                    ++idCounter;
                    priv.callbackMap.set(callbackId, p);
                    priv.taskMap.get(taskId).callbacks.push(callbackId);
                    return { type: "callback", safeCallback: callbackId };
                }
                else if (typeof p === "object" && p.constructor.name === "AtomicInt32")
                {
                    return { type: "atomicInt32", buffer: p.buffer };
                }
                else
                {
                    return p;
                }
            });
        }

        /**
         * Posts the given task to the next free worker thread and returns a
         * TaskHandle object.
         * 
         * Transferable objects may be transfered (instead of being copied) to the
         * worker thread by marking the parameter with `transfer()`.
         * 
         * Functions may be passed as parameters to act as callbacks.
         * 
         * @param {string} code - The code to execute.
         * @param {any[]} parameters - The parameters.
         * @returns {TaskHandle} The TaskHandle object for retrieving the result or an exception.
         */
        postTask(code, ...parameters)
        {
            const priv = d.get(this);

            const taskId = idCounter;
            ++idCounter;

            let resolveCall = null;
            const callbacks = [];

            const promise = new Promise((resolve, reject) =>
            {
                priv.taskMap.set(taskId, {
                    code,
                    parameters: [],
                    transferList: priv.transferList.slice(),
                    resolve,
                    reject,
                    resolveCall,
                    callbacks
                });
                priv.transferList = [];

                priv.taskMap.get(taskId).parameters = this.processParameters(taskId, parameters);

                this.run(taskId);
            });

            const p = { };
            p.then = (cb) =>
            {
                promise.then(cb);
                return p;
            };
            p.catch = (cb) =>
            {
                promise.catch(cb);
                return p;
            };
            p.call = (name, ...parameters) =>
            {
                return new Promise((resolve, reject) =>
                {
                    const params = this.processParameters(taskId, parameters);

                    const callId = idCounter;
                    ++idCounter;
                    priv.callMap.set(callId, {
                        taskId,
                        name,
                        parameters: params,
                        transferList: priv.transferList.slice(),
                        resolve,
                        reject
                    });
                    priv.transferList = [];
                    this.call(callId);
                });
            };

            return p;
        }
    };
});