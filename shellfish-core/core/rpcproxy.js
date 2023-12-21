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

        postMessage(sessionId, message, binaries)
        {
            //console.log("Send: " + JSON.stringify(message));

            if (! binaries)
            {
                binaries = [];
            }
            const binarySize = binaries.map(b => b.length).reduce((a, b) => a + b, 0);
            //console.log("SEND BINARY SIZE: " + binarySize);
            //console.log(binaries);
            const json = JSON.stringify(message);
            const jsonData = new TextEncoder().encode(json);
            const buffer = new Uint8Array(8 + jsonData.length + binarySize);
            const view32 = new Uint32Array(buffer.buffer, 0, 2);
            view32[0] = jsonData.length;
            view32[1] = binarySize;
            
            let offset = 8;
            buffer.set(jsonData, offset);
            offset += jsonData.length;
            
            binaries.forEach(b =>
            {
                buffer.set(b, offset);
                offset += b.length;
            });

            const headers = new Headers();
            headers.append("x-shellfish-rpc-session", sessionId);
            fetch(this.endpoint, {
                method: "POST",
                headers,
                body: buffer
            })
            .then(response =>
            {
                if (! response.ok)
                {
                    console.error(response.statusText);
                    this.handler({ type: "exit" });
                }
            })
            .catch(err =>
            {
                console.error(JSON.stringify(message) + " " + err);
                this.handler({ type: "exit" });
            });
        }

        connect()
        {
            fetch(this.endpoint)
            .then(async response =>
            {
                if (response.ok)
                {
                    //console.log("Established reverse channel");
                    let buffer = null;
                    let bufferOffset = 0;
                    let dataOffset = 0;
                    let jsonSize = 0;

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
                            // value might be undefined in here (when server closes connection)
                            if (value === undefined)
                            {
                                break;
                            }
                        }
                        
                        if (buffer === null)
                        {
                            jsonSize = value[dataOffset++] +
                                       (value[dataOffset++] << 8) +
                                       (value[dataOffset++] << 16) +
                                       (value[dataOffset++] << 24);

                            const binarySize = value[dataOffset++] +
                                               (value[dataOffset++] << 8) +
                                               (value[dataOffset++] << 16) +
                                               (value[dataOffset++] << 24);

                            buffer = new ArrayBuffer(jsonSize + binarySize);
                            bufferOffset = 0;
                        }

                        const view8 = new Uint8Array(value.buffer,
                                                     dataOffset,
                                                     Math.min(value.length - dataOffset, buffer.byteLength - bufferOffset));
                        new Uint8Array(buffer, bufferOffset).set(view8);
                        bufferOffset += view8.length;
                        dataOffset += view8.length;

                        if (bufferOffset === buffer.byteLength)
                        {
                            const jsonData = buffer.slice(0, jsonSize);
                            const binaryData = buffer.slice(jsonSize);

                            const dec = new TextDecoder();
                            const json = dec.decode(jsonData);
                            try
                            {
                                //console.log("Receive: " + json);
                                const message = JSON.parse(json);
                                this.handler(message, binaryData);
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
                else
                {
                    console.error("RPC connection closed on error: " + response.statusText);
                    this.handler({ type: "exit" });
                }
            })
            .catch(err =>
            {
                console.error("RPC connection closed on error: " + err);
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

        postMessage(sessionId, message, binaries)
        {
            //console.log("Send: " + JSON.stringify(message));

            if (! binaries)
            {
                binaries = [];
            }
            const binarySize = binaries.map(b => b.length).reduce((a, b) => a + b, 0);
            const json = JSON.stringify(message);
            const jsonData = new TextEncoder().encode(json);
            const buffer = new Uint8Array(8 + jsonData.length + binarySize);
            const view32 = new Uint32Array(buffer.buffer, 0, 2);
            view32[0] = jsonData.length;
            view32[1] = binarySize;
            
            let offset = 8;
            buffer.set(jsonData, offset);
            offset += jsonData.length;
            
            binaries.forEach(b =>
            {
                buffer.set(b, offset);
                offset += b.length;
            });

            const req = this.modHttp.request(this.endpoint, {
                method: "POST",
                headers: {
                    "x-shellfish-rpc-session": sessionId
                }
            });
            req.write(buffer);
            //req.write(JSON.stringify(message));
            req.end();
        }

        async connect()
        {
            let done = false;
            let value = null;

            const req = this.modHttp.request(this.endpoint);

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
            let jsonSize = 0;

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
                    jsonSize = value[dataOffset++] +
                               (value[dataOffset++] << 8) +
                               (value[dataOffset++] << 16) +
                               (value[dataOffset++] << 24);

                    const binarySize = value[dataOffset++] +
                                 (value[dataOffset++] << 8) +
                                 (value[dataOffset++] << 16) +
                                 (value[dataOffset++] << 24);

                    buffer = new ArrayBuffer(jsonSize + binarySize);
                    bufferOffset = 0;
                }

                const view8 = new Uint8Array(value.buffer,
                                             dataOffset,
                                             Math.min(value.length - dataOffset, buffer.byteLength - bufferOffset));
                new Uint8Array(buffer, bufferOffset).set(view8);
                bufferOffset += view8.length;
                dataOffset += view8.length;

                if (bufferOffset === buffer.byteLength)
                {
                    const jsonData = buffer.slice(0, jsonSize);
                    const binaryData = buffer.slice(jsonSize);

                    const dec = new TextDecoder();
                    const json = dec.decode(jsonData);
                    try
                    {
                        //console.log("Receive: " + json);
                        const message = JSON.parse(json);
                        this.handler(message, binaryData);
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
     * Example: Invoke a remote function
     * ```
     * RpcProxy {
     *     endpoint: "/::rpc"
     * 
     *     onInitialization: () =>
     *     {
     *         console.log("Invoking a remote function");
     *         invoke("remoteCall", [1, 2, 3])
     *         .then(result =>
     *         {
     *             console.log("Result: " + result);
     *         }
     *     }
     * 
     * }
     * ```
     * 
     * It is possible to pass callback functions to a RPC call.
     * 
     * Example: Using callbacks
     * ```
     * invoke("doSomething", progress =>
     * {
     *     console.log("Current progress: " + Math.round(progress * 100) + "%");
     * })
     * .then(result =>
     * {
     *     console.log("Result: " + result);
     * });
     * ```
     * 
     * The RPC endpoint may return proxy objects for complex interfaces.
     * 
     * Example: Using a proxy object
     * ```
     * invoke("getProxyInstance")
     * .then(async proxy =>
     * {
     *     const sum = await proxy.addRemote(1, 2);
     *     await proxy.countDown(n => console.log(n));
     * });
     * ```
     * 
     * Values of type `Uint8Array` are transfered in binary form.
     * 
     * @extends core.Object
     * @memberof core
     * 
     * @property {string} endpoint - (default: `"/"`) The address of the RPC endpoint.
     * @property {string} status - [readonly] The current connection status. One of `disconnected|connecting|connected`
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
                messageQueue: [],
                status: "disconnected"
            });

            this.notifyable("endpoint");
            this.notifyable("status");

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                if (priv.socket)
                {
                    priv.socket.postMessage(priv.sessionId, { type: "exit", clientId: priv.clientId });
                    priv.socket.close();
                }
                priv.callMap.clear();
                priv.callbackMap.clear();
            };
        }

        get status() { return d.get(this).status; }

        get endpoint() { return d.get(this).endpoint; }
        set endpoint(e)
        {
            d.get(this).endpoint = e;
            this.endpointChanged();
            this.connectRpc();
        }

        connectRpc()
        {
            const priv = d.get(this);

            if (priv.socket)
            {
                priv.socket.close();
            }

            priv.status = "connecting";
            this.statusChanged();

            const MSock = shRequire.environment === "node" ? MessageSocketNode : MessageSocket;
            priv.socket = new MSock(priv.endpoint, this.safeCallback((msg, binaryData) =>
            {
                if (msg.type === "ready")
                {
                    priv.clientId = msg.clientId;
                    priv.sessionId = msg.sessionId;

                    priv.status = "connected";
                    this.statusChanged();

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
                    priv.status = "disconnected";
                    this.statusChanged();

                    priv.callbacks.forEach(cbId =>
                    {
                        priv.callbackMap.delete(cbId);
                    });
                    priv.callbacks = [];
                    priv.sessionId = "";
                    priv.clientId = "";
                    priv.socket = null;
                }
                else if (msg.type === "result")
                {
                    priv.callMap.get(msg.callId).resolve(this.processReceiveParameters([msg.value], binaryData)[0]);
                    priv.callMap.delete(msg.callId);
                }
                else if (msg.type === "error")
                {
                    priv.callMap.get(msg.callId).reject(msg.value);
                    priv.callMap.delete(msg.callId);
                }
                else if (msg.type === "callback")
                {
                    const params = this.processReceiveParameters(msg.parameters, binaryData);
                    const remove = priv.callbackMap.get(msg.callbackId)(...params);
                    if (remove)
                    {
                        priv.callbackMap.delete(msg.callbackId);
                    }
                }
            }));
            priv.socket.connect();
        }

        call(callId)
        {
            const priv = d.get(this);
            const callItem = priv.callMap.get(callId);

            if (! priv.socket)
            {
                this.connectRpc();
            }

            if (priv.clientId !== "")
            {
                this.log("", "debug", "Calling RPC method: " + callItem.name);
                priv.socket.postMessage(priv.sessionId, { type: "call", clientId: priv.clientId, name: callItem.name, callId, parameters: callItem.parameters }, callItem.binaries);
            }
            else
            {
                priv.messageQueue.push(callId);
            }
        }

        processSendParameters(parameters)
        {
            const priv = d.get(this);

            const binaries = [];
            const convertedParameters = parameters.map(p =>
            {
                //console.log(typeof p);
                if (typeof p === "function")
                {
                    // replace function with callback handle

                    const callbackId = idCounter;
                    ++idCounter;
                    priv.callbackMap.set(callbackId, p);
                    priv.callbacks.push(callbackId);
                    return { type: "callback", clientId: priv.clientId, callbackId: callbackId };
                }
                else if (typeof p === "object" && p.constructor.name === "Uint8Array")
                {
                    binaries.push(p);
                    return { type: "binary", size: p.length };
                }
                else
                {
                    return p;
                }
            });

            return [ convertedParameters, binaries ];
        }

        processReceiveParameters(results, binaryData)
        {
            const priv = d.get(this);

            let binaryOffset = 0;

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
                                const [ params, binaries ] = this.processSendParameters(parameters);

                                const callId = idCounter;
                                ++idCounter;
                                priv.callMap.set(callId, {
                                    name: r.instanceId + "." + method,
                                    parameters: params,
                                    binaries,
                                    resolve,
                                    reject
                                });
                                this.call(callId);
                            });
                        }
                    });
                    return proxy;
                }
                else if (!! r && typeof r === "object" && r.type === "binary")
                {
                    const data = binaryData.slice(binaryOffset, binaryOffset + r.size);
                    binaryOffset += r.size;
                    return new Uint8Array(data);
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
                const [ params, binaries ] = this.processSendParameters(parameters);

                const callId = idCounter;
                ++idCounter;
                priv.callMap.set(callId, {
                    name,
                    parameters: params,
                    binaries,
                    resolve,
                    reject
                });
                this.call(callId);
            });
        }

    }
    exports.RpcProxy = RpcProxy;
});
