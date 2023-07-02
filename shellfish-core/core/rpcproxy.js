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

shRequire([__dirname + "/object.js"], obj =>
{

    let idCounter = 0;


    class MessageSocket
    {
        constructor(endpoint, handler)
        {
            this.socketId = idCounter;
            this.reader = null;
            this.endpoint = endpoint;
            this.handler = handler;

            ++idCounter;
        }

        postMessage(sessionId, message)
        {
            //console.log("Send: " + JSON.stringify(message));

            const headers = new Headers();
            headers.append("x-shellfish-rpc-socket", this.socketId);
            headers.append("x-shellfish-rpc-session", sessionId);
            fetch(this.endpoint, {
                method: "POST",
                headers,
                body: JSON.stringify(message)
            })
            .catch(err =>
            {
                console.error(err);
            });
        }

        connect()
        {
            const headers = new Headers();
            headers.append("x-shellfish-rpc-socket", this.socketId);

            fetch(this.endpoint, { headers })
            .then(async response =>
            {
                if (response.ok)
                {
                    //console.log("Established reverse channel");
                    let buffer = null;
                    let bufferOffset = 0;
                    let dataOffset = 0;

                    this.reader = response.body.getReader();

                    let done = false;
                    let value = null;

                    while (! done)
                    {
                        if (value === null)
                        {
                            //console.log("Reverse channel is waiting for data");
                            const r = await this.reader.read();
                            done = r.done;
                            value = r.value;
                            dataOffset = 0;
                        }
                        
                        if (buffer === null)
                        {
                            const size = value[dataOffset++] +
                                         (value[dataOffset++] << 8) +
                                         (value[dataOffset++] << 16) +
                                         (value[dataOffset++] << 24);

                            buffer = new ArrayBuffer(size);
                            bufferOffset = 0;
                        }

                        const view8 = new Uint8Array(value.buffer, dataOffset, Math.min(value.length, buffer.byteLength));
                        new Uint8Array(buffer, bufferOffset).set(view8);
                        bufferOffset += view8.length;
                        dataOffset += view8.length;

                        if (bufferOffset === buffer.byteLength)
                        {
                            const dec = new TextDecoder();
                            const json = dec.decode(buffer);
                            try
                            {
                                //console.log("Receive: " + json);
                                const message = JSON.parse(json);
                                this.handler(message);
                            }
                            catch (err)
                            {
                                console.error(err);
                            }
                            buffer = null;
                        }

                        if (dataOffset === value.byteLength)
                        {
                            value = null;
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
                //console.log("Connection closed: " + err);
                this.handler({ type: "exit" });
            });

        }

        close()
        {
            if (this.reader)
            {
                this.reader.cancel();
            }
        }
    }

    class MessageSocketNode
    {
        constructor(endpoint, handler)
        {
            this.modHttp = require("node:http");
            this.socketId = idCounter;
            this.reader = null;
            this.endpoint = endpoint;
            this.handler = handler;
        }

        postMessage(sessionId, message)
        {
            //console.log("Send: " + JSON.stringify(message));

            const req = this.modHttp.request(this.endpoint, {
                method: "POST",
                headers: {
                    "x-shellfish-rpc-socket": this.socketId,
                    "x-shellfish-rpc-session": sessionId
                }
            });
            req.write(JSON.stringify(message));
            req.end();
        }

        async connect()
        {
            let done = false;
            let value = null;

            const headers = {
                "x-shellfish-rpc-socket": this.socketId
            };

            const req = this.modHttp.request(this.endpoint, { headers });

            let dataResolver = null;
            req.on("response", res =>
            {
                this.reader = res;
                res.on("data", chunk =>
                {
                    if (dataResolver)
                    {
                        const f = dataResolver;
                        dataResolver = null;
                        f({ done: false, value: new Uint8Array(chunk)});
                    }
                });

                res.on("end", () =>
                {
                    if (dataResolver)
                    {
                        const f = dataResolver;
                        dataResolver = null;
                        f({ done: true, value: null});
                    }
                });

                res.on("error", err =>
                {
                    
                });
            });

            req.on("close", () =>
            {
                //console.log("Connection closed");
                this.handler({ type: "exit" });
                done = true;
            });

            req.on("error", err =>
            {
                console.error("Connection error: " + err.code);
            });

            req.end();

            function readData()
            {
                return new Promise((resolve, reject) =>
                {
                    dataResolver = resolve;
                });
            }

            //console.log("Established reverse channel");
            let buffer = null;
            let bufferOffset = 0;
            let dataOffset = 0;

            while (! done)
            {
                if (value === null)
                {
                    //console.log("Reverse channel is waiting for data");
                    const r = await readData();
                    done = r.done;
                    value = r.value;
                    dataOffset = 0;
                }
                
                if (buffer === null)
                {
                    const size = value[dataOffset++] +
                                 (value[dataOffset++] << 8) +
                                 (value[dataOffset++] << 16) +
                                 (value[dataOffset++] << 24);

                    buffer = new ArrayBuffer(size);
                    bufferOffset = 0;
                }

                const view8 = new Uint8Array(value.buffer, dataOffset, Math.min(value.length, buffer.byteLength));
                new Uint8Array(buffer, bufferOffset).set(view8);
                bufferOffset += view8.length;
                dataOffset += view8.length;

                if (bufferOffset === buffer.byteLength)
                {
                    const dec = new TextDecoder();
                    const json = dec.decode(buffer);
                    try
                    {
                        //console.log("Receive: " + json);
                        const message = JSON.parse(json);
                        this.handler(message);
                    }
                    catch (err)
                    {
                        console.error(err);
                    }
                    buffer = null;
                }

                if (dataOffset === value.byteLength)
                {
                    value = null;
                }

                if (done)
                {
                    break;
                }
            }

        }

        close()
        {
            if (this.reader)
            {
                this.reader.destroy();
            }
        }
    }


    const d = new WeakMap();

    /**
     * Class representing a proxy for handling remote procedure calls (RPC)
     * on a server with {@link server.RpcSession} as counter part.
     * 
     * ### Example: Invoke a remote function
     *     RpcProxy {
     * 
     *         onInitialization: () =>
     *         {
     *             console.log("Invoking a remote function");
     *             invoke("remoteCall", [1, 2, 3])
     *             .then(result =>
     *             {
     *                 console.log("Result: " + result);
     *             }
     *         }
     * 
     *     }
     * 
     * It is possible to pass callback functions to a RPC call.
     * 
     * ### Example: Using callbacks
     * 
     *     invoke("doSomething", progress =>
     *     {
     *         console.log("Current progress: " + Math.round(progress * 100) + "%");
     *     })
     *     .then(result =>
     *     {
     *         console.log("Result: " + result);
     *     });
     * 
     * The RPC endpoint may return proxy objects for complex interfaces.
     * 
     * ### Example: Using a proxy object
     * 
     *     invoke("getProxyInstance")
     *     .then(async proxy =>
     *     {
     *         const sum = await proxy.addRemote(1, 2);
     *         await proxy.countDown(n => console.log(n));
     *     });
     * 
     * @extends core.Object
     * @memberof core
     * 
     * @property {string} endpoint - (default: `"/"`) The address of the RPC endpoint.
     */
    class RpcProxy extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                endpoint: "/",
                socket: null,
                task: { },
                callbacks: [],
                callMap: new Map(),
                callbackMap: new Map(),
                sessionId: "",
                clientId: "",
                messageQueue: []
            });

            this.notifyable("endpoint");

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                priv.socket.postMessage(priv.sessionId, { type: "exit", clientId: priv.clientId });
                priv.socket.close();
                priv.callMap.clear();
                priv.callbackMap.clear();
            };
        }

        get endpoint() { return d.get(this).endpoint; }
        set endpoint(e)
        {
            d.get(this).endpoint = e;
            this.endpointChanged();
            this.connect();
        }

        connect()
        {
            const priv = d.get(this);

            if (priv.socket)
            {
                priv.socket.close();
            }

            const MSock = shRequire.environment === "node" ? MessageSocketNode : MessageSocket;
            priv.socket = new MSock(priv.endpoint, msg =>
            {
                if (msg.type === "ready")
                {
                    priv.clientId = msg.clientId;
                    priv.sessionId = msg.sessionId;
                    priv.messageQueue.forEach(callId => this.call(callId));
                    priv.messageQueue = [];
                }
                else if (msg.type === "heartbeat")
                {
                    this.log("", "debug", "Got heartbeat from RPC endpoint");
                    priv.socket.postMessage(priv.sessionId, { type: "heartbeat", clientId: priv.clientId });
                }
                else if (msg.type === "exit")
                {
                    this.log("", "debug", "RPC connection closed");
                    priv.callbacks.forEach(cbId =>
                    {
                        priv.callbackMap.delete(cbId);
                    });
                    priv.callbacks = [];
                    priv.sessionId = "";
                    priv.clientId = "";
                    priv.socket = null;
                }
                else if (msg.type === "methodResult")
                {
                    priv.callMap.get(msg.callId).resolve(this.processOutParameters([msg.value])[0]);
                    priv.callMap.delete(msg.callId);
                }
                else if (msg.type === "methodError")
                {
                    priv.callMap.get(msg.callId).reject(msg.value);
                    priv.callMap.delete(msg.callId);
                }
                else if (msg.type === "callback")
                {
                    const params = this.processOutParameters(msg.parameters);
                    const remove = priv.callbackMap.get(msg.callback)(...params);
                    if (remove)
                    {
                        priv.callbackMap.delete(msg.callback);
                    }
                }
            });
            priv.socket.connect();
        }

        call(callId)
        {
            const priv = d.get(this);
            const callItem = priv.callMap.get(callId);

            if (! priv.socket)
            {
                this.connect();
            }

            if (priv.clientId !== "")
            {
                this.log("", "debug", "Calling RPC method: " + callItem.name);
                priv.socket.postMessage(priv.sessionId, { type: "call", clientId: priv.clientId, name: callItem.name, callId, parameters: callItem.parameters });
            }
            else
            {
                priv.messageQueue.push(callId);
            }
        }

        processInParameters(parameters)
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
                    priv.callbacks.push(callbackId);
                    return { type: "callback", clientId: priv.clientId, safeCallback: callbackId };
                }
                else
                {
                    return p;
                }
            });
        }

        processOutParameters(results)
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
                                const params = this.processInParameters(parameters);

                                const callId = idCounter;
                                ++idCounter;
                                priv.callMap.set(callId, {
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

        invoke(name, ...parameters)
        {
            const priv = d.get(this);

            return new Promise((resolve, reject) =>
            {
                const params = this.processInParameters(parameters);

                const callId = idCounter;
                ++idCounter;
                priv.callMap.set(callId, {
                    name,
                    parameters: params,
                    resolve,
                    reject
                });
                this.call(callId);
            });
        }

    }
    exports.RpcProxy = RpcProxy;
});
