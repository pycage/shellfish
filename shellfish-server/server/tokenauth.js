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

    const d = new WeakMap();

    /**
     * Class representing a token-based authentication method.
     * The authentication token is expected in the HTTP cookie `AuthToken`.
     * 
     * @extends core.Object
     * @memberof server
     */
    class TokenAuth extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                pending: new Map(),
                // map: auth token -> source address
                tokens: new Map()
            });
        }

        /* Generates and returns a new authentication token.
        */
        generateToken()
        {
            let token = "";
            do
            {
                token = Math.floor(Math.random() * 16777216).toString(16) + "-" +
                        Math.floor(Math.random() * 16777216).toString(16) + "-" +
                        Math.floor(Math.random() * 16777216).toString(16);
            }
            while (d.get(this).tokens.has(token));

            return token;
        }

        authorize(request)
        {
            const priv = d.get(this);

            const authToken = request.cookies.get("AuthToken");
            const sourceAddress = request.sourceAddress;

            return new Promise((resolve, reject) =>
            {
                const authData = priv.tokens.get(authToken);
                if (authData && authData.sourceAddress === sourceAddress)
                {
                    this.log("TokenAuth", "info", "Authorized user " + authData.user + " with token " + authToken);
                    resolve(authData.user);
                }
                else
                {
                    resolve(null);
                }
            });
        }

        requestAuthorization(response)
        {
            response.writeHead(401, { "Content-Type": "text/plain" });
            response.write("Not Authorized");
        }

        /**
         * Issues a new authentication token valid for the given user and
         * source address.
         * 
         * @param {string} user - The user name associated with the new token.
         * @param {string} sourceAddress - The source address for which the new token will be valid.
         * @returns {string} The new token.
         */
        issueTokenFor(user, sourceAddress)
        {
            const token = this.generateToken();
            d.get(this).tokens.set(token, { user, sourceAddress });
            return token;
        }

        /**
         * Revokes the given token. It will no longer be valid for authentication.
         * 
         * @param {string} token - The token to revoke.
         */
        revokeToken(token)
        {
            const priv = d.get(this);
            priv.tokens.delete(token);
        }

        /**
         * Awaits the authorization of a given code before a token will be issued
         * and returns a promise object for the token.
         * 
         * @param {string} code - The authorization code.
         * @param {string} user - The user name associated with the new token.
         * @param {string} sourceAddress - The source address for which the new token will be valid.
         * @returns {Promise<string>} A promise for the new token.
         */
        awaitToken(code, user, sourceAddress)
        {
            this.log("TokenAuth", "info", "Awaiting token for " + user + " from " + sourceAddress + " with code " + code);
            const priv = d.get(this);

            return new Promise((resolve, reject) =>
            {
                if (priv.pending.has(code))
                {
                    reject("Code Already in Use");
                    return;
                }

                priv.pending.set(code, (ok) =>
                {
                    if (ok)
                    {
                        const token = this.issueTokenFor(user, sourceAddress);
                        this.log("TokenAuth", "info", "Issued token " + token + " for code " + code);
                        priv.pending.delete(code);
                        resolve(token);
                    }
                    else
                    {
                        priv.pending.delete(code);
                        reject("Not Authorized");
                    }
                });

                setTimeout(() =>
                {
                    if (priv.pending.has(code))
                    {
                        this.log("TokenAuth", "info", "Code " + code + " expired");
                        const f = priv.pending.get(code);
                        f(false);
                    }
                }, 60000);
            });
        }

        /**
         * Authorizes the given waiting code.
         * 
         * @param {string} code - The code to authorize.
         */
        authorizeCode(code)
        {
            const priv = d.get(this);
            
            if (priv.pending.has(code))
            {
                const f = priv.pending.get(code);
                f(true);
            }
        }
    }
    exports.TokenAuth = TokenAuth;
});