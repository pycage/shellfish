/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js", __dirname + "/util/mime.js"], function (obj, mime)
{

    exports.normalizePath = function (path)
    {
        return path.replace(/\/\/+/g, "/").replace(/\/$/, "") || "/";
    }
    
    exports.pathJoin = function (...args)
    {
        return exports.normalizePath(args.join("/"));
    };

    exports.dirname = function (path)
    {
        const pos = path.lastIndexOf("/");
        if (pos !== -1)
        {
            return exports.normalizePath(path.substring(0, pos));
        }
        else
        {
            return "/";
        }
    }

    function parseNode(node)
    {
        const item = {
            path: "",
            dir: "",
            name: "",
            type: "f",
            size: 0,
            mimetype: "application/x-octet-stream"
        }

        const href = node.getElementsByTagNameNS("DAV:", "href")[0];
        if (href)
        {
            item.path = href.textContent;
            item.dir = exports.dirname(href.textContent);
        }
        
        const prop = node.getElementsByTagNameNS("DAV:", "prop")[0];
        if (prop)
        {
            const displayname = prop.getElementsByTagNameNS("DAV:", "displayname")[0];
            if (displayname)
            {
                item.name = displayname.textContent;
            }
            const contentlength = prop.getElementsByTagNameNS("DAV:", "getcontentlength")[0];
            if (contentlength)
            {
                item.size = Number.parseInt(contentlength.textContent);
            }
            const contenttype = prop.getElementsByTagNameNS("DAV:", "getcontenttype")[0];
            if (contenttype)
            {
                item.mimetype = contenttype.textContent;
            }
            const resourcetype = prop.getElementsByTagNameNS("DAV:", "resourcetype")[0];
            if (resourcetype && resourcetype.children[0])
            {
                if (resourcetype.children[0].tagName === "collection")
                {
                    item.mimetype = "application/x-folder";
                    item.type = "d";
                }
            }
        }

        return item;
    }


    let d = new WeakMap();

    /**
     * Class representing a remote WebDAV filesystem.
     * 
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {string} root - (default: `""`) The WebDAV root URL.
     */
    class DavFS extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                root: ""
            });
            
            this.notifyable("root");

            /**
             * Is triggered when something on the filesystem changed.
             * @event fsChange
             * @memberof mid.DavFS
             */
            this.registerEvent("fsChange");
        }

        get root() { return d.get(this).root; }
        set root(v)
        {
            d.get(this).root = v;
            this.rootChanged();
        }

        /**
         * Checks if the given path exists and returns a boolean Promise object.
         * 
         * @param {string} path - The path to check for.
         * @returns {Promise} The boolean Promise object.
         */
        exists(path)
        {
            const priv = d.get(this);
            
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const url = priv.root + path;
                const response = await fetch(url, { method: "HEAD" });
                resolve(response.ok);
            });
        }

        /**
         * Lists the files at the given path and returns a Promise object with the file items.
         * 
         * @param {string} path - The path to list.
         * @returns {Promise} The Promise object.
         */
        list(path)
        {
            const priv = d.get(this);
            
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const url = priv.root + path;
                const response = await fetch(url, { method: "PROPFIND" });
                if (response.status === 207 /* Multi-Status */)
                {
                    const data = await response.text();

                    const parser = new DOMParser();
                    const dom = parser.parseFromString(data, "text/xml");

                    const items = [];
                    const nodes = dom.getElementsByTagNameNS("DAV:", "response");
                    for (let i = 0; i < nodes.length; ++i)
                    {
                        const node = nodes[i];
                        const item = parseNode(node);
                        items.push(item);
                    }

                    resolve(items);
                }
                else
                {
                    reject();
                }
            });
        }

        /**
         * Creates a new directory at the given path.
         * 
         * @param {string} path - The path where to create a new directory.
         * @param {string} name - The name of the new directory.
         * @returns {Promise} The Promise object.
         */
        mkdir(path, name)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const url = priv.root + path;
                console.log("mkdir: " + path);

                const response = await fetch(url, { method: "MKCOL" });
                if (response.status === 201 /* Created */)
                {
                    resolve();
                }
                else
                {
                    reject();
                }
            });
        }

        /**
         * Removes the given path.
         * 
         * @param {string} path - The path to remove.
         * @returns {Promise} The Promise object.
         */
        remove(path)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const url = priv.root + path;

                const response = await fetch(url, { method: "DEL" });
                if (response.status === 204 /* No Content */)
                {
                    resolve();
                }
                else
                {
                    reject();
                }    
            });
        }
    
        /**
         * Reads the file at the given path and returns a Promise object with the
         * Blob.
         * 
         * @param {string} path - The path of the file to read.
         * @returns {Promise} - The Promise object with the file's contents as Blob.
         */
        read(path)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const url = priv.root + path;

                const response = await fetch(url, { method: "GET" });
                if (response.ok)
                {
                    resolve(await response.blob());
                }
                else
                {
                    reject();
                }
            });
        }
    
        /**
         * Writes the given Blob to the given path.
         * 
         * @param {string} path - The path of the file to write.
         * @param {Blob} blob - The Blob of data to write.
         * @returns {Promise} The Promise object.
         */
        write(path, blob)
        {
            const priv = d.get(this);

            return new Promise(async (resolve, reject) =>
            {
                if (! blob instanceof Blob)
                {
                    console.error("Write error: Blob expected.");
                    reject(null);
                    return;
                }
        
                path = exports.normalizePath(path);
                const url = priv.root + path;

                console.log("PUT " + url);
                const response = await fetch(url, { method: "PUT", body: blob });
                if (response.ok)
                {
                    resolve();
                }
                else
                {
                    reject();
                }
            });
        }
    }
    exports.DavFS = DavFS;
});
