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

shRequire([__dirname + "/httpsession.js"], httpsession =>
{
    const modStream = require("stream");

    let idCounter = 0;

    function processInParameters(self, parameters)
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
                        self.postMessage({ type: "callback", callback: callbackId, parameters });
                    };
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

    function handleMessage(self, msg)
    {
        const priv = d.get(self);

        if (msg.type === "task")
        {
            const result = eval(msg.code);
            handleResult(result, r =>
            {
                self.postMessage({ type: "result", value: r });
            },
            err =>
            {
                self.postMessage({ type: "error", value: "" + err });
                self.postMessage({ type: "exit" });
            });
        }
        else if (msg.type === "call")
        {
            // call a registered method

            if (priv.methods.has(msg.name))
            {
                const parameters = processInParameters(self, msg.parameters);
                try
                {
                    const result = priv.methods.get(msg.name)(...parameters);
                    handleResult(result, r =>
                    {
                        self.postMessage({ type: "methodResult", callId: msg.callId, value: r });
                    },
                    err =>
                    {
                        self.postMessage({ type: "methodError", callId: msg.callId, value: "" + err });
                    });
                }
                catch (err)
                {
                    self.postMessage({ type: "methodError", callId: msg.callId, value: "" + err });
                }
            }
            else
            {
                const err = "No such method to call: " + msg.name;
                self.postMessage({ type: "methodError", callId: msg.callId, value: err });
            }
        }
    }

    const d = new WeakMap();

    class RpcSession extends httpsession.HTTPSession
    {
        constructor()
        {
            super();
            d.set(this, {
                reverseChannel: null,
                methods: new Map()
            });

            this.registerEvent("message");

            const priv = d.get(this);

            this.onRequest = req =>
            {
                console.log("message request " + req.method);
                if (req.method === "GET")
                {
                    // open reverse channel
                    priv.reverseChannel = new modStream.PassThrough();

                    req.response(200, "OK")
                    .stream(priv.reverseChannel, "application/x-shellfish-socket", -1)
                    .send();

                    this.postMessage({ type: "ready" });
                }
                else if (req.method === "POST")
                {
                    // incoming message
                    req.body().then(data =>
                    {
                        console.log(data);
                        const msg = JSON.parse(data);
                        handleMessage(this, msg);
                        //this.message(msg);
                    });
                }
            };
        }

        postMessage(message)
        {
            const priv = d.get(this);

            const enc = new TextEncoder();
            const data = enc.encode(JSON.stringify(message));
            console.log("POST " + JSON.stringify(message));

            const size = data.length;
            const buffer = new ArrayBuffer(size + 4);
            const view32 = new Uint32Array(buffer, 0, 1);
            view32[0] = size;
            const view8 = new Uint8Array(buffer);
            view8.set(data, 4);

            priv.reverseChannel.write(view8);
        }

        registerMethod(name, f)
        {
            d.get(this).methods.set(name, f);
        }

        proxyObject(obj)
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
                this.registerMethod(proxyId + "." + key, obj[key].bind(obj));
                methods.push(key);
            });

            return { type: "proxy", instance: proxyId, methods: methods };
        }
    }
    exports.RpcSession = RpcSession;

});