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

shRequire(["shellfish/core", __dirname + "/httpsession.js"], (core, httpsession) =>
{
    const modStream = require("stream");

    let idCounter = 0;

    function processSendParameters(parameters)
    {
        const binaries = [];
        const convertedParameters = parameters.map(p =>
        {
            if (typeof p === "object" && (p.constructor.name === "Uint8Array" || p.constructor.name === "Buffer"))
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

    function processReceiveParameters(self, clientId, parameters, binaryData)
    {
        let binaryOffset = 0;

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
                        const [ convertedParameters, binaries ] = processSendParameters(parameters);
                        self.postMessage(clientId, { type: "callback", callback: callbackId, parameters: convertedParameters }, binaries);
                    };
                }
                else if (p.type === "binary")
                {
                    //console.log("BINARY DATA " + p.size);
                    const data = binaryData.slice(binaryOffset, binaryOffset + p.size);
                    //console.log(data);
                    binaryOffset += p.size;
                    return data;
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

    function handleResult(self, clientId, r, onResult, onError)
    {
        //console.log("Handle result: " + r.constructor.name);
        if (typeof r === "object" && r.constructor.name === "Promise")
        {
            r
            .then(v => onResult(v))
            .catch(err => onError(err));
        }
        else if (typeof r === "object" && r.type === "proxy")
        {
            d.get(self).clients.get(clientId).proxies.push(r.instance);
            onResult(r);
        }
        else
        {
            onResult(r);
        }
    }

    function handleMessage(self, clientId, msg, binaryData)
    {
        const priv = d.get(self);

        priv.clients.get(clientId).expires = Date.now() + 60000;

        if (msg.type === "heartbeat")
        {
            // nothing to do
        }
        else if (msg.type === "call")
        {
            // call a registered method

            //console.log("CALL " + JSON.stringify(msg) + " " + binaryData.byteLength);
            if (priv.methods.has(msg.name))
            {
                //console.log("PROCESS PARAMETERS " + msg.name);
                const parameters = processReceiveParameters(self, clientId, msg.parameters, binaryData);
                try
                {
                    const result = priv.methods.get(msg.name)(...parameters);
                    handleResult(self, clientId, result, r =>
                    {
                        const [ convertedParameters, binaries ] = processSendParameters([r]);
                        self.postMessage(clientId, { type: "methodResult", callId: msg.callId, value: convertedParameters[0] }, binaries);
                    },
                    err =>
                    {
                        self.postMessage(clientId, { type: "methodError", callId: msg.callId, value: "" + err });
                    });
                }
                catch (err)
                {
                    self.postMessage(clientId, { type: "methodError", callId: msg.callId, value: "" + err });
                }
            }
            else
            {
                const err = "No such method to call: " + msg.name;
                self.postMessage(clientId, { type: "methodError", callId: msg.callId, value: err });
            }
        }
        else if (msg.type === "exit")
        {
            self.removeClient(clientId);
        }
    }

    const d = new WeakMap();

    /**
     * Class representing a session for handling remote procedure calls (RPC)
     * to use with {@link core.RpcProxy} as the client-side counter part.
     * 
     * The RPC session runs on a {@link server.HTTPServer} and uses the server's
     * SSL encryption, if available. The {@link server.HTTPRoute} may assign
     * an authentication method to the RPC session as well.
     * 
     * Use the route's `generateSessionId` property to make sure that a client
     * that opened a RPC connection will get the same connection on all its
     * RPC calls.
     * 
     * RPC requests have the HTTP header `x-shellfish-rpc-session` set with the
     * session ID, except for the initial connection. This header may be used
     * to open a session per client.
     * 
     * Example
     * ```
     * HTTPRoute {
     *     when: req => req.url.path === "/::rpc"
     *     generateSessionId: req => req.headers.get("x-shellfish-rpc-session") || core.generateUid()
     * 
     *     delegate: template RpcSession {
     *         onInitialization: () =>
     *         {
     *             registerMethod("sum", (a, b) => a + b);
     * 
     *             registerMethod("countDown", cb =>
     *             {
     *                 for (let i = 10; i > 0; --i)
     *                 {
     *                     cb(i);
     *                 }
     *             });
     *         }
     *     }
     * }
     * ```
     * 
     * Example: Creating and returning a RPC proxy object to the client
     * ```
     * class MyClass
     * {
     *     constructor(initial)
     *     {
     *         this.value = initial;
     *     }
     * 
     *     add(n) { this.value += n; }
     *
     *     value() { return this.value; }
     * }
     * 
     * registerMethod("getMyClass", (initial) =>
     * {
     *     return proxyObject(new MyClass(initial));
     * });
     * ```
     * 
     * Values of type `Uint8Array` are transfered in binary form.
     * 
     * @extends server.HTTPSession
     * @memberof server
     */
    class RpcSession extends httpsession.HTTPSession
    {
        constructor()
        {
            super();
            d.set(this, {
                clients: new Map(),
                methods: new Map()
            });

            const priv = d.get(this);

            this.onRequest = req =>
            {
                if (req.method === "GET")
                {
                    const clientId = core.generateUid();
                    this.log("RPC", "info", "RPC client " + clientId + " connected from " + req.sourceAddress);

                    // open reverse channel
                    const reverseChannel = new modStream.PassThrough();
                    reverseChannel.on("close", () =>
                    {
                        this.log("RPC", "debug", "RPC reverse channel to client " + clientId + " closed");
                        priv.clients.delete(clientId);
                    });

                    reverseChannel.on("error", err =>
                    {
                        this.log("RPC", "debug", "RPC reverse channel to client " + clientId + " closed on error: " + err);
                        priv.clients.delete(clientId);
                    });

                    priv.clients.set(clientId, {
                        reverseChannel,
                        proxies: [],
                        expires: Date.now() + 50000
                    });

                    req.response(200, "OK")
                    .header("Keep-Alive", "timeout=60")
                    .stream(reverseChannel, "application/x-shellfish-rpc", -1)
                    .send();

                    this.postMessage(clientId, { type: "ready", clientId: clientId, sessionId: this.sessionId });

                    if (priv.clients.size === 1)
                    {
                        this.heartbeat();
                        this.closeExpired();
                    }
                }
                else if (req.method === "POST")
                {
                    // incoming message
                    req.arrayBuffer().then(data =>
                    {
                        let msg = null;
                        let binaryData = null;
                        try
                        {
                            const view32 = new Uint32Array(data, 0, 1);
                            const jsonSize = view32[0];
                            //console.log("JSON SIZE " + jsonSize + " DATA " + data.byteLength);
                            const jsonData = data.slice(4, 4 + jsonSize);
                            binaryData = data.slice(4 + jsonSize);

                            msg = JSON.parse(new TextDecoder().decode(jsonData));
                        }
                        catch (err)
                        {
                            console.error(err);
                            return;
                        }

                        this.log("RPC", "info", "RPC message from client " + msg.clientId + ", type: " + msg.type);

                        if (! priv.clients.has(msg.clientId))
                        {
                            this.log("RPC", "error", "RPC client " + msg.clientId + " is not connected");
                            req.response(500, "Not Connected")
                            .send();
                        }
                        else
                        {
                            handleMessage(this, msg.clientId, msg, binaryData);
                            req.response(200, "OK")
                            .send();
                        }
                    });
                }
            };

            this.onDestruction = () =>
            {
                const clientIds = [...priv.clients.keys()];
                clientIds.forEach(clientId =>
                {
                    this.removeClient(clientId);
                });
            };
        }

        heartbeat()
        {
            const priv = d.get(this);
            if (priv.clients.size === 0)
            {
                return;
            }

            const clientIds = [...priv.clients.keys()];

            clientIds.forEach(clientId =>
            {
                const client = priv.clients.get(clientId);
                if (client.expires < Date.now() + 25000)
                {
                    this.postMessage(clientId, { type: "heartbeat" });
                }
            });

            this.wait(25000, "heartbeat")
            .then(() =>
            {
                this.heartbeat();
            });
        }

        closeExpired()
        {
            const priv = d.get(this);
            if (priv.clients.size === 0)
            {
                return;
            }

            const clientIds = [...priv.clients.keys()];

            clientIds.forEach(clientId =>
            {
                const client = priv.clients.get(clientId);
                if (client.expires < Date.now())
                {
                    this.log("RPC", "info", "RPC client " + clientId + " expired");
                    this.removeClient(clientId);
                }
            });

            this.wait(60000, "closeExpired")
            .then(() =>
            {
                this.closeExpired();
            });
        }

        removeClient(clientId)
        {
            const priv = d.get(this);
            const client = priv.clients.get(clientId);
            client.reverseChannel.end();
            client.proxies.forEach(proxyId =>
            {
                const methods = [...priv.methods.keys()];
                methods.forEach(methodId =>
                {
                    if (methodId.startsWith(proxyId + "."))
                    {
                        priv.methods.delete(methodId);
                    }
                });
            });
            priv.clients.delete(clientId);

            if (priv.clients.size === 0)
            {
                this.log("RPC", "debug", "All clients disconnected");
                this.abortWait("heartbeat");
                this.abortWait("closeExpired");
            }
        }

        /**
         * Posts a message to the given client.
         * 
         * @private
         * 
         * @param {string} clientId - The client ID.
         * @param {string} message - The message.
         * @param {{Uint8Array[]}} binaries - An optional list of Uint8Array binaries.
         */
        postMessage(clientId, message, binaries)
        {
            const priv = d.get(this);

            const client = priv.clients.get(clientId);
            if (client)
            {
                if (! binaries)
                {
                    binaries = [];
                }

                const enc = new TextEncoder();
                const data = enc.encode(JSON.stringify(message));
                //console.log("OUT: " + JSON.stringify(message));
                this.log("RPC", "info", "RPC send message to client " + clientId + ", type: " + message.type);
    
                const size = data.length;
                const buffer = new ArrayBuffer(size + 8);
                const view32 = new Uint32Array(buffer, 0, 2);
                view32[0] = size;
                view32[1] = binaries.map(b => b.length).reduce((a, b) => a + b, 0);
                const view8 = new Uint8Array(buffer);
                view8.set(data, 8);
    
                client.reverseChannel.write(view8);

                if (binaries)
                {
                    binaries.forEach(b => client.reverseChannel.write(b));
                }
            }
            else
            {
                this.log("RPC", "debug", "Client " + clientId + " is not available");
            }

        }

        /**
         * Registers a function as RPC method.
         * 
         * @param {string} name - The name of the method.
         * @param {function} f - The method's implementation.
         */
        registerMethod(name, f)
        {
            d.get(this).methods.set(name, f);
        }

        /**
         * Creates a RPC proxy object of the given object, which can then be
         * passed to the RPC client.
         * 
         * @param {object} obj - The object for which to create the proxy.
         * @param {[string[]]} exposedMethods - An optional list of the methods to expose. If this parameter is not used, all methods will be exposed.
         * @returns {object} The RPC proxy object.
         */
        proxyObject(obj, exposedMethods)
        {
            const proxyId = idCounter;
            ++idCounter;

            const methods = [];

            function allKeys(obj)
            {
                let keys = Object.getOwnPropertyNames(obj)
                .filter(n => n !== "constructor")
                .filter(n => typeof obj[n] === "function")
                .filter(n => exposedMethods ? exposedMethods.indexOf(n) !== -1 : true);
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
                this.registerMethod(proxyId + "." + key, obj[key].bind(obj));
                methods.push(key);
            });

            return { type: "proxy", instance: proxyId, methods: methods };
        }
    }
    exports.RpcSession = RpcSession;

});