/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

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
    const VERSION = 1;
    
    const indexedDB = window.indexedDB ||
                      window.mozIndexedDB ||
                      window.webkitIndexedDB ||
                      window.msIndexedDB;

    function upgradeDatabase(db)
    {
        const tocStore = db.createObjectStore("toc", { keyPath: "path" });
        tocStore.createIndex("name", "name", { unique: false });
        tocStore.createIndex("dir", "dir", { unique: false });
    
        const resStore = db.createObjectStore("res");
    }

    function recursiveList(tx, paths, resultSet, callback)
    {
        if (paths.length === 0)
        {
            callback(resultSet);
            return;
        }
    
        const path = paths.pop();
    
        tx
        .objectStore("toc")
        .openCursor(IDBKeyRange.only(path))
        .onsuccess = (ev) =>
        {
            const csr = ev.target.result;
            if (csr)
            {
                resultSet.push(csr.value);
                if (csr.value.type === "d")
                {
                    paths.push(csr.value.path);
                }
                csr.continue();
            }
            else
            {
                //finished
                recursiveList(tx, paths, resultSet, callback);
            }
        };
    }
    
    function removeFromRes(tx, paths)
    {
        paths.forEach((path) =>
        {
            tx
            .objectStore("res")
            .delete(path);
        });
    }
    
    function removeFromToc(tx, paths)
    {
        paths.forEach((path) =>
        {
            tx
            .objectStore("toc")
            .delete(path);
        });
    }

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



    let d = new WeakMap();

    /**
     * Class representing a virtual offline filesystem drive on top of the
     * HTML5 Indexed DB.
     * 
     * @extends mid.Object
     * @memberof mid
     */
    exports.OfflineFS = class OfflineFS extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                volume: ""
            });
            
            this.notifyable("volume");

            this.registerEvent("fsChange");
        }

        get volume() { return d.get(this).volume; }
        set volume(v)
        {
            d.get(this).volume = v;
            this.volumeChanged();
        }

        open()
        {
            return new Promise((resolve, reject) =>
            {
                const req = indexedDB.open(d.get(this).volume, VERSION);
                req.onupgradeneeded = (ev) =>
                {
                    upgradeDatabase(ev.target.result);
                };
                req.onsuccess = (ev) =>
                {
                    const db = ev.target.result;
                    db.onerror = (ev) =>
                    {
                        console.error("DB Error: " + ev.target.error.message);
                    };
                    resolve(db);
                };
                req.onerror = (ev) =>
                {
                    // IndexedDB is not available (privacy-settings, etc.)
                    console.error("Failed to open IndexedDB: " + ev.target.errorCode);
                    reject(ev);
                };
            });
        }

        exists(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);

                const db = await this.open();
                const tx = db.transaction(["toc"], "readonly");
                tx.oncomplete = (ev) =>
                {
    
                };
                tx.onabort = (ev) =>
                {
                    console.error("exists: Transaction aborted: " + ev.target.error.message);
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    resolve(false);
                };
    
                tx
                .objectStore("toc")
                .get(path)
                .onsuccess = (ev) =>
                {
                    resolve(!! ev.target.result);
                };    
            });
        }

        list(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
        
                const db = await this.open();
                const items = [];
                
                const tx = db.transaction(["toc"], "readonly");
                tx.oncomplete = (ev) =>
                {
                    //console.log("Listing directory '" + path + "' complete: " + JSON.stringify(items));
                    resolve(items);
                };
                tx.onabort = (ev) =>
                {
                    console.error("Aborted listing directory: " + ev.target.error.message);
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    console.error("Error listing directory: " + ev.target.error.message);
                    reject(ev);
                };
    
                tx
                .objectStore("toc")
                .index("dir")
                .openCursor(IDBKeyRange.only(path))
                .onsuccess = (ev) =>
                {
                    const csr = ev.target.result;
                    if (csr)
                    {
                        //console.log("found item " + JSON.stringify(csr.value));
                        items.push(csr.value);
                        csr.continue();
                    }
                };
            });
        }

        mkdir(path, name)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                console.log("mkdir: " + path);
                const db = await this.open();
                const tx = db.transaction(["toc"], "readwrite");
    
                tx.oncomplete = (ev) =>
                {
                    console.log("mkdir: Created directory.");
                    resolve();
                    this.fsChange(path);
                };
                tx.onabort = (ev) =>
                {
                    console.error("mkdir: Transaction aborted.");
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    console.error("mkdir: Failed to create directory: " +
                                  ev.target.error.message);
                    reject(ev);
                };
    
                const dirPath = exports.pathJoin(path, name);
    
                tx.objectStore("toc")
                .add({
                    path: dirPath,
                    dir: path,
                    name: name,
                    type: "d",
                    size: 0,
                    res: 0,
                    mimetype: "application/x-folder"
                });
    
            });
        }

        remove(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readwrite");
                tx.oncomplete = (ev) =>
                {
                    resolve();
                    this.fsChange(path);
                    this.fsChange(exports.dirname(path));
                };
                tx.onabort = (ev) =>
                {
                    console.error("remove: Transaction aborted.");
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    console.error("remove: Failed to create directory: " +
                                    ev.target.error.message);
                    reject(ev);
                };
    
                // collect paths, remove ressources, remove from toc
                recursiveList(tx, [path], [], (resultSet) =>
                {
                    const paths = resultSet.map(r => r.path);
                    removeFromRes(tx, paths);
                    removeFromToc(tx, paths);
                });
    
            });
        }
    
        read(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = exports.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readonly");
                tx.oncomplete = (ev) =>
                {
    
                };
                tx.onabort = (ev) =>
                {
                    console.error("read: Transaction aborted: " + ev.target.error.message);
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    console.error("read: Failed to read file: " +
                                    ev.target.error.message);
                    reject(ev);
                };
    
                tx
                .objectStore("res")
                .get(path)
                .onsuccess = (ev) =>
                {
                    const blob = ev.target.result;
                    if (blob)
                    {
                        resolve(blob);
                    }
                    else
                    {
                        reject(blob);
                    }
                };
            });
        }
    
        write(path, blob)
        {
            return new Promise(async (resolve, reject) =>
            {
                if (! blob instanceof Blob)
                {
                    console.error("Write error: Blob expected.");
                    reject(null);
                    return;
                }
        
                path = exports.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readwrite");
                tx.oncomplete = (ev) =>
                {
                    resolve();
                    this.fsChange(path);
                    this.fsChange(exports.dirname(path));
                };
                tx.onabort = (ev) =>
                {
                    console.error("write: Transaction aborted.");
                    reject(ev);
                };
                tx.onerror = (ev) =>
                {
                    console.error("write: Failed to write file: " +
                                  ev.target.error.message);
                    reject(ev);
                };
    
                tx
                .objectStore("toc")
                .get(path)
                .onsuccess = (ev) => 
                {
                    const result = ev.target.result;
    
                    const pos = path.lastIndexOf("/");
                    const dir = path.substr(0, pos);
                    const name = pos !== -1 ? path.substr(pos + 1) : path;
    
                    const item = {
                        path: path,
                        dir: exports.normalizePath(dir),
                        name: name,
                        type: "f",
                        size: blob.size,
                        mimetype: mime.mimeType(name)
                    };
    
                    if (result === null)
                    {
                        // add new entry
                        console.log("file is new: " + path);
                        tx
                        .objectStore("toc")
                        .add(item);
                        tx
                        .objectStore("res")
                        .add(blob.slice(), path);
                    }
                    else
                    {
                        // modify existing
                        console.log("overwriting file: " + path);
                        tx
                        .objectStore("toc")
                        .put(item);
                        tx
                        .objectStore("res")
                        .put(blob.slice(), path);
                    }
                };
            });
        }
    };
});
