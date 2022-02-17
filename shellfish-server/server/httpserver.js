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
     * @extends core.Object
     * @memberof server
     * 
     * @property {server.HTTPAuth} authentication - (default: `null`) The authentication method, or `null`.
     * @property {function} generateSessionId - A function for generating a session ID out of a request.
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
                authentication: null,
                host: "0.0.0.0",
                port: 8000,
                delegate: () => null,
                requests: new Map(),
                server: null,
                keepAlive: 5000,
                connecting: false,
                sessions: new Map(),
                generateSessionId: request =>
                {
                    return request.connection.remoteAddress + ":" + request.connection.remotePort;
                }
            });

            this.notifyable("authentication");
            this.notifyable("host");
            this.notifyable("keepAlive");
            this.notifyable("port");
        }

        get authentication() { return d.get(this).authentication; }
        set authentication(a)
        {
            d.get(this).authentication = a;
            this.authenticationChanged();
            this.listen();
        }

        get host() { return d.get(this).host; }
        set host(h)
        {
            d.get(this).host = h;
            this.hostChanged();
            this.listen();
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
            this.listen();
        }

        get generateSessionId() {return d.get(this).generateSessionId; }
        set generateSessionId(f)
        {
            d.get(this).generateSessionId = f;
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
        }

        /**
         * Returns the {@link server.HTTPSession} for the given ID. Creates a
         * new session, if necessary.
         * 
         * @param {string} id - The session ID. 
         * @returns {server.HTTPSession} The session.
         */
        getSession(id)
        {
            const priv = d.get(this);

            if (priv.sessions.has(id))
            {
                return priv.sessions.get(id);
            }
            else
            {
                const session = priv.delegate();
                session.parent = this;
                session.sessionId = id;
                session.onDestruction = () =>
                {
                    console.log("Session Closed: " + id);
                    priv.sessions.delete(id);
                };
                priv.sessions.set(id, session);
                return session;
            }
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

            if (! priv.delegate)
            {
                return;
            }

            if (priv.server)
            {
                priv.server.close();
            }

            priv.server = modHttp.createServer();
            priv.server.keepAliveTimeout = priv.keepAlive;
            priv.server.on("request", (request, response) =>
            {
                console.log(request.method + " " + request.url);

                let user = "";
                if (priv.authentication)
                {
                    user = priv.authentication.authorize(request);
                    if (user === null)
                    {
                        if (! priv.authentication.filter(request.method, request.url))
                        {
                            priv.authentication.requestAuthorization(response);
                            response.end();
                            return;
                        }
                        else
                        {
                            user = "";
                        }
                    }
                }
                
                console.log("User: " + JSON.stringify(user));
                console.log(request.socket == response.socket);
                console.log(response.socket.shfRequest);

                const sessionId = priv.generateSessionId(request);
                console.log("Session ID: " + sessionId);
                const session = this.getSession(sessionId);
                session.handleRequest(request, response, user);
            });
            priv.server.listen(priv.port, priv.host);
        }
    }
    exports.HTTPServer = HTTPServer;
});