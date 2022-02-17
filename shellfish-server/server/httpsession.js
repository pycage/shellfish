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
    /* Reads the HTTP request body.
    */
    function readRequest(request)
    {
        return new Promise((resolve, reject) =>
        {
            const chunks = [];
            
            request.on("data", chunk =>
            {
                chunks.push(chunk);
            });
    
            request.on("end", () =>
            {
                resolve(Buffer.concat(chunks).toString("binary"));
            });
        });
    }

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

    function makeRequestEvent(request, user)
    {
        const cookies = new Map();
        if (request.headers.cookie)
        {
            const cookieString = request.headers.cookie;
            cookieString.split(":").forEach(part =>
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

        return {
            original: request,
            accepted: false,
            cookies: cookies,
            headers: headers,
            method: request.method,
            range: headers.has("range") ? parseRange(headers.get("range")) : [],
            body: () => { return readRequest(request); },
            url: request.url,
            user: user
        };
    }

    /**
     * Class representing a HTTP response.
     * 
     * The setter methods of this class return the class instance itself, so
     * method calls may be chained.
     * 
     * @example
     * response(200, "OK")
     * .cookie("MyCookie", "42")
     * .body("<html><body><h1>Hello World</h1></body></html", "text/html")
     * .send();
     */
    class HTTPResponse
    {
        constructor(response, code, status)
        {
            this.code = code;
            this.status = status;
            this.response = response;
            this.cookies = new Map();
            this.headers = new Map();
            this.data = "";
            this.dataStream = null;
            this.dataSize = -1;
        }
        
        send()
        {
            const cookies = [...this.cookies].map(item =>
            {
                return item[0] + "=" + encodeURIComponent(item[1]);
            });
            this.response.setHeader("Set-Cookie", cookies);
            
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
                this.dataStream.pipe(this.response);
            }
            else
            {
                this.response.end();
            }
        }

        body(s, mimetype)
        {
            this.header("Content-Length", "" + s.length);
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
         * @returns 
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

        header(name, value)
        {
            if (! this.headers.get(name))
            {
                this.headers.set(name, []);
            }
            this.headers.get(name).push(value);
            return this;
        }

        cookie(name, value)
        {
            this.cookies.set(name, value);
            return this;
        }
    }


    const d = new WeakMap();

    /**
     * Class representing a HTTP session.
     * 
     * A session is identified by a session ID.
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {string} sessionId - [readonly] The ID that identifies this session. The ID is assigned by the {@link server.HTTPServer HTTP server}.
     * @property {number} timeout - (default: `60000`) The session inactivity timeout in ms. The session closes automatically after this time of inactivity.
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
                timeout: 60000,
                timeoutHandler: null
            });

            this.notifyable("timeout");

            /**
             * Is triggered when a request comes in.
             * @event request
             * @memberof server.HTTPSession
             */
            this.registerEvent("request");
        }

        get sessionId() { return d.get(this).sessionId; }
        set sessionId(id) { d.get(this).sessionId = id; }

        get timeout() { return d.get(this).timeout; }
        set timeout(t)
        {
            d.get(this).timeout = t;
            this.timeoutChanged();
        }

        handleRequest(request, response, user)
        {
            const priv = d.get(this);

            priv.request = request;
            priv.response = response;

            this.request(makeRequestEvent(request, user));

            if (priv.timeoutHandler)
            {
                clearTimeout(priv.timeoutHandler);
            }
            priv.timeoutHandler = setTimeout(() =>
            {
                console.log("Session Timeout " + priv.timeout);
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
            const r = new HTTPResponse(d.get(this).response,
                                       code,
                                       status);
            return r;
        }

        /**
         * Closes this session.
         */
        close()
        {
            this.parent = null;
        }
    }
    exports.HTTPSession = HTTPSession;
});