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

shRequire(["shellfish/core", "shellfish/core/mime"], function (core, mime)
{
    const VERSION = 2;
    
    const indexedDB = window.indexedDB ||
                      window.mozIndexedDB ||
                      window.webkitIndexedDB ||
                      window.msIndexedDB;

    function upgradeDatabase(req, oldVersion)
    {
        const db = req.result;
        const tx = req.transaction;

        if (oldVersion < 1)
        {
            const tocStore = db.createObjectStore("toc", { keyPath: "path" });
            const resStore = db.createObjectStore("res");
            
            tocStore.createIndex("name", "name", { unique: false });
            tocStore.createIndex("dir", "dir", { unique: false });
        }
        if (oldVersion < 2)
        {
            const tocStore = tx.objectStore("toc");
            tocStore
            .openCursor()
            .onsuccess = (ev) =>
            {
                const csr = ev.target.result;
                if (csr)
                {
                    const entry = csr.value;
                    entry.ctime = Math.floor(Date.now() / 1000);
                    entry.mtime = Math.floor(Date.now() / 1000);
                    tocStore.put(entry);
                    csr.continue();
                }
            };
        }
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


    let d = new WeakMap();

    /**
     * Class representing a virtual offline filesystem drive on top of the
     * HTML5 Indexed DB.
     * 
     * @extends core.Filesystem
     * @memberof html
     * 
     * @property {string} volume - (default: `""`) The name of the drive volume.
     */
    class OfflineFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                volume: ""
            });
            
            this.notifyable("volume");
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
                    upgradeDatabase(ev.target, ev.oldVersion);
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
                path = this.normalizePath(path);

                const db = await this.open();
                const tx = db.transaction(["toc"], "readonly");
                tx.oncomplete = (ev) =>
                {
    
                };
                tx.onabort = (ev) =>
                {
                    console.error("exists: Transaction aborted: " + ev.target.error.message);
                    reject(ev.target.error);
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
                path = this.normalizePath(path);
        
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
                    reject(ev.target.error);
                };
                tx.onerror = (ev) =>
                {
                    console.error("Error listing directory: " + ev.target.error.message);
                    reject(ev.target.error);
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
                path = this.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc"], "readwrite");
    
                tx.oncomplete = (ev) =>
                {
                    resolve();
                    this.fsChange(path);
                };
                tx.onabort = (ev) =>
                {
                    console.error("mkdir: Transaction aborted.");
                    reject(ev.target.error);
                };
                tx.onerror = (ev) =>
                {
                    console.error("mkdir: Failed to create directory: " +
                                  ev.target.error.message);
                    reject(ev.target.error);
                };
    
                const dirPath = this.pathJoin(path, name);
    
                tx.objectStore("toc")
                .add({
                    path: dirPath,
                    dir: path,
                    name: name,
                    type: "d",
                    size: 0,
                    res: 0,
                    mimetype: "application/x-folder",
                    ctime: Math.floor(Date.now() / 1000),
                    mtime: Math.floor(Date.now() / 1000)
                });
    
            });
        }

        move(sourcePath, destPath)
        {
            return new Promise(async (resolve, reject) =>
            {
                sourcePath = this.normalizePath(sourcePath);
                destPath = this.normalizePath(destPath);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readwrite");
                tx.oncomplete = ev =>
                {
                    resolve();
                    this.fsChange(sourcePath);
                    this.fsChange(destPath);
                    this.fsChange(this.dirname(sourcePath));
                    this.fsChange(this.dirname(destPath));
                };
                tx.onabort = ev =>
                {
                    console.error("move: Transaction aborted.");
                    reject(ev.target.error);
                };
                tx.onerror = ev =>
                {
                    console.error("move: Failed to move file: " +
                                  ev.target.error.message);
                    reject(ev.target.error);
                };

                tx
                .objectStore("toc")
                .get(sourcePath)
                .onsuccess = (ev) =>
                {
                    const entry = ev.target.result;
                    entry.dir = this.dirname(destPath);
                    entry.name = this.filename(destPath);
                    entry.path = destPath;

                    tx
                    .objectStore("toc")
                    .add(entry);

                    removeFromToc(tx, [sourcePath]);
                };

                tx
                .objectStore("res")
                .get(sourcePath)
                .onsuccess = (ev) =>
                {
                    const blob = ev.target.result;
                    if (blob)
                    {
                        tx
                        .objectStore("res")
                        .add(blob.slice(), destPath);
    
                        removeFromRes(tx, [sourcePath]);
                    }
                };
            });            
        }

        remove(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                path = this.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readwrite");
                tx.oncomplete = (ev) =>
                {
                    resolve();
                    this.fsChange(path);
                    this.fsChange(this.dirname(path));
                };
                tx.onabort = (ev) =>
                {
                    console.error("remove: Transaction aborted.");
                    reject(ev.target.error);
                };
                tx.onerror = (ev) =>
                {
                    console.error("remove: Failed to create directory: " +
                                    ev.target.error.message);
                    reject(ev.target.error);
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
                path = this.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readonly");
                tx.oncomplete = (ev) =>
                {
    
                };
                tx.onabort = (ev) =>
                {
                    console.error("read: Transaction aborted: " + ev.target.error.message);
                    reject(ev.target.error);
                };
                tx.onerror = (ev) =>
                {
                    console.error("read: Failed to read file: " +
                                    ev.target.error.message);
                    reject(ev.target.error);
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
                        console.error("read: Failed to read file: " + path);
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
        
                path = this.normalizePath(path);
                const db = await this.open();
                const tx = db.transaction(["toc", "res"], "readwrite");
                tx.oncomplete = (ev) =>
                {
                    resolve();
                    this.fsChange(path);
                    this.fsChange(this.dirname(path));
                };
                tx.onabort = (ev) =>
                {
                    console.error("write: Transaction aborted.");
                    reject(ev.target.error);
                };
                tx.onerror = (ev) =>
                {
                    console.error("write: Failed to write file: " +
                                  ev.target.error.message);
                    reject(ev.target.error);
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
                        dir: this.normalizePath(dir),
                        name: name,
                        type: "f",
                        size: blob.size,
                        mimetype: mime.mimeType(name),
                        ctime: Math.floor(Date.now() / 1000),
                        mtime: Math.floor(Date.now() / 1000)
                    };
    
                    if (result === null)
                    {
                        // add new entry
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
    }
    exports.OfflineFS = OfflineFS;
});
