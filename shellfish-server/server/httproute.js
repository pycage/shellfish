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
    const d = new WeakMap();

    /**
     * Class representing a HTTP route.
     * 
     * Routes may be used to implement virtual servers, or just for handling
     * different URLs with different backends.
     * 
     * The function of the `when` property decides if a request is to be handled
     * by a HTTP route.
     * 
     * ### Example
     * 
     * Implement virtual servers by evaluating the HTTP Host header.
     * 
     *     HTTPRoute {
     *         when: req.headers.get("Host") === "virtualhost1.com"
     *     }
     * 
     * The `delegate` property holds a {@link server.HTTPSession} element as
     * a template from which sessions handlers are created dynamically.
     * A session is identified by the result of the `generateSessionId` function,
     * and the same session will reuse the same session handler for further
     * requests.
     * 
     * ### Example
     * 
     * Identify sessions by cookie.
     * 
     *     HTTPRoute {
     *         generateSessionId: req => req.cookies.get("Session-Cookie") || ""
     *     }
     * 
     * If the `authentication` property is set to an authentication method, only
     * authenticated requests will be accepted.
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {server.HTTPAuth} authentication - (default: `null`) The authentication method, or `null`.
     * @property {server.HTTPSession} delegate - (default: `null`) The session delegate.
     * @property {function} generateSessionId - A function for generating a session ID out of a request.
     * @property {string} prefix - (default: `"/"`) Deprecated: Use the `when` property instead. The path prefix for which this route is to be used.
     * @property {function} when - (default: `request => true`) A function for testing whether a request is to be handled by a request.
     */
    class HTTPRoute extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                authentication: null,
                delegate: null,
                connecting: false,
                sessions: new Map(),
                when: request => true,
                prefix: "/",
                generateSessionId: request =>
                {
                    return request.sourceAddress + ":" + request.sourcePort;
                }
            });

            this.notifyable("authentication");
            this.notifyable("prefix");
        }

        get authentication() { return d.get(this).authentication; }
        set authentication(a)
        {
            d.get(this).authentication = a;
            this.authenticationChanged();
        }

        get prefix() { return d.get(this).prefix; }
        set prefix(p)
        {
            d.get(this).prefix = p;
            this.prefixChanged();
        }

        get generateSessionId() {return d.get(this).generateSessionId; }
        set generateSessionId(f) { d.get(this).generateSessionId = f; }

        get when() { return d.get(this).when; }
        set when(w) { d.get(this).when = w; }

        get delegate() { return d.get(this).delegate; }
        set delegate(del) { d.get(this).delegate = del; }

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
                    priv.sessions.delete(id);
                };
                priv.sessions.set(id, session);
                return session;
            }
        }

        handleRequest(request, response)
        {
            const priv = d.get(this);

            if (! priv.delegate)
            {
                console.error("HTTP route at " + this.objectLocation + " has no delegate.");
                return;
            }

            let user = "";
            if (priv.authentication)
            {
                priv.authentication.authorize(request)
                .then(user =>
                {
                    if (user === null)
                    {
                        this.log("HTTP", "info", "Requesting Authorization for " +
                                 request.sourceAddress + ":" + request.sourcePort +
                                 " - " + request.method + " " + request.url.path);
    
                        priv.authentication.requestAuthorization(response);
                        
                        // delay the response to discourage brute force attempts
                        setTimeout(() => { response.end(); }, 3000);
                    }
                    else
                    {
                        const sessionId = priv.generateSessionId(request);
                        const session = this.getSession(sessionId);
                        session.user = user;
                        session.handleRequest(request, response, user);
                    }
                });
            }
            else
            {
                const sessionId = priv.generateSessionId(request);
                const session = this.getSession(sessionId);
                session.user = user;
                session.handleRequest(request, response, user);
            }

        }

    }
    exports.HTTPRoute = HTTPRoute;
});
