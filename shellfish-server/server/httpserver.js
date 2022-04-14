/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/core"], core =>
{
    const modHttp = require("http");

    const d = new WeakMap();

    /**
     * Class representing a HTTP server.
     * 
     * The HTTP server passes requests to its {@link server.HTTPRoute} child
     * elements.
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {string} host - (default: `"0.0.0.0"`) The host address to listen at.
     * @property {number} keepAlive - (default: `5000`) The time in ms to keep a client connection alive, if the client requested so.
     * @property {number} port - (default: `8000`) The port number to listen at.
     */
    class HTTPServer extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                host: "0.0.0.0",
                port: 8000,
                server: null,
                keepAlive: 5000,
                connecting: false
            });

            this.notifyable("host");
            this.notifyable("keepAlive");
            this.notifyable("port");

            this.onInitialization = () =>
            {
                this.listen();
            };
        }

        get host() { return d.get(this).host; }
        set host(h)
        {
            d.get(this).host = h;
            this.hostChanged();
        }

        get keepAlive() { return d.get(this).keepAlive; }
        set keepAlive(k)
        {
            const priv = d.get(this);
            priv.keepAlive = k;
            this.keepAliveChanged();

            if (priv.server)
            {
                priv.server.keepAliveTimeout = k;
            }
        }

        get port() { return d.get(this).port; }
        set port(p)
        {
            d.get(this).port = p;
            this.portChanged();
        }

        listen()
        {
            const priv = d.get(this);
            if (! priv.connecting)
            {
                priv.connecting = true;
                this.wait(0)
                .then(() =>
                {
                    priv.connecting = false;
                    this.doListen();
                });
            }
        }

        doListen()
        {
            const priv = d.get(this);

            if (priv.server)
            {
                priv.server.close();
            }

            priv.server = modHttp.createServer();
            priv.server.keepAliveTimeout = priv.keepAlive;

            priv.server.on("request", (request, response) =>
            {
                let handled = false;
                this.children
                .filter(c => c.when !== undefined && c.handleRequest !== undefined)
                .filter(c => c.when(request))
                .forEach((route, idx) =>
                {
                    if (idx === 0)
                    {
                        route.handleRequest(request, response);
                        handled = true;
                    }
                });

                if (! handled)
                {
                    this.log("HTTPServer", "warning", "No HTTP route available: " + request.method + " " + request.url);
                    response.writeHead(404, "Not Found");
                    response.end();
                }
            });
            priv.server.listen(priv.port, priv.host);
            this.log("HTTPServer", "info", "Listen at " + priv.host + ":" + priv.port);
        }
    }
    exports.HTTPServer = HTTPServer;
});