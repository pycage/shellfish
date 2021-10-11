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

shRequire([__dirname + "/filesystem.js"], function (fs)
{
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
            item.dir = fs.dirname(href.textContent);
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
     * @extends mid.Filesystem
     * @memberof mid
     * 
     * @property {bool} cache - (default: `false`) If `true`, list results are cached. Use the method {@link mid.DavFS#clearCache} to clear the cache.
     * @property {low.FetchManager} fetchManager - (default: `null`) The fetch manager instance to use.
     * @property {string} root - (default: `""`) The WebDAV root URL.
     */
    class DavFS extends fs.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                root: "",
                fetchManager: null,
                useCache: false,
                cache: new Map()    
            });
            
            this.notifyable("cache");
            this.notifyable("root");
        }

        get root() { return d.get(this).root; }
        set root(v)
        {
            d.get(this).root = v;
            this.rootChanged();
        }

        get fetchManager() { return d.get(this).fetchManager; }
        set fetchManager(f)
        {
            d.get(this).fetchManager = f;
        }

        get cache() { return d.get(this).useCache; }
        set cache(v)
        {
            d.get(this).useCache = v;
            if (! v)
            {
                this.clearCache();
            }
            this.cacheChanged();
        }

        /**
         * Clears the list cache.
         */
        clearCache()
        {
            d.get(this).cache.clear();
        }

        exists(path)
        {
            const priv = d.get(this);
            path = fs.normalizePath(path);
            const url = priv.root + path;
            const dir = fs.dirname(url);

            return new Promise(async (resolve, reject) =>
            {
                let list = [];
                try
                {
                    list = await this.list(dir);
                }
                catch (err)
                {
                    reject(err);
                    return;
                }
                const idx = list.findIndex(a => a.path === path);
                resolve(idx !== -1);
            });
        }

        list(path)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;
            
            return new Promise(async (resolve, reject) =>
            {
                path = fs.normalizePath(path);
                const url = priv.root + path;

                if (priv.cache.has(path))
                {
                    resolve(priv.cache.get(path));
                    return;
                }

                let response = null;
                try
                {
                    response = await doFetch(url, { method: "PROPFIND" });
                }
                catch (err)
                {
                    reject(err);
                    return;
                }

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

                    if (priv.useCache)
                    {
                        priv.cache.set(path, items);
                    }
                    resolve(items);
                }
                else
                {
                    reject();
                }
            });
        }

        mkdir(path, name)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                path = fs.normalizePath(path);
                const url = priv.root + path;
                console.log("mkdir: " + path);

                const response = await doFetch(url, { method: "MKCOL" });
                if (response.status === 201 /* Created */)
                {
                    priv.cache.delete(path);
                    resolve();
                }
                else
                {
                    reject();
                }
            });
        }

        remove(path)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                path = fs.normalizePath(path);
                const url = priv.root + path;

                const response = await doFetch(url, { method: "DELETE" });
                if (response.status === 204 /* No Content */)
                {
                    priv.cache.delete(path);
                    priv.cache.delete(fs.dirname(path));
                    resolve();
                }
                else
                {
                    reject();
                }    
            });
        }
    
        read(path)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                path = fs.normalizePath(path);
                const url = priv.root + path;

                const response = await doFetch(url, { method: "GET" });
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
    
        write(path, blob)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                if (! blob instanceof Blob)
                {
                    console.error("Write error: Blob expected.");
                    reject(null);
                    return;
                }
        
                path = fs.normalizePath(path);
                const url = priv.root + path;

                console.log("PUT " + url);
                const response = await doFetch(url, { method: "PUT", body: blob });
                if (response.ok)
                {
                    priv.cache.delete(fs.dirname(path));
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
