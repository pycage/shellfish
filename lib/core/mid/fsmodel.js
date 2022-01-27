/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/listmodel.js"], function (low, lm)
{
    const pathMap = new Map();
    const newPathMap = new Map();

    let d = new WeakMap();

    /**
     * Class representing a filesystem model.
     *
     * @extends mid.ListModel
     * @memberof mid
     * 
     * @property {bool} directoriesFirst - (default: `true`) Whether to list directories first.
     * @property {mid.Filesystem} filesystem - (default: `null`) The filesystem to use.
     * @property {bool} loading - [readonly] `true` if the model is currently being loaded.
     * @property {string} path - (default: `""`) The path represented by the model.
     * @property {bool} withFiles - (default: `true`) Whether to include files.
     * @property {bool} withDirectories - (default: `true`) Whether to include directories.
     */
    class FSModel extends lm.ListModel
    {
        constructor()
        {
            super();
            d.set(this, {
                fs: null,
                path: "",
                directoriesFirst: true,
                withFiles: true,
                withDirectories: true,
                loading: false,
                updateHandle: null
            });
            
            this.notifyable("directoriesFirst");
            this.notifyable("filesystem");
            this.notifyable("loading");
            this.notifyable("path");
            this.notifyable("withFiles");
            this.notifyable("withDirectories");
        }

        get filesystem() { return d.get(this).fs; }
        set filesystem(f)
        {
            if (d.get(this).fs)
            {
                d.get(this).fs.referenceRemove(this);
            }

            d.get(this).fs = f;
            this.filesystemChanged();
            this.update(true);

            if (f)
            {
                f.connect("fsChange", this, (changedPath) =>
                {
                    console.log("fs change " + changedPath);
                    if (changedPath === d.get(this).path)
                    {
                        this.update(false);
                    }
                });
                f.referenceAdd(this);
            }
        }

        get path() { return d.get(this).path; }
        set path(p)
        {
            d.get(this).path = p;
            this.pathChanged();
            this.update(true);
        }

        get loading() { return d.get(this).loading; }

        get directoriesFirst() { return d.get(this).directoriesFirst; }
        set directoriesFirst(value)
        {
            d.get(this).directoriesFirst = value;
            this.update(true);
            this.directoriesFirstChanged();
        }

        get withFiles() { return d.get(this).withFiles; }
        set withFiles(value)
        {
            d.get(this).withFiles = value;
            this.update(false);
            this.withFilesChanged();
        }

        get withDirectories() { return d.get(this).withDirectories; }
        set withDirectories(value)
        {
            d.get(this).withDirectories = value;
            this.update(false);
            this.withDirectoriesChanged();
        }

        comparator(a, b)
        {
            if (d.get(this).directoriesFirst)
            {
                if (a.type === "d" && b.type !== "d")
                {
                    return -1;
                }
                else if (a.type !== "d" && b.type === "d")
                {
                    return 1;
                }
            }
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        }

        mergeWithUpdate(newItems)
        {
            newPathMap.clear();
            for (let i = 0; i < newItems.length; ++i)
            {
                const item = newItems[i];
                newPathMap.set(item.path, i);
            }
         
            const removals = [];
            pathMap.clear();
            for (let i = 0; i < this.size; ++i)
            {
                const item = this.at(i);
                pathMap.set(item.path, i);

                if (! newPathMap.has(item.path))
                {
                    removals.push(i);
                }
            }

            removals.reverse();
            removals.forEach(idx => this.remove(idx));
            
            const insertions = newItems.filter(item => ! pathMap.has(item.path));
            insertions.forEach(item =>
            {
                this.insertOrdered(item, (a, b) => this.comparator(a, b));
            });
        }

        update(reset)
        {
            const priv = d.get(this);
            if (! priv.updateHandle)
            {
                priv.loading = true;
                this.loadingChanged();

                priv.updateHandle = low.addFrameHandler(() =>
                {
                    priv.updateHandle.cancel();
                    priv.updateHandle = null;
                    this.doUpdate(reset);
                }, this.objectType + "@" + this.objectLocation);
            }
        }

        doUpdate(reset)
        {
            console.log("update fs model");
            const priv = d.get(this);

            if (! priv.fs)
            {
                this.reset([]);
                return;
            }

            priv.fs.list(priv.path)
            .then(items =>
            {
                console.log(items);
                const newItems = items.filter(item =>
                {
                    return (item.type === "f" && priv.withFiles ||
                            item.type === "d" && priv.withDirectories);
                })
                .sort((a, b) => this.comparator(a, b));
                console.log(newItems);

                if (reset)
                {
                    this.reset(newItems);
                }
                else
                {
                    this.mergeWithUpdate(newItems);
                }

                priv.loading = false;
                this.loadingChanged();
            });
        }
    }
    exports.FSModel = FSModel;
});
