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
                    const callbackId = p.callbackId;
                    return (...parameters) =>
                    {
                        const [ convertedParameters, binaries ] = processSendParameters(parameters);
                        self.postMessage(clientId, { type: "callback", callbackId: callbackId, parameters: convertedParameters }, binaries);
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
            d.get(self).clients.get(clientId).proxies.push(r.instanceId);
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
                        self.postMessage(clientId, { type: "result", callId: msg.callId, value: convertedParameters[0] }, binaries);
                    },
                    err =>
                    {
                        self.postMessage(clientId, { type: "error", callId: msg.callId, value: "" + err });
                    });
                }
                catch (err)
                {
                    self.postMessage(clientId, { type: "error", callId: msg.callId, value: "" + err });
                }
            }
            else
            {
                const err = "No such method to call: " + msg.name;
                self.postMessage(clientId, { type: "error", callId: msg.callId, value: err });
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
     * Parameters of type `Uint8Array` are transfered in binary form.
     * 
     * ## Details of the RPC Protocol
     * 
     * This section describes the underlying RPC protocol. Understanding the protocol is
     * not required for using the {@link core.RpcProxy} or {@link server.RpcSession}.
     * 
     * ### Communication
     * 
     * The communication between client and server (endpoint) runs over HTTP or HTTPS
     * with a reverse channel for receiving asynchronous messages from the server.
     * 
     * Initially, the client sends a `GET` request to the endpoint in order to retrieve
     * the reverse channel. From then on, the client sends messages to the endpoint via
     * `POST` messages, while the server sends messages to the client via the reverse
     * channel.
     * 
     * ### Message Data
     * 
     * Messages consist of a JSON document describing the type of message along with
     * type-specific properties, and an optional chunk of binary data.
     * 
     * The binary chunk is used when transfering parameters in binary form.
     * 
     * A message looks like this:
     * 
     *  - `JSON_SIZE` - 32 bits: The size of the JSON document in bytes.
     *  - `BINARY_SIZE` - 32 bits: The size of the binary chunk in bytes.
     *  - `JSON`: The JSON document. This is the message body.
     *  - `BINARIES`: The chunk of binary data. This is a concatenation of the binary parameters in the message.
     * 
     * For messages without binary parts, the `BINARIES` chunk is of size `0`.
     *
     * ### Initiating the Connection
     * 
     * In order to initiate a connection and retrieve the reverse channel, the client
     * sends a `GET` request to the endpoint. The server's response will be an unlimited
     * data stream with `ContentType: application/x-shellfish-rpc`, over which incoming
     * messages will arrive. This is the reverse channel.
     * 
     * Upon successful connection, the server sends a `ready` message to the client along
     * with a unique `clientId` and `sessionId`, e.g.
     * ```
     * { type: "ready", clientId: "7b12a3-a2ce36-598a73", sessionId: "2683a9-453d46-58df44" }
     * ```
     * All RPC `POST` messages sent from the client to the endpoint are expected to have
     * the `x-shellfish-rpc-session` HTTP header set with the session ID received above.
     * This allows the server to route the message to the corresponding `RPCSession` instance.
     * 
     * ### Message Types
     * 
     * #### `heartbeat`
     * 
     * At intervals (every 30 seconds) the server will send a `heartbeat` message to clients
     * that haven't recently sent any messages
     * ```
     * { type: "heartbeat" }
     * ```
     * and expects to receive a response `heartbeat` message.
     * ```
     * { type: "heartbeat", clientId: "7b12a3-a2ce36-598a73" }
     * ```
     * If a client does not respond to the heartbeat request, the server will close the
     * connection and destroy any context it may have associated with it.
     * 
     * #### `exit`
     * 
     * The client may send an `exit` message to the server in order to close a connection
     * immediately.
     * ```
     * { type: "exit", clientId: "7b12a3-a2ce36-598a73" }
     * ```
     * 
     * #### `call`
     * 
     * The client sends a `call` message to the server in order to invoke a remote procedure
     * by name.
     * ```
     * { type: "call", clientId: "7b12a3-a2ce36-598a73", name: "foo", callId: 42, parameters }
     * ```
     * The property `callId` is an ID by which the client associates `result` and `error` messages
     * with this particular remote call.
     * 
     * The property `name` is the name of the remote procedure to invoke.
     * 
     * The property `parameters` is a list of parameter items (see below) passed to the remote procedure.
     * 
     * #### `result`
     * 
     * When a remote procedure is finished, the server sends a `result` message with the
     * result value to the client.
     * ```
     * { type: "result", callId: 42, value: "This is the result" }
     * ```
     * The `value` property contains a single parameter item with the return value.
     * 
     * #### `error`
     * 
     * If a remote procedure fails, the server sends an `error` message to the client.
     * ```
     * { type: "error", callId: 42, value: "Some error occured." }
     * ```
     * The `value` property contains the error message string.
     * 
     * #### `callback`
     * 
     * Callbacks invoked by the server asynchronously are sent by the `callback` message.
     * ```
     * { type: "callback", callbackId: 11, parameters }
     * ```
     * The `callbackId` property contains the ID of the callback which is recognized by the client.
     * 
     * The `parameters` property contains a list of parameter items.
     * 
     * ### Parameter Items
     * 
     * There are four types of parameters: callbacks, proxy objects, binary data, and JSON-serializable data.
     * 
     * JSON-serializable data is passed as is.
     * 
     * Binary data is passed as binary items:
     * ```
     * { type: "binary", size: 32768 }
     * ```
     * The property `size` is the size of this particular parameter value in bytes within
     * the `BINARIES` chunk of the message.
     * 
     * Callbacks are passed as callback items:
     * ```
     * { type: "callback", clientId: "7b12a3-a2ce36-598a73", callbackId: 11 }
     * ```
     * The property `callback` is an ID recognized by the client and is associated with
     * a function stored on the client side.
     * 
     * Proxy objects may only be passed from the server to the client. A proxy object item looks like
     * ```
     * { type: "proxy", instanceId: 99, methods: ["foo", "bar"] }
     * ```
     * The property `instanceId` is an ID recognized by the server and is associated with the
     * instance of the actual object.
     * 
     * The property `methods` is a list of available method names that may be called via the
     * `call` message by appending to the `instanceId` ID, e.g.
     * ```
     * { type: "call", clientId: "7b12a3-a2ce36-598a73", name: "99.foo", callId: 43, parameters: ["data"] }
     * ```
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

                    this.log("RPC", "debug", "Connected clients on " + this.objectId + ": " + priv.clients.size);
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
                            const view32 = new Uint32Array(data, 0, 2);
                            const jsonSize = view32[0];
                            //console.log("JSON SIZE " + jsonSize + " DATA " + data.byteLength);
                            const jsonData = data.slice(8, 8 + jsonSize);
                            binaryData = data.slice(8 + jsonSize);

                            msg = JSON.parse(new TextDecoder().decode(jsonData));
                        }
                        catch (err)
                        {
                            console.error(err);
                            return;
                        }

                        let logDetails = "";
                        if (msg.type === "call")
                        {
                            logDetails = ", call ID: " + msg.callId + ", name: " + msg.name + ", " + msg.parameters.length + " parameters";
                        }
                        this.log("RPC", "info", "RECEIVE message from client " + msg.clientId + ", type: " + msg.type + logDetails);

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
                this.log("RPC", "debug", "All clients disconnected from " + this.objectId);
                this.abortWait("heartbeat");
                this.abortWait("closeExpired");
            }
            else
            {
                this.log("RPC", "debug", "Connected clients on " + this.objectId + ": " + priv.clients.size);
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
                let logDetails = "";
                if (message.type === "result" || message.type === "error")
                {
                    logDetails = ", call ID: " + message.callId;
                }
                this.log("RPC", "info", "SEND message to client " + clientId + ", type: " + message.type + logDetails);
    
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
         * ### Example
         * ```
         * registerMethod("sum", (a, b) => a + b);
         * 
         * registerMethod("countDown", cb =>
         * {
         *     for (let i = 10; i > 0; --i)
         *     {
         *         cb(i);
         *     }
         * });
         * ```
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
         * ### Example
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
         * @param {object} obj - The object for which to create the proxy.
         * @param {string[]} exposedMethods - An optional list of the methods to expose. If this parameter is not used, all methods will be exposed.
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

            return { type: "proxy", instanceId: proxyId, methods: methods };
        }
    }
    exports.RpcSession = RpcSession;

});