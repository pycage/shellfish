/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/core"], core =>
{

    let idCounter = 0;


    class MessageSocket
    {

        constructor(host, port, handler)
        {
            fetch("/shrpc")
            .then(async response =>
            {
                if (response.ok)
                {
                    console.log("got RPC reverse channel");
                    let buffer = null;
                    let bufferOffset = 0;
                    let dataOffset = 0;

                    const reader = response.body.getReader();

                    while (true)
                    {
                        const { done, value } = await reader.read();

                        if (buffer === null)
                        {
                            const view32 = new Uint32Array(value.buffer, 0, 1);
                            const size = view32[0];
                            buffer = new ArrayBuffer(size);
                            dataOffset = 4;
                            bufferOffset = 0;
                        }

                        const view8 = new Uint8Array(value.buffer, dataOffset);
                        new Uint8Array(buffer, bufferOffset).set(view8);
                        bufferOffset += view8.length;
                        dataOffset += view8.length;

                        if (bufferOffset === buffer.byteLength)
                        {
                            const dec = new TextDecoder();
                            const json = dec.decode(buffer);
                            try
                            {
                                const message = JSON.parse(json);
                                handler(message);
                            }
                            catch (err)
                            {
                                console.error(err);
                            }
                            buffer = null;
                        }

                        if (done)
                        {
                            break;
                        }
                    }

                }
            })
            .catch(err =>
            {
                console.log(err);
            });
        }

        postMessage(message)
        {
            fetch("/shrpc", {
                method: "POST",
                body: JSON.stringify(message)
            });
        }

    }


    const d = new WeakMap();

    class RpcProxy extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                size: 1,
                workers: [],
                queue: [],
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
                priv.taskMap.clear();
                priv.callMap.clear();
                priv.callbackMap.clear();
            };
        }

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
                const w = new MessageSocket("localhost", 8000, msg =>
                {
                    console.log("HANDLE");
                    console.log(msg);
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
                });

                const workerItem = { worker: w, free: true, ready: false, taskId: -1 };
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
            const freeWorkers = priv.workers.filter(item => item.free && item.ready);
            if (freeWorkers.length > 0)
            {
                // run
                const taskItem = priv.taskMap.get(taskId);
                const workerItem = freeWorkers[0];
                workerItem.taskId = taskId;
                workerItem.free = false;
                workerItem.worker.postMessage({ type: "task", code: taskItem.code, parameters: taskItem.parameters });
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
                console.log("Calling method " + callItem.name);
                workerItem.worker.postMessage({ type: "call", name: callItem.name, callId, parameters: callItem.parameters });
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
                                    resolve,
                                    reject
                                });
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
                        resolve,
                        reject
                    });
                    this.call(callId);
                });
            };

            return p;

        }

        /**
         * Posts the given task to the next free worker thread and returns a
         * TaskHandle object.
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
                    resolve,
                    reject,
                    resolveCall,
                    callbacks
                });

                priv.taskMap.get(taskId).parameters = this.processInParameters(taskId, parameters);

                this.run(taskId);
            });

            return this.createTaskHandle(taskId, promise);
        }

    }
    exports.RpcProxy = RpcProxy;
});
