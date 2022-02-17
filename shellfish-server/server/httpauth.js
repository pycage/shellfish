/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
    const modCrypto = require("crypto");

    function md5(data)
    {
        return modCrypto.createHash("md5").update(data).digest("hex");
    }

    function parseDigestParameters(s)
    {
        const result = { };
    
        const parts = s.split(",");
        parts.forEach(part =>
        {
            const pos = part.indexOf("=");
            if (pos !== -1)
            {
                const key = part.substr(0, pos).trim();
                let value = part.substr(pos + 1).trim();
                if (value.startsWith("\"") && value.endsWith("\""))
                {
                    value = value.substr(1, value.length - 2);
                }
                result[key] = value;
            }
        });
        return result;
    }

    function basicAuth(authHeader, realm, users)
    {
        if (authHeader.indexOf("Basic ") !== 0)
        {
            return null;
        }

        const parts = authHeader.split(" ");
        const token = Buffer.from(parts[1], "base64").toString("utf8");
        const tokenParts = token.split(":");
        if (tokenParts.length !== 2)
        {
            return null;
        }

        const userName = tokenParts[0];
        const password = tokenParts[1];
        const passwordHash = md5(userName + ":" + realm + ":" + password);

        if (users[userName] !== undefined &&
            (users[userName] === "" || users[userName] === passwordHash))
        {
            return userName;
        }
        else
        {
            console.log("[" + new Date().toLocaleString() + "] [HttpBasicAuth] " +
                        "DENY user = " + userName);
            return null;
        }
    }

    function digestAuth(authHeader, httpMethod, users)
    {
        if (authHeader.indexOf("Digest ") != 0)
        {
            return null;
        }

        const params = parseDigestParameters(authHeader.replace(/^Digest /, ""));

        if (! users[params.username])
        {
            // unknown user
            console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                        "DENY user = " + params.username);
            return null;
        }

        const ha1 = users[params.username];
        const ha2 = md5(httpMethod + ":" + params.uri);
        const expected = md5([ha1, params.nonce, params.nc, params.cnonce, params.qop, ha2].join(":"));

        if (params.response !== expected)
        {
            // invalid client response
            console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                        "DENY user = " + params.username);
            return null;
        }

        // passed
        return params.username;
    }


    const d = new WeakMap();

    /**
     * Class representing a HTTP authentication method.
     * 
     * @extends core.Object
     * @memberof server
     * 
     * @property {function} filter - [default: `(method, url) => false`] A filter function to allow unauthorized access to certain resources.
     * @property {string} mode - [default: `"basic"`] The HTTP authentication mode. One of `basic|digest`
     * @property {string} realm - [default: `""`] The name of the authentication realm.
     * @property {object} users - [default: `{ }`] The map of users and password hashes.
     */
    class HTTPAuth extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                mode: "basic",
                realm: "",
                users: { },
                filter: (method, url) => { return false; }
            });

            this.notifyable("filter");
            this.notifyable("mode");
            this.notifyable("realm");
            this.notifyable("users");
        }

        get filter() { return d.get(this).filter; }
        set filter(f)
        {
            d.get(this).filter = f;
            this.filterChanged();
        }

        get mode() { return d.get(this).mode; }
        set mode(m)
        {
            d.get(this).mode = m;
            this.modeChanged();
        }

        get realm() { return d.get(this).realm; }
        set realm(r)
        {
            d.get(this).realm = r;
            this.realmChanged();
        }

        get users() { return d.get(this).users; }
        set users(u)
        {
            d.get(this).users = u;
            this.usersChanged();
        }

        /**
         * Creates a password hash for the given user, realm, and password for
         * use in the `users` table.
         * 
         * @param {string} user - The user name.
         * @param {string} realm - The name of the authentication realm.
         * @param {string} password - The password.
         * @returns {string} The password hash.
         */
        passwordHash(user, realm, password)
        {
            return md5(`${user}:${realm}:${password}`);
        }
        
        authorize(request)
        {
            const priv = d.get(this);
   
            const authHeader = request.headers["authorization"];
            if (authHeader === undefined)
            {
                return null;
            }
            else if (priv.mode === "basic")
            {
                return basicAuth(authHeader, priv.realm, priv.users);
            }
            else if (priv.mode === "digest")
            {
                return digestAuth(authHeader, request.method, priv.users);
            }
            else
            {
                throw(`Invalid authentication mode: '${priv.mode}'`);
            }
        }
    
        requestAuthorization(response)
        {
            const priv = d.get(this);
    
            if (priv.mode === "basic")
            {
                console.log("[" + new Date().toLocaleString() + "] [HttpBasicAuth] " +
                            "AUTH REQUEST");
    
                response.writeHead(401,
                                   {
                                       "WWW-Authenticate": "Basic realm=\"" + priv.realm + "\""
                                   });
            }
            else if (priv.mode === "digest")
            {
                console.log("[" + new Date().toLocaleString() + "] [HttpDigestAuth] " +
                            "AUTH REQUEST");
                const nonce = Math.random();
                const opaque = md5(priv.realm);
                response.writeHead(401,
                                   {
                                       "WWW-Authenticate": "Digest realm=\"" + priv.realm + "\", " +
                                                           "qop=\"auth\", " +
                                                           "nonce=\"" + nonce + "\", " +
                                                           "opaque=\"" + opaque + "\""
                                   });
            }
        }
    }
    exports.HTTPAuth = HTTPAuth;

});
