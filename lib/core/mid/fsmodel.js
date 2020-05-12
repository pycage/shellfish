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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    let d = new WeakMap();

    /**
     * Class representing a filesystem model.
     *
     * @extends mid.Object
     * @memberof mid
     */
    exports.FSModel = class FSModel extends obj.Object
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
                items: [],
                loading: false,
                updateHandle: null
            });
            
            this.notifyable("directoriesFirst");
            this.notifyable("fs");
            this.notifyable("loading");
            this.notifyable("path");
            this.notifyable("size");
            this.notifyable("withFiles");
            this.notifyable("withDirectories");

            this.registerEvent("modelReset");
            this.registerEvent("modelInsert");
            this.registerEvent("modelRemove");
        }

        get fs() { return d.get(this).fs; }
        set fs(f)
        {
            d.get(this).fs = f;
            this.fsChanged();
            this.update();

            if (f)
            {
                f.connect("fsChange", this, (changedPath) =>
                {
                    console.log("fs change " + changedPath);
                    if (changedPath === d.get(this).path)
                    {
                        this.update();
                    }
                });
            }
        }

        get path() { return d.get(this).path; }
        set path(p)
        {
            d.get(this).path = p;
            this.pathChanged();
            this.update();
        }

        get size() { return d.get(this).items.length; }

        get loading() { return d.get(this).loading; }

        get directoriesFirst() { return d.get(this).directoriesFirst; }
        set directoriesFirst(value)
        {
            d.get(this).directoriesFirst = value;
            this.update();
            this.directoriesFirstChanged();
        }

        get withFiles() { return d.get(this).withFiles; }
        set withFiles(value)
        {
            d.get(this).withFiles = value;
            this.update();
            this.withFilesChanged();
        }

        get withDirectories() { return d.get(this).withDirectories; }
        set withDirectories(value)
        {
            d.get(this).withDirectories = value;
            this.update();
            this.withDirectoriesChanged();
        }

        update()
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
                    this.doUpdate();
                });
            }
        }

        doUpdate()
        {
            console.log("update fs model");
            const priv = d.get(this);

            if (! priv.fs)
            {
                d.get(this).items = [];
                this.sizeChanged();
                this.modelReset();
                return;
            }

            priv.fs.list(priv.path, (ok, items) =>
            {
                d.get(this).items = items.filter((item) =>
                {
                    return (item.type === "f" && d.get(this).withFiles ||
                    item.type === "d" && d.get(this).withDirectories);
                })
                .sort((a, b) =>
                {
                    if (a.type === "d" && b.type !== "d")
                    {
                        return -1;
                    }
                    else if (a.type !== "d" && b.type === "d")
                    {
                        return 1;
                    }
                    else
                    {
                        return a.name < b.name ? -1 : 1;
                    }
                });
                console.log("items: " + d.get(this).items.length);
                this.sizeChanged();
                this.modelReset();

                priv.loading = false;
                this.loadingChanged();
            });
        }

        at(n)
        {
            return d.get(this).items[n];
        }
    }
});
