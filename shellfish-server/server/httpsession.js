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
    const modUrl = require("url");

    function makeRequestEvent(self, urlMapper, request, response, user)
    {
        const now = Date.now();

        const makeResponse = (code, status) =>
        {
            const r = new HTTPResponse(response, code, status, self.safeCallback(res =>
            {
                self.log("HTTP",
                         "info",
                         (user ? user + "@" : "") +
                         d.get(self).sessionId + " - " +
                         request.method + " " +
                         request.unmappedUrl.path + ": " +
                         code + " " + status + " " +
                         (Date.getTime() - now) + "ms");
                self.responseReady(res);
            }));
            return r;
        };

        const urlObj = new modUrl.URL(urlMapper("" + request.original.url), "http://localhost");

        const params = { };
        for (const entry of urlObj.searchParams.entries())
        {
            params[entry[0]] = entry[1];
        }

        request.body = () => { return readRequest(request.original); },
        request.stream = request.original,
        request.response = makeResponse,
        request.unmappedUrl = request.url;
        request.url = {
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
        },
        request.user = user;

        return request;

    }

    /**
     * Class representing a HTTP response.
     * 
     * The setter methods of this class return the class instance itself, so
     * method calls may be chained.
     * 
     * @memberof server
     * 
     * @example
     * response(200, "OK")
     * .cookie("MyCookie", "42")
     * .body("Hello World", "text/html")
     * .send();
     */
    class HTTPResponse
    {
        constructor(response, code, status, callback)
        {
            this.code = code;
            this.status = status;
            this.response = response;
            this.cookies = new Map();
            this.headers = new Map();
            this.data = "";
            this.dataStream = null;
            this.dataSize = -1;
            this.callback = callback;
        }
        
        /**
         * Sends the response.
         */
        send()
        {
            this.callback(this);

            const cookies = [...this.cookies].map(item =>
            {
                return item[0] + "=" + encodeURIComponent(item[1]);
            });
            cookies.forEach(cookie =>
            {
                this.response.setHeader("Set-Cookie", cookie);
            });
            
            [...this.headers].forEach(item =>
            {
                this.response.setHeader(item[0], item[1]);
            });

            this.response.writeHead(this.code, this.status);
            if (this.data.length > 0)
            {
                this.response.write(this.data);
            }
            if (this.dataStream)
            {
                this.dataStream.on("error", err =>
                {
                    console.error("broken pipe: " + err);
                    this.response.end();
                });
                this.dataStream.pipe(this.response);
            }
            else
            {
                this.response.end();
            }
        }

        /**
         * Sets the response body.
         * 
         * @param {string} s - The response body.
         * @param {string} mimetype - The MIME type of the response body.
         * @returns {server.HTTPResponse} The response object for chaining multiple methods.
         */
        body(s, mimetype)
        {
            this.header("Content-Length", "" + Buffer.from(s).length);
            this.header("Content-Type", mimetype);
            this.data = s;
            return this;
        }

        /**
         * Pipes a stream for chunked transfer.
         * 
         * @param {ReadableStream} s - The stream.
         * @param {string} mimetype - The MIME type of the data.
         * @param {number} dataSize - The expected size of data in bytes, or -1 for unknown size.
         * @returns {server.HTTPResponse} The response object for chaining multiple methods.
         */
        stream(s, mimetype, dataSize)
        {
            this.header("Content-Type", mimetype);
            if (dataSize === -1)
            {
                this.header("Transfer-Encoding", "chunked");
            }
            else
            {
                this.header("Content-Length", "" + dataSize);
            }
            this.dataStream = s;
            this.dataSize = dataSize;
            return this;
        }

        /**
         * Sets a HTTP header.
         * 
         * @param {string} name - The header name.
         * @param {string} value - The header value.
         * @returns {server.HTTPResponse} The response object for chaining multiple methods.
         */
        header(name, value)
        {
            if (! this.headers.get(name))
            {
                this.headers.set(name, []);
            }
            this.headers.get(name).push(value);
            return this;
        }

        /**
         * Enables Cross-Origin-Isolation by setting the appropriate HTTP headers.
         * 
         * @returns {server.HTTPResponse} The response object for chaining multiple methods.
         */
        enableCrossOriginIsolation()
        {
            this.header("Access-Control-Allow-Origin", "*");
            this.header("Cross-Origin-Opener-Policy", "same-origin");
            this.header("Cross-Origin-Embedder-Policy", "require-corp");
            return this;
        }

        /**
         * Sets a HTTP cookie.
         * @param {string} name - The cookie name.
         * @param {string} value - The cookie value.
         * @returns {server.HTTPResponse} The response object for chaining multiple methods.
         */
        cookie(name, value)
        {
            this.cookies.set(name, value);
            return this;
        }
    }


    const d = new WeakMap();

    /**
     * Base class representing a HTTP session. Connect to the `request` event
     * in order to handle HTTP requests.
     * 
     * A session is identified by a session ID.
     * 
     * @example
     * HttpSession {
     *     onRequest: req =>
     *     {
     *         if (req.method === "FOO")
     *         {
     *             response(200, "OK")
     *             .body("You requested " + req.url)
     *             .send();
     *         }
     *         else
     *         {
     *             response(404, "Not Found")
     *             .send();
     *         }
     *     }
     * }
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {string} sessionId - [readonly] The ID that identifies this session. The ID is assigned by the {@link server.HTTPServer HTTP server}.
     * @property {string} user - [readonly] The user ID associated with this session.
     * @property {number} timeout - (default: `60000`) The session inactivity timeout in ms. The session closes automatically after this time of inactivity.
     * @property {function} urlMapper - (default: `url => url`) A function for mapping the request URL.
     */
    class HTTPSession extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                sessionId: "",
                request: null,
                response: null,
                user: null,
                timeout: 60000,
                timeoutHandler: null,
                urlMapper: url => url
            });

            this.notifyable("timeout");
            this.notifyable("urlMapper");
            this.notifyable("user");

            /**
             * Is triggered when a request comes in.
             * @event request
             * @memberof server.HTTPSession
             */
            this.registerEvent("request");

            /**
             * Is triggered when a response is ready to be sent.
             * @event responseReady
             * @memberof server.HTTPSession
             */
            this.registerEvent("responseReady");
        }

        get sessionId() { return d.get(this).sessionId; }
        set sessionId(id) { d.get(this).sessionId = id; }

        get user() { return d.get(this).user; }
        set user(u) { d.get(this).user = u; this.userChanged(); }

        get timeout() { return d.get(this).timeout; }
        set timeout(t)
        {
            d.get(this).timeout = t;
            this.timeoutChanged();
        }

        get urlMapper() { return d.get(this).urlMapper; }
        set urlMapper(f)
        {
            d.get(this).urlMapper = f;
            this.urlMapperChanged();
        }

        handleRequest(request, response, user)
        {
            const priv = d.get(this);

            priv.request = request;
            priv.response = response;
            //priv.user = user;

            this.request(makeRequestEvent(this, priv.urlMapper, request, response, user));

            if (priv.timeoutHandler)
            {
                clearTimeout(priv.timeoutHandler);
            }
            priv.timeoutHandler = setTimeout(() =>
            {
                this.close();
            }, priv.timeout);
        }

        /**
         * Creates and returns a response object.
         * 
         * @param {number} code - The HTTP status code.
         * @param {string} status - The HTTP status text.
         * @returns {server.HTTPResponse} The response object.
         */
        response(code, status)
        {
            this.log("HTTP",
                     "info",
                     (d.get(this).user ? d.get(this).user + "@" : "") +
                     d.get(this).sessionId + " - " +
                     d.get(this).request.method + " " +
                     d.get(this).request.unmappedUrl.path + ": " +
                     code + " " + status);
            const r = new HTTPResponse(d.get(this).response,
                                       code,
                                       status,
                                       this.safeCallback(res =>
            {
                this.responseReady(res);
            }));
            return r;
        }

        /**
         * Closes this session.
         */
        close()
        {
            this.log("HTTPSession", "info", "Session closed: " + d.get(this).sessionId);
            this.parent = null;
        }
    }
    exports.HTTPSession = HTTPSession;
});