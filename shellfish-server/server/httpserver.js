/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2022 - 2023 Martin Grimme <martin.grimme@gmail.com>

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
    const modFs = require("fs");
    const modHttp = require("http");
    const modHttps = require("https");
    const modUrl = require("url");


    /* Parses a HTTP range attribute and returns a [from, to] tuple.
     * Returns an empty tuple if the range could not be parsed.
     */
    function parseRange(range)
    {
        let parts = range.split("=");
        if (parts[0] === "bytes")
        {
            parts = parts[1].split("-");
            return [parseInt(parts[0], 10), parseInt(parts[1] || "-1", 10)];
        }
        else
        {
            return [];
        }
    }

    /**
     * A HTTP request event.
     * @typedef HTTPRequestEvent
     * @memberof server.HTTPServer
     * 
     * @property {bool} accepted - (default: `false`) Set to `true` to accept the event and prevent it from bubbling up.
     * @property {Map} cookies - A map of the HTTP cookies.
     * @property {Map} headers - A map of the HTTP headers.
     * @property {string} method - The name of the HTTP method.
     * @property {HTTPRequest} original - The original HTTP request of Node.js.
     * @property {string} sourceAddress - The remote source address.
     * @property {number} sourcePort - The remote source port.
     * @property {object} url - The URL.
     */
    function makeRequestEvent(request)
    {
        const now = Date.now();

        const cookies = new Map();
        if (request.headers.cookie)
        {
            const cookieString = request.headers.cookie;
            cookieString.split(";").forEach(part =>
            {
                const cookie = part.split("=");
                cookies.set(
                    cookie[0].replace(/^ /g, ""),
                    decodeURIComponent(cookie[1])
                );
            });
        }

        const headers = new Map();
        for (const key in request.headers)
        {
            headers.set(key.toLowerCase(), request.headers[key]);
        }

        const urlObj = new modUrl.URL("" + request.url, "http://localhost");

        const params = { };
        for (const entry of urlObj.searchParams.entries())
        {
            params[entry[0]] = entry[1];
        }

        return {
            accepted: false,
            original: request,
            sourceAddress: request.connection.remoteAddress,
            sourcePort: request.connection.remotePort,
            cookies: cookies,
            headers: headers,
            method: request.method,
            range: headers.has("range") ? parseRange(headers.get("range")) : [],
            url: {
                hash: urlObj.hash,
                host: urlObj.host,
                hostname: urlObj.hostname,
                href: urlObj.href,
                origin: urlObj.origin,
                parameters: params,
                password: urlObj.password,
                path: urlObj.pathname,
                port: urlObj.port,
                protocol: urlObj.protocol,
                search: urlObj.search,
                username: urlObj.username
            }
        };
    }

    const d = new WeakMap();

    /**
     * Class representing a HTTP or HTTPS server.
     * 
     * The HTTP server passes requests to its {@link server.HTTPRoute} child
     * elements. The HTTP route handling the request will create or re-use a
     * delegate {@link server.HTTPSession} handler.
     * 
     * Every request is handled by at most one HTTP route.
     * 
     * ### Example
     * 
     *     HTTPServer {
     *         port: 8080
     * 
     *         HTTPRoute {
     *             // handle requests with path starting with "/api"
     *             when: req => req.url.path.startsWith("/api")
     * 
     *             delegate: template HTTPSession {
     * 
     *             }
     *         }
     * 
     *         HTTPRoute {
     *             // handle all remaining requests
     * 
     *             delegate: template WebSession {
     * 
     *             }
     *         }
     *     }
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {string} certificate - (default: `""`) The path to the server certificate in PEM format, if `secure` is set.
     * @property {bool} enabled - (default: `true`) Whether the HTTP server is enabled or disabled.
     * @property {string} host - (default: `"0.0.0.0"`) The host address to listen at.
     * @property {number} keepAlive - (default: `5000`) The time in ms to keep a client connection alive, if the client requested so.
     * @property {string} key - (default: `""`) The path to the server private key in PEM format, if `secure` is set.
     * @property {number} port - (default: `8000`) The port number to listen at.
     * @property {bool} secure - (default: `false`) If `true`, the server uses SSL and requires the `certificate` and `key` properties to be set.
     */
    class HTTPServer extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                enabled: true,
                host: "0.0.0.0",
                port: 8000,
                secure: false,
                certificate: "",
                key: "",
                server: null,
                keepAlive: 5000,
                connecting: false
            });

            this.notifyable("certificate");
            this.notifyable("enabled");
            this.notifyable("host");
            this.notifyable("keepAlive");
            this.notifyable("key");
            this.notifyable("port");
            this.notifyable("secure");

            this.onInitialization = () =>
            {
                this.listen();
            };
        }

        get enabled() { return d.get(this).enabled; }
        set enabled(e)
        {
            if (e !== d.get(this).enabled)
            {
                d.get(this).enabled = e;
                this.enabledChanged();
                this.listen();
            }
        }

        get certificate() { return d.get(this).certificate; }
        set certificate(c)
        {
            if (c !== d.get(this).certificate)
            {
                d.get(this).certificate = c;
                this.certificateChanged();
                this.listen();
            }
        }

        get host() { return d.get(this).host; }
        set host(h)
        {
            if (h !== d.get(this).host)
            {
                d.get(this).host = h;
                this.hostChanged();
                this.listen();
            }
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

        get key() { return d.get(this).key; }
        set key(k)
        {
            if (k !== d.get(this).key)
            {
                d.get(this).key = k;
                this.keyChanged();
                this.listen();
            }
        }

        get port() { return d.get(this).port; }
        set port(p)
        {
            if (p !== d.get(this).port)
            {
                d.get(this).port = p;
                this.portChanged();
                this.listen();
            }
        }

        get secure() { return d.get(this).secure; }
        set secure(s)
        {
            if (s !== d.get(this).secure)
            {
                d.get(this).secure = s;
                this.secureChanged();
                this.listen();
            }
        }

        listen()
        {
            const priv = d.get(this);
            if (! priv.connecting && this.lifeCycleStatus !== "new")
            {
                priv.connecting = true;
                this.defer(() =>
                {
                    priv.connecting = false;
                    this.doListen();
                }, "listen");
            }
        }

        doListen()
        {
            const priv = d.get(this);

            if (priv.server)
            {
                priv.server.close();
                this.log("HTTPServer", "info", "Closed Server");
            }

            if (! priv.enabled)
            {
                return;
            }

            if (priv.secure)
            {
                try
                {
                    const sslServerKey = modFs.readFileSync(priv.key, "utf8");
                    const sslServerCert = modFs.readFileSync(priv.certificate, "utf8");
                    priv.server = modHttps.createServer({ key: sslServerKey, cert: sslServerCert });
                }
                catch (err)
                {
                    this.log("HTTPServer", "fatal", "Invalid or missing server certificate or key: " + err);
                    return;
                }
            }
            else
            {
                priv.server = modHttp.createServer();
            }
            priv.server.keepAliveTimeout = priv.keepAlive;

            priv.server.on("request", (request, response) =>
            {
                const ev = makeRequestEvent(request);

                let handled = false;
                this.children
                .filter(c => c.when !== undefined && c.handleRequest !== undefined)
                .filter(c => c.when(ev))
                .forEach((route, idx) =>
                {
                    if (idx === 0)
                    {
                        route.handleRequest(ev, response);
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
            this.log("HTTPServer", "info", "Listen at " + priv.host + ":" + priv.port + (priv.secure ? " (SSL)" : ""));
        }
    }
    exports.HTTPServer = HTTPServer;
});