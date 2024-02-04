/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/core"], function (core)
{
    function parseNode(fs, node)
    {
        const item = {
            path: "",
            dir: "",
            name: "",
            type: "f",
            size: 0,
            mimetype: "application/x-octet-stream",
            ctime: 0,
            mtime: 0
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
                if (resourcetype.children[0].localName === "collection")
                {
                    item.mimetype = "application/x-folder";
                    item.type = "d";
                }
            }
            const creationDate = prop.getElementsByTagNameNS("DAV:", "creationdate")[0];
            if (creationDate)
            {
                item.ctime = Math.floor(new Date(creationDate.textContent).getTime() / 1000);
            }
            const lastModified = prop.getElementsByTagNameNS("DAV:", "getlastmodified")[0];
            if (lastModified)
            {
                item.mtime = Math.floor(new Date(lastModified.textContent).getTime() / 1000);
            }
        }

        return item;
    }


    let d = new WeakMap();

    /**
     * Class representing a remote WebDAV filesystem.
     * 
     * @extends core.Filesystem
     * @memberof html
     * 
     * @property {bool} cache - (default: `false`) If `true`, list results are cached. Use the method {@link html.DavFS#clearCache} to clear the cache.
     * @property {low.FetchManager} fetchManager - (default: `null`) The fetch manager instance to use.
     * @property {string} root - (default: `""`) The WebDAV root URL.
     */
    class DavFS extends core.Filesystem
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

        encodeName(name)
        {
            return encodeURIComponent(name);
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
            path = this.normalizePath(path);
            const url = priv.root + path;
            const dir = this.dirname(url);

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
                path = this.normalizePath(path);
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
                        const item = parseNode(this, node);
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

        search(path, query)
        {
            const f = async (path, depth) =>
            {
                let result = [];
                let files = [];

                try
                {
                    files = await this.list(path);
                }
                catch (err)
                {

                }
                for (let i = 0; i < files.length; ++i)
                {
                    const file = files[i];
                    if (file.type === "d")
                    {
                        if (depth < 0)
                        {
                            result = result.concat(await f(file.path, depth + 1));
                        }
                    }
                    else if (file.name.toLowerCase().indexOf(query.toLowerCase()) !== -1)
                    {
                        result.push(file);
                    }
                }
                return result;
            };

            return f(path, 0);
        }

        mkdir(path, name)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                const dirPath = this.normalizePath(this.pathJoin(path, name));
                const url = priv.root + dirPath;

                const response = await doFetch(url, { method: "MKCOL" });
                if (response.status === 201 /* Created */)
                {
                    priv.cache.delete(path);
                    resolve();
                    this.fsChange(path);
                }
                else
                {
                    reject();
                }
            });
        }

        move(sourcePath, destPath)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                sourcePath = this.normalizePath(sourcePath);
                destPath = this.normalizePath(destPath);
                const url = priv.root + sourcePath;
                const destUrl = priv.root + destPath

                const headers = new Headers();
                headers.append("Destination", destUrl);

                const response = await doFetch(url, { method: "MOVE", headers });
                if (response.status === 201 /* Moved */)
                {
                    priv.cache.delete(sourcePath);
                    priv.cache.delete(this.dirname(sourcePath));
                    priv.cache.delete(this.dirname(destPath));
                    resolve();
                    this.fsChange(sourcePath);
                    this.fsChange(destPath);
                    this.fsChange(this.dirname(sourcePath));
                    this.fsChange(this.dirname(destPath));
                }
                else
                {
                    reject("Failed to move: " +
                           response.status + " " + response.statusText);
                }    
            });
        }

        copy(sourcePath, destPath)
        {
            const priv = d.get(this);
            const doFetch = priv.fetchManager ? (...args) => priv.fetchManager.fetch(...args)
                                              : fetch;

            return new Promise(async (resolve, reject) =>
            {
                sourcePath = this.normalizePath(sourcePath);
                destPath = this.normalizePath(destPath);
                const url = priv.root + sourcePath;
                const destUrl = priv.root + destPath

                const headers = new Headers();
                headers.append("Destination", destUrl);

                const response = await doFetch(url, { method: "COPY", headers });
                if (response.status === 201 /* Copied */)
                {
                    priv.cache.delete(this.dirname(destPath));
                    resolve();
                    this.fsChange(destPath);
                    this.fsChange(this.dirname(destPath));
                }
                else
                {
                    reject("Failed to copy: " +
                           response.status + " " + response.statusText);
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
                path = this.normalizePath(path);
                const url = priv.root + path;

                const response = await doFetch(url, { method: "DELETE" });
                if (response.status === 204 /* No Content */)
                {
                    priv.cache.delete(path);
                    priv.cache.delete(this.dirname(path));
                    resolve();
                    this.fsChange(path);
                    this.fsChange(this.dirname(path));
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
                path = this.normalizePath(path);
                const url = priv.root + path;

                const response = await doFetch(url, { method: "GET" });
                if (response.ok)
                {
                    resolve(new core.FileData(await response.blob()));
                }
                else
                {
                    reject();
                }
            });
        }
    
        write(path, fileData, progressCallback)
        {
            const priv = d.get(this);

            function uploadWithProgress(url, fileData, progressCallback)
            {
                // create a monitoring XHR
                const xhr = new XMLHttpRequest();

                const promise = new Promise((resolve, reject) =>
                {
                    xhr.upload.addEventListener("progress", status =>
                    {
                        if (status.lengthComputable && status.total > 0)
                        {
                            const p = status.loaded / status.total;
                            progressCallback(p, {
                                amount: status.loaded,
                                total: status.total
                            });
                        }
                    });
                    xhr.addEventListener("loadend", () =>
                    {
                        progressCallback(1.0);
                        resolve(xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 300);
                    });
                    xhr.addEventListener("abort", () =>
                    {
                        resolve(false);
                    });
                    xhr.addEventListener("error", () =>
                    {
                        resolve(false);
                    });
                });

                xhr.open("PUT", url, true);
                xhr.setRequestHeader("Content-Type", "application/octet-stream");
                progressCallback(0.0);
                xhr.send(fileData.blob());

                return promise;
            }

            return new Promise(async (resolve, reject) =>
            {
                if (! fileData instanceof core.FileData)
                {
                    console.error("Write error: FileData expected.");
                    reject(null);
                    return;
                }

                if (! progressCallback)
                {
                    progressCallback = (p) => { };
                }

                path = this.normalizePath(path);
                const url = priv.root + path;

                const ok = await uploadWithProgress(url, fileData, progressCallback);
                if (ok)
                {
                    priv.cache.delete(this.dirname(path));
                    resolve();
                    this.fsChange(path);
                    this.fsChange(this.dirname(path));
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
