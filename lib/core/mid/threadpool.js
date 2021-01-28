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
        "use strict";

        console.log("Starting new worker thread.");

        let idCounter = 0;
        
        // map of code -> URL
        const urlCache = new Map();

        // map of URL -> Module
        const moduleCache = new Map();

        let currentUrl = "";

        const methods = new Map();
        let transferList = [];

        self.AtomicInt32 = class AtomicInt32
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

        /**
         * Imports (Emscripten) WASM code from the given URL.
         */
        self.importWasm = (wasmUrl) =>
        {
            return new Promise(async (resolve, reject) =>
            {
                const runtimeUrl = wasmUrl.replace(/\.wasm$/i, ".js");
                const pos = wasmUrl.lastIndexOf("/");
                const wasmDirectory = pos > 0 ? wasmUrl.substr(0, pos) : wasmUrl;

                function processor(u, code)
                {
                    return "exports.init = (Module) => " +
                           "{ " + code + "\\nreturn Module; };"
                }

                const mod = await shRequire(runtimeUrl, null, processor);

                let runTime = null;

                const Module = {
                    mainScriptUrlOrBlob: runtimeUrl,
                    locateFile: (path, scriptDirectory) =>
                    {
                        return wasmDirectory + "/" + path;
                    },
                    onRuntimeInitialized: () =>
                    {
                        resolve(runTime);
                    }
                };
                runTime = mod.init(Module);
            });
        };

        /**
         * Puts the thread to sleep for the given amount of milliseconds.
         */
        self.sleep = (ms) =>
        {
            if (typeof SharedArrayBuffer !== "undefined")
            {
                const buf = new SharedArrayBuffer(4);
                const view = new Int32Array(buf);
                Atomics.wait(view, 0, 0, ms);
            }
        };

        /**
         * Marks the given object for transfer.
         */
        self.transfer = (v) =>
        {
            transferList.push(v);
            return v;
        };

        /**
         * Creates a proxy for calling methods of the given object by
         * another thread.
         */
        self.proxyObject = (obj) =>
        {
            const proxyId = idCounter;
            ++idCounter;

            const methods = [];

            function allKeys(obj)
            {
                let keys = Object.getOwnPropertyNames(obj)
                .filter(n => n !== "constructor")
                .filter(n => typeof obj[n] === "function")
                const proto = Object.getPrototypeOf(obj);
                if (! proto.hasOwnProperty("hasOwnProperty"))
                {
                    keys = keys.concat(allKeys(proto));
                }
                return keys;
            }

            allKeys(obj)
            .forEach(key =>
            {
                registerWorkerMethod(proxyId + "." + key, obj[key].bind(obj));
                methods.push(key);
            });

            return { type: "proxy", instance: proxyId, methods: methods };
        };

        /**
         * Registers the given module (used internally).
         */
        self.registerModule = (mod) =>
        {
            moduleCache.set(currentUrl, mod);
            for (let key in mod)
            {
                if (key === "run")
                {
                    continue;
                }
                else if (typeof mod[key] === "function")
                {
                    registerWorkerMethod(key, mod[key]);
                }
            }
        };

        /**
         * Registers the given worker method (used internally).
         */
        self.registerWorkerMethod = (name, f) =>
        {
            console.log("Registering worker method: " + name);
            methods.set(name, f);
        };



        function loadTask(code)
        {
            let url = "";
            if (urlCache.has(code))
            {
                url = urlCache.get(code);
            }
            else
            {
                const js = "(function () { " +
                           "const exports = { }; " +
                           code + "\\n" +
                           "self.registerModule(exports); " +
                           "})();"

                const blob = new Blob([js], { type: "application/javascript" });
                url = URL.createObjectURL(blob);
                urlCache.set(code, url);

                currentUrl = url;
                importScripts(url);

                URL.revokeObjectURL(url);
            }
            return moduleCache.get(url);
        }

        function processInParameters(parameters)
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
                    else
                    {
                        return p;
                    }
                }
                else
                {
                    return p;
                }
            });
        }

        function handleResult(r, onResult, onError)
        {
            if (typeof r === "object" && r.constructor.name === "Promise")
            {
                r
                .then(v => onResult(v))
                .catch(err => onError(err));
            }
            else
            {
                onResult(r);
            }
        }

        self.addEventListener("message", (ev) =>
        {
            const msg = ev.data;
            if (msg.type === "import")
            {
                // import worker-global code (e.g. require.js)

                const blob = new Blob([msg.code], { type: "application/javascript" });
                const blobUrl = URL.createObjectURL(blob);
                importScripts(blobUrl);
                URL.revokeObjectURL(blobUrl);
            }
            else if (msg.type === "task")
            {
                // start a new task

                methods.clear();
                transferList = [];

                const task = loadTask(msg.code);
                if (task.run)
                {
                    const parameters = processInParameters(msg.parameters);
                    const taskResult = task.run(...parameters);
                    handleResult(taskResult, r =>
                    {
                        self.postMessage({ type: "result", value: r }, transferList);
                        transferList = [];
                    },
                    err =>
                    {
                        self.postMessage({ type: "error", value: "" + err });
                        transferList = [];
                        self.postMessage({ type: "exit" });
                    });
                }

                if (methods.size === 0)
                {
                    self.postMessage({ type: "exit" });
                }
            }
            else if (msg.type === "call")
            {
                // call a registered method

                if (methods.has(msg.name))
                {
                    const parameters = processInParameters(msg.parameters);
                    try
                    {
                        const result = methods.get(msg.name)(...parameters);
                        handleResult(result, r =>
                        {
                            self.postMessage({ type: "methodResult", callId: msg.callId, value: r }, transferList);
                            transferList = [];        
                        },
                        err =>
                        {
                            self.postMessage({ type: "methodError", callId: msg.callId, value: "" + err });
                            transferList = [];        
                        });
                    }
                    catch (err)
                    {
                        self.postMessage({ type: "methodError", callId: msg.callId, value: "" + err });
                        transferList = [];
                    }
                }
                else
                {
                    const err = "No such method to call: " + msg.name;
                    self.postMessage({ type: "methodError", callId: msg.callId, value: err });
                    transferList = [];
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
     * NOTE: The API is still under heavy development and not stable yet.
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
                    if (msg.type === "exit")
                    {
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
                    else if (msg.type === "methodResult")
                    {
                        console.log("Worker method result: " + JSON.stringify(msg.value));
                        priv.callMap.get(msg.callId).resolve(this.processOutParameters(workerItem.taskId, [msg.value])[0]);
                        priv.callMap.delete(msg.callId);
                    }
                    else if (msg.type === "methodError")
                    {
                        priv.callMap.get(msg.callId).reject(msg.value);
                        priv.callMap.delete(msg.callId);
                    }
                    else if (msg.type === "result")
                    {
                        console.log("Task result: " + JSON.stringify(msg.value));
                        priv.taskMap.get(workerItem.taskId).resolve(this.processOutParameters(workerItem.taskId, [msg.value])[0]);
                    }
                    else if (msg.type === "error")
                    {
                        priv.taskMap.get(workerItem.taskId).reject(msg.value);

                    }
                    else if (msg.type === "callback")
                    {
                        console.log("Callback parameters: " + JSON.stringify(msg));
                        const params = this.processOutParameters(workerItem.taskId, msg.parameters);
                        const remove = priv.callbackMap.get(msg.callback)(...params);
                        if (remove)
                        {
                            priv.callbackMap.delete(msg.callback);
                        }
                    }
                });
                priv.workers.push(workerItem);

                shRequire.selfUrl()
                .then(url =>
                {
                    return fetch(url);
                })
                .then(response =>
                {
                    if (response.ok)
                    {
                        return response.text();
                    }
                    else
                    {
                        throw "Failed to load resource: " + url;
                    }
                })
                .then(code =>
                {
                    w.postMessage({ type: "import", code });
                })
                .catch(err =>
                {
                    console.error("Failed to initialize worker: " + err);
                });
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
                //console.log("Calling method " + callItem.name);
                workerItem.worker.postMessage({ type: "call", name: callItem.name, callId, parameters: callItem.parameters }, callItem.transferList);
            }
            else
            {
                console.error("Failed to call " + callItem.name + ": task " + callItem.taskId + " is not available");
            }
        }

        processInParameters(taskId, parameters)
        {
            const priv = d.get(this);

            return parameters.map(p =>
            {
                //console.log(typeof p);
                if (typeof p === "function")
                {
                    // replace function with callback handle

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

        processOutParameters(taskId, results)
        {
            const priv = d.get(this);

            return results.map(r =>
            {
                if (typeof r === "object" && r.type === "proxy")
                {
                    // build local Active Object proxy

                    const proxy = { };
                    r.methods.forEach(method =>
                    {
                        proxy[method] = (...parameters) =>
                        {
                            return new Promise((resolve, reject) =>
                            {
                                const params = this.processInParameters(taskId, parameters);
            
                                const callId = idCounter;
                                ++idCounter;
                                priv.callMap.set(callId, {
                                    taskId,
                                    name: r.instance + "." + method,
                                    parameters: params,
                                    transferList: priv.transferList.slice(),
                                    resolve,
                                    reject
                                });
                                priv.transferList = [];
                                this.call(callId);
                            });
                        }
                    });
                    return proxy;
                }
                else
                {
                    return r;
                }
            });
        }

        createTaskHandle(taskId, promise)
        {
            const priv = d.get(this);

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
            p.transfer = (v) =>
            {
                return this.transfer(v);
            };
            p.atomicInt32 = (v) =>
            {
                return this.atomicInt32(v);
            };
            p.call = (name, ...parameters) =>
            {
                return new Promise((resolve, reject) =>
                {
                    const params = this.processInParameters(taskId, parameters);

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

                priv.taskMap.get(taskId).parameters = this.processInParameters(taskId, parameters);

                this.run(taskId);
            });

            return this.createTaskHandle(taskId, promise);
        }

        /**
         * Posts the given task to the next free worker thread and returns a
         * TaskHandle object.
         * 
         * @param {string} url - The URL of the task to load.
         * @param {any[]} parameters - The parameters.
         * @returns {TaskHandle} The TaskHandle object for retrieving the result or an exception.
         */
        postTaskFromSource(url, ...parameters)
        {
            const priv = d.get(this);

            const taskId = idCounter;
            ++idCounter;

            let resolveCall = null;
            const callbacks = [];

            const promise = new Promise((resolve, reject) =>
            {
                fetch(url, { cache: "no-cache" })
                .then(response =>
                {
                    if (response.ok)
                    {
                        return response.text();
                    }
                    else
                    {
                        throw "Failed to load task from " + url + " (" + response.status + " " + response.statusText + ")";
                    }
                })
                .then(code =>
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
    
                    priv.taskMap.get(taskId).parameters = this.processInParameters(taskId, parameters);
    
                    this.run(taskId);
                });
            });

            return this.createTaskHandle(taskId, promise);
        }
    };
});