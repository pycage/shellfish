/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js", __dirname + "/util/compat.js"], (obj, compat) =>
{
    /**
     * The worker environment in the thread pool.
     * 
     * Tasks in the thread pool have access to the functions of this environment.
     * 
     * @name Worker
     * @class
     * @memberof html.ThreadPool
     */

    /**
     * The Shellfish module management is available in tasks.
     * 
     * @name shRequire
     * @function
     * @memberof html.ThreadPool.Worker
     * @see shRequire
     */

    /**
     * An atomic int32 data type.
     * 
     * This is the Worker environment version of {@link html.ThreadPool.AtomicInt32}
     * with the same interface.
     *  
     * @name AtomicInt32
     * @class
     * @memberof html.ThreadPool.Worker
     * @see html.ThreadPool.AtomicInt32
     */

    /**
     * Imports (Emscripten) WebAssembly from the given URL.
     * 
     * @name importWasm
     * @function
     * @memberof html.ThreadPool.Worker
     * 
     * @property {string} wasmUrl - The URL where to load the WebAssembly from.
     * @return {Promise} A Promise resolving to the runtime instance.
     */

    /**
     * Puts the worker thread to sleep for the given amount of milliseconds.
     * 
     * 
     * If the platform does not support `Atomics`, this function will
     * perform a busy wait instead.
     * 
     * @name sleep
     * @function
     * @memberof html.ThreadPool.Worker
     */

    /**
     * Marks the given transferable object for transfer instead of copying.
     * 
     * So far, HTML5 recognizes `ArrayBuffer`, `CanvasProxy`, `ImageBitmap`,
     * and `MessagePort` as transferable.
     * 
     * @name transfer
     * @function
     * @memberof html.ThreadPool.Worker
     * 
     * @param {Transferable} obj - The object to mark for transfer.
     * @returns {Transferable} The object to transfer.
     */

    /**
     * Creates a proxy for calling methods of the given object by
     * another thread.
     * 
     * @name proxyObject
     * @function
     * @memberof html.ThreadPool.Worker
     * 
     * @param {object} obj - The object.
     * @return {object} A proxy object for passing to other threads.
     */

    /**
     * Exits the task manually.
     * 
     * @name exit
     * @function
     * @memberof html.ThreadPool.Worker
     */

    const WORKER_CODE = `
        "use strict";

        //console.log("Starting new worker thread.");

        let idCounter = 0;
        
        // map of code -> task ID
        const taskCache = new Map();
        let taskIdCounter = 0;

        // map of URL -> Module
        const moduleCache = new Map();

        let currentUrl = "";

        const methods = new Map();
        let transferList = [];


        //

        const isWeb = (typeof self !== "undefined");
        const isNode = (typeof process !== "undefined" && typeof process.versions.node !== "undefined");

        const modWorkerThreads = isNode ? require("worker_threads") : null;
        const modVm = isNode ? require("vm") : null;
        const worker = isWeb ? self : this;

        //console.log("isWeb: " + isWeb + ", isNode: " + isNode);

        function importCodeCompat(code)
        {
            //console.log("import code " + code.length);
            if (isWeb)
            {
                const codeBlob = new Blob([code], { type: "application/type" });
                const url = URL.createObjectURL(codeBlob);
                importScripts(url);
                URL.revokeObjectURL(url);
            }
            else if (isNode)
            {
                modVm.runInThisContext(code, { filename: "<task>" });
            }
        }

        function addEventListenerCompat(event, callback)
        {
            if (isWeb)
            {
                worker.addEventListener(event, callback);
            }
            else if (isNode)
            {
                modWorkerThreads.parentPort.on(event, callback);
            }
        }

        function postMessageCompat(...args)
        {
            if (isWeb)
            {
                worker.postMessage(...args);
            }
            else if (isNode)
            {
                modWorkerThreads.parentPort.postMessage(...args);
            }
        }

        function extractMessageDataCompat(obj)
        {
            if (isWeb)
            {
                return obj.data;
            }
            else
            {
                return obj;
            }
        }

        //



        worker.AtomicInt32 = class AtomicInt32
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
        worker.importWasm = (wasmUrl) =>
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
        worker.sleep = (ms) =>
        {
            if (typeof SharedArrayBuffer !== "undefined")
            {
                const buf = new SharedArrayBuffer(4);
                const view = new Int32Array(buf);
                Atomics.wait(view, 0, 0, ms);
            }
            else
            {
                // this platform only allows a busy wait
                const now = Date.now();
                const later = now + ms;
                while (Date.now() < later);
            }
        };

        /**
         * Marks the given object for transfer.
         */
        worker.transfer = (v) =>
        {
            transferList.push(v);
            return v;
        };

        /**
         * Creates a proxy for calling methods of the given object by
         * another thread.
         */
        worker.proxyObject = (obj) =>
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
        worker.registerModule = (mod) =>
        {
            moduleCache.set(taskIdCounter, mod);
            for (let key in mod)
            {
                if (key === "__run__")
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
        worker.registerWorkerMethod = (name, f) =>
        {
            //console.log("Registering worker method: " + name);
            methods.set(name, f);
        };

        /**
         * Exits the task manually.
         */
        worker.exit = () =>
        {
            postMessageCompat({ type: "exit" });
        };

        function loadTask(code)
        {
            let taskId = "";
            if (taskCache.has(code))
            {
                taskId = taskCache.get(code);
                //console.log("from cache " + taskId);
                //console.log(moduleCache);
            }
            else
            {
                const js = "(function () { " +
                           "const exports = { }; " +
                           code + "\\n" +
                           "if (typeof run !== 'undefined') { exports.__run__ = run; }\\n\\n" +
                           "worker.registerModule(exports); " +
                           "})();"
               
                importCodeCompat(js);
                taskId = taskIdCounter;
                taskCache.set(code, taskId);
                ++taskIdCounter;
            }
            return moduleCache.get(taskId);
        }

        function processInParameters(parameters)
        {
            return parameters.map(p =>
            {
                if (!! p && typeof p === "object")
                {
                    if (p.type === "callback")
                    {
                        // create callback function
                        const callbackId = p.safeCallback;
                        return (...parameters) =>
                        {
                            postMessageCompat({ type: "callback", callback: callbackId, parameters }, transferList);
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

        addEventListenerCompat("message", ev =>
        {
            const msg = extractMessageDataCompat(ev);
            if (msg.type === "import")
            {
                // import worker-global code (e.g. require.js)

                importCodeCompat(msg.code);
                postMessageCompat({ type: "ready" });
            }
            else if (msg.type === "task")
            {
                // start a new task

                methods.clear();
                transferList = [];

                const task = loadTask(msg.code);
                if (task.__run__)
                {
                    const parameters = processInParameters(msg.parameters);
                    const taskResult = task.__run__(...parameters);
                    handleResult(taskResult, r =>
                    {
                        postMessageCompat({ type: "result", value: r }, transferList);
                        transferList = [];
                    },
                    err =>
                    {
                        postMessageCompat({ type: "error", value: "" + err });
                        transferList = [];
                        postMessageCompat({ type: "exit" });
                    });
                }

                if (methods.size === 0)
                {
                    postMessageCompat({ type: "exit" });
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
                            postMessageCompat({ type: "methodResult", callId: msg.callId, value: r }, transferList);
                            transferList = [];        
                        },
                        err =>
                        {
                            postMessageCompat({ type: "methodError", callId: msg.callId, value: "" + err });
                            transferList = [];        
                        });
                    }
                    catch (err)
                    {
                        postMessageCompat({ type: "methodError", callId: msg.callId, value: "" + err });
                        transferList = [];
                    }
                }
                else
                {
                    const err = "No such method to call: " + msg.name;
                    postMessageCompat({ type: "methodError", callId: msg.callId, value: err });
                    transferList = [];
                }
            }
        });
    `;

    /**
     * A handle representing a particular task in the thread pool.
     * 
     * @name TaskHandle
     * @class
     * @memberof html.ThreadPool
     */

    /**
     * Connects a callback to be called when the task finished.
     * 
     * @name then
     * @method
     * @memberof html.ThreadPool.TaskHandle.prototype
     * 
     * @param {function} callback - The callback to connect.
     */

    /**
     * Connects a callback to be called when the task failed (i.e. aborted with
     * an uncaught exception).
     * 
     * @name catch
     * @method
     * @memberof html.ThreadPool.TaskHandle.prototype
     * 
     * @param {function} callback - The callback to connect.
     */

    /**
     * Marks an object for transfer to a task. This only has an effect if
     * the object is transferable.
     * 
     * @name transfer
     * @method
     * @memberof html.ThreadPool.TaskHandle.prototype
     * 
     * @param {object} obj - The object to transfer.
     * @return {Transferable} The marked object.
     */

    /**
     * Creates an {@link html.ThreadPool.AtomicInt32} object.
     * 
     * @name atomicInt32
     * @method
     * @memberof html.ThreadPool.TaskHandle.prototype
     * 
     * @param {number} n - The number value.
     * @return {html.ThreadPool.AtomicInt32} The AtomicInt32 object.
     */

    /**
     * Calls a function exported by a task and returns a Promise object.
     * 
     * You may pass callback functions as parameters. When the task invokes such
     * a function, it will be executed in the context of the caller,
     * i.e. outside the task.
     * 
     * Since callback functions may be called more than once, they are not
     * freed while the task is running. In order to free a callback function
     * immediately, have it return `true` explicitly.
     * 
     * @name call
     * @method
     * @memberof html.ThreadPool.TaskHandle.prototype
     * 
     * @param {string} name - The name of the function.
     * @param {...any} ...parameters - The parameters of the function.
     */

    /**
     * An atomic int32 data type.
     * @memberof html.ThreadPool
     * 
     * @property {number} value - The current value.
     */
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

        /**
         * Adds a value.
         * @param {number} v - The value to add.
         * @returns {number} The old value.
         */
        add(v) { return Atomics.add(this.view, 0, v); }
        /**
         * Computes the bitwise AND with a value.
         * @param {number} v - The value.
         * @returns {number} The old value.
         */
        and(v) { return Atomics.and(this.view, 0, v); }
        /**
         * Computes the bitwise OR with a value.
         * @param {number} v - The value.
         * @returns {number} The old value.
         */
        or(v) { return Atomics.or(this.view, 0, v); }
        /**
         * Subtracts a value.
         * @param {number} v - The value to subtract.
         * @returns {number} The old value.
         */
        sub(v) { return Atomics.sub(this.view, 0, v); }
    }



    let idCounter = 0;

    const d = new WeakMap();

    /**
     * Class representing a scalable thread pool with means for lock-free
     * concurrent programming.
     * 
     * ### UI Thread
     * The UI thread is the main thread of the application. Unless posted to a
     * thread pool, all code is running in the UI thread. Blocking the UI thread
     * (e.g. by computation-heavy actions) will freeze the user interface and
     * should be avoided.
     * 
     * The thread pool lets you run code outside the UI thread so it doesn't
     * get blocked.
     * 
     * ### Worker Thread
     * The thread pool provides a number of worker threads, depending on its
     * `size` property. Worker threads accept and fulfil tasks posted to the
     * thread pool.
     * 
     * There is a limit to the amount of worker threads that the computer is
     * able to run simultaneously at the same time, which is the
     * `hardwareConcurrency`. This limit depends on the CPU type.
     * 
     * It is, however, possible to run threads exceeding the `hardwareConcurrency`
     * virtually simultaneously. To the user it would appear as if the threads
     * would be running simultaneously, but actually, they are taking turns and the
     * performance benefit of running simultaneously is not given.
     * 
     * ### Task
     * A task is a piece of code that is to be run by a worker thread.
     * The thread pool is responsible for queueing tasks and assigning them to
     * worker threads that are free of tasks (i.e. idle).
     * 
     * To run a task, you post it to the thread pool. If the task implements the
     * function `run()`, it will be invoked automatically with the given
     * parameters. Posting a task that implements `run` will return a Promise object
     * for retrieving a potential task result.
     * 
     *     const code = "funcftion run(a, b) { return a + b; }";
     *     const task = pool.postTask(code, 1, 2)
     *     .then(sum => {
     *       console.log("The result is: " + sum);
     *     });
     * 
     * Normally, tasks free the worker thread after running, but if a
     * task has exported functions, or created a proxy object,
     * it continues to occupy the worker thread and stays ready to be called,
     * until it terminates itself by calling the `exit()` function.
     * 
     * ### Exporting Functions
     * Tasks may export functions to be called by the UI thread. Functions are
     * exported by assigning them to the `exports` namespace.
     * 
     *     exports.sum = (a, b) => { return a + b; };
     * 
     * A tasks that exports functions is not terminated automatically and continues
     * to occupy the worker thread it was assigned to.
     * 
     * ### Proxy Objects
     * Tasks may create proxy objects for controlling objects living in the task
     * by the UI thread. This provides a way to implement the Active Object
     * Pattern.
     * 
     *     class MyActiveObject {
     *         // implementation goes here
     *         ...
     *     }
     *     
     *     function run()
     *     {
     *         return proxyObject(new MyActiveObject());
     *     }
     * 
     * A task that creates proxy objects is not terminated automatically and continues
     * to occupy the worker thread it was assigned to.
     * 
     * ### Callback Functions
     * Functions may be passed between threads as callbacks. Invoking a callback
     * guarantees that the function will be executed in the thread where it came
     * from.
     * 
     * Since callback functions may be called more than once, they are not
     * freed while the task is running. In order to free a callback function
     * immediately, have it return `true` explicitly.
     * 
     * ### Atomic Integers
     * Atomic integers are 32bit integer values that may be shared and modified
     * by several threads safely. Usually the CPU supports atomic operations on
     * the values directly with no extra locking overhead.
     * 
     * Atomics provide a quick way to notify threads about something by raising
     * a flag.
     * 
     * ### Transfering Data
     * Normally when an object is passed to a task or back to the UI thread as a
     * function or method parameter, a copy of the object will be made for passing.
     * This can be quite expensive for large objects.
     * 
     * Some types, however, support being transfered directly between threads without
     * copying. A transfered object is no longer usable in the thread where it
     * was transfered from.
     * 
     * This mechanism is comparable to the `std::move()` semantics of C++.
     * 
     * @memberof core
     * @extends core.Object
     * 
     * @property {number} free - [readonly] The amount of free workers.
     * @property {number} hardwareConcurrency - [readonly] The maximum amount of concurrent threads supported by the hardware.
     * @property {number} pending - [readonly] The amount of tasks that are either waiting or running.
     * @property {number} size - (default: `1`) The size of the thread pool, i.e. the amount of available workers.
     * @property {number} waiting [readonly] The amount of tasks that are waiting for a free worker.
     */
    class ThreadPool extends obj.Object
    {
        constructor()
        {
            super();

            d.set(this, {
                size: 1,
                workers: [],
                queue: [],
                transferList: [],
                taskMap: new Map(),
                callMap: new Map(),
                callbackMap: new Map()
            });

            this.notifyable("free");
            this.notifyable("pending");
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

        get hardwareConcurrency() { return compat.hardwareConcurrency(); }

        get free() { return d.get(this).workers.filter(item => item.free).length; }
        get waiting() { return d.get(this).queue.length; }
        get pending() { return d.get(this).workers.filter(item => ! item.free).length; }

        get size() { return d.get(this).size; }
        set size(s)
        {
            if (s !== d.get(this).size)
            {
                d.get(this).size = s;
                this.scale(s);
                this.sizeChanged();
            }
        }

        /**
         * Marks the given transferable object for transfer instead of copying.
         * 
         * So far, HTML5 recognizes `ArrayBuffer`, `CanvasProxy`, `ImageBitmap`,
         * and `MessagePort` as transferable.
         * 
         * @param {Transferable} obj - The object to mark for transfer.
         * @returns {Transferable} The object to transfer.
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
         * @returns {html.ThreadPool.AtomicInt32} The atomic int32.
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
                const w = compat.createWorkerThread(WORKER_CODE);
                const workerItem = { worker: w, free: true, ready: false, taskId: -1 };

                compat.addEventListener(w, "message", this.safeCallback((ev) =>
                {
                    const msg = compat.extractMessageData(ev);
                    if (msg.type === "ready")
                    {
                        workerItem.ready = true;
                        this.checkQueue();    
                    }
                    else if (msg.type === "exit")
                    {
                        priv.taskMap.get(workerItem.taskId).callbacks.forEach(cbId =>
                        {
                            priv.callbackMap.delete(cbId);
                        });
                        priv.taskMap.delete(workerItem.taskId);
                        workerItem.free = true;
                        workerItem.taskId = -1;
                        this.freeChanged();
                        this.pendingChanged();
                        this.checkQueue();    
                    }
                    else if (msg.type === "methodResult")
                    {
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
                        priv.taskMap.get(workerItem.taskId).resolve(this.processOutParameters(workerItem.taskId, [msg.value])[0]);
                    }
                    else if (msg.type === "error")
                    {
                        priv.taskMap.get(workerItem.taskId).reject(msg.value);

                    }
                    else if (msg.type === "callback")
                    {
                        //console.log("Callback parameters: " + JSON.stringify(msg));
                        const params = this.processOutParameters(workerItem.taskId, msg.parameters);
                        const remove = priv.callbackMap.get(msg.callback)(...params);
                        if (remove)
                        {
                            priv.callbackMap.delete(msg.callback);
                        }
                    }
                }));
                priv.workers.push(workerItem);

                shRequire.selfUrl()
                .then(url =>
                {
                    return compat.fetch(url);
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
            const freeWorkers = priv.workers.filter(item => item.free && item.ready);
            if (freeWorkers.length > 0)
            {
                // run
                const taskItem = priv.taskMap.get(taskId);
                const workerItem = freeWorkers[0];
                workerItem.taskId = taskId;
                workerItem.free = false;
                workerItem.worker.postMessage({ type: "task", code: taskItem.code, parameters: taskItem.parameters }, taskItem.transferList);
                this.freeChanged();
                this.pendingChanged();
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
                // careful, typeof null === "object" !!!
                if (!! r && typeof r === "object" && r.type === "proxy")
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
         * @returns {html.ThreadPool.TaskHandle} The TaskHandle object for retrieving the result or an exception.
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
         * @returns {html.ThreadPool.TaskHandle} The TaskHandle object for retrieving the result or an exception.
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
                compat.fetch(url)
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
    }
    exports.ThreadPool = ThreadPool;
});