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

shRequire([__dirname + "/listmodel.js"], function (lm)
{
    const pathMap = new Map();
    const newPathMap = new Map();

    let d = new WeakMap();

    /**
     * Class representing a filesystem model.
     *
     * @extends core.ListModel
     * @memberof core
     * 
     * @property {bool} directoriesFirst - (default: `true`) Whether to list directories first.
     * @property {html.Filesystem} filesystem - (default: `null`) The filesystem to use.
     * @property {function} filter - A filtering function. By default, hidden files are filtered out.
     * @property {bool} loading - [readonly] `true` if the model is currently being loaded.
     * @property {string} path - (default: `""`) The path represented by the model.
     * @property {function} sorter - A sorting function. By default, items are sorted in ascending case-insensitive order by their name.
     */
    class FSModel extends lm.ListModel
    {
        constructor()
        {
            super();
            d.set(this, {
                fs: null,
                path: "",
                query: "",
                filter: item => ! item.name.startsWith("."),
                sorter: (a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1,
                directoriesFirst: true,
                loading: false,
                items: []
            });
            
            this.notifyable("directoriesFirst");
            this.notifyable("filesystem");
            this.notifyable("filter");
            this.notifyable("loading");
            this.notifyable("path");
            this.notifyable("query");
            this.notifyable("sorter");
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

        get query() { return d.get(this).query; }
        set query(q)
        {
            d.get(this).query = q;
            this.queryChanged();
            this.update(true);
        }

        get loading() { return d.get(this).loading; }

        get filter() { return d.get(this).filter; }
        set filter(f)
        {
            d.get(this).filter = f;
            this.processItems(d.get(this).items, true);
            this.filterChanged();
        }

        get directoriesFirst() { return d.get(this).directoriesFirst; }
        set directoriesFirst(value)
        {
            d.get(this).directoriesFirst = value;
            this.processItems(d.get(this).items, true);
            this.directoriesFirstChanged();
        }

        get sorter() { return d.get(this).sorter; }
        set sorter(s)
        {
            d.get(this).sorter = s;
            this.processItems(d.get(this).items, true);
            this.sorterChanged();
        }

        /**
         * Creates a filtering function for the `filter` property.
         * 
         * @param {bool} withDirectories - Whether to include directories.
         * @param {bool} withFiles - Whether to include files.
         * @param {bool} withHidden - Whether to include hidden entries (name starting with `.`).
         * @returns {function} The filtering function.
         */
        makeFilter(withDirectories, withFiles, withHidden)
        {
            return item =>
            {
                if (item.type === "d" && ! withDirectories)
                {
                    return false;
                }
                if (item.type === "f" && ! withFiles)
                {
                    return false;
                }
                if (item.name.startsWith(".") && ! withHidden)
                {
                    return false;
                }
                return true;
            };
        }

        /**
         * Creates a sorting function for the `sorter` property.
         * 
         * @param {string} role - The sort role name.
         * @param {bool} ascending - Whether to sort in ascending order.
         * @return {function} The sorting function.
         */
        makeSorter(role, ascending)
        {
            return (a, b) =>
            {
                const aValue = a[role];
                const bValue = b[role];
                const comp = (a, b) =>
                {
                    return ascending ? (a < b ? -1 : 1)
                                     : (a > b ? -1 : 1);
                };
                
                if (role === "name")
                {
                    return comp(aValue.toLowerCase(), bValue.toLowerCase());
                }
                else
                {
                    return comp(aValue, bValue);
                }    
            };
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

            return d.get(this).sorter(a, b);
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

            if (! priv.loading)
            {
                priv.loading = true;
                this.loadingChanged();
            }

            this.defer(() =>
            {
                this.doUpdate(reset);
            }, "update");
        }

        doUpdate(reset)
        {
            const priv = d.get(this);

            if (! priv.fs)
            {
                this.reset([]);
                return;
            }

            const forPath = priv.path;
            if (priv.query !== "")
            {
                priv.fs.search(priv.path, priv.query)
                .then(this.safeCallback(items =>
                {
                    if (priv.path !== forPath)
                    {
                        return;
                    }

                    //console.log(items);
                    priv.items = items;
                    this.processItems(items, reset);

                    priv.loading = false;
                    this.loadingChanged();
    
                }));
            }
            else
            {
                priv.fs.list(priv.path)
                .then(this.safeCallback(items =>
                {
                    if (priv.path !== forPath)
                    {
                        return;
                    }

                    //console.log(items);
                    priv.items = items;
                    this.processItems(items, reset);

                    priv.loading = false;
                    this.loadingChanged();
    
                }));
            }
        }

        processItems(items, reset)
        {
            const priv = d.get(this);
            const newItems = items
            .filter(priv.filter)
            .sort((a, b) => this.comparator(a, b));
            //console.log(newItems);

            if (reset)
            {
                this.reset(newItems);
            }
            else
            {
                this.mergeWithUpdate(newItems);
            }
        }
    }
    exports.FSModel = FSModel;
});
