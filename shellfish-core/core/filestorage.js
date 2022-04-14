/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js"], obj =>
{
    class StringStream
    {
        constructor(s)
        {
            this.data = s;
        }


    }

    const d = new WeakMap();

    /**
     * Class representing a storage for persisted properties, such as user preferences.
     * 
     * The properties are persisted in a file on a file system,
     * and their values must be JSON-serializable.
     * 
     * @extends core.Object
     * @memberof core
     * 
     * @property {core.Filesystem} filesystem - (default: `null`) The filesystem to use.
     * @property {string} path - (default: `""`) The path of the storage file.
     */
    class FileStorage extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null,
                path: "",
                doc: { },
                properties: new Set()
            });

            this.notifyable("filesystem");
            this.notifyable("path");
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            d.get(this).filesystem = fs;
            this.filesystemChanged();
            this.readDocument();
        }

        get path() { return d.get(this).path; }
        set path(p)
        {
            d.get(this).path = p;
            this.pathChanged();
            this.readDocument();
        }

        readDocument()
        {
            const priv = d.get(this);
            if (priv.filesystem !== null && priv.path !== "")
            {
                priv.filesystem.read(priv.path)
                .then(async blob =>
                {
                    const data = await blob.text();
                    priv.doc = JSON.parse(data);

                    for (let key in priv.doc)
                    {
                        if (priv.properties.has(key))
                        {
                            this[key] = priv.doc[key];
                        }
                    }
                })
                .catch(err =>
                {

                });
            }
        }

        saveDocument()
        {
            const priv = d.get(this);
            if (priv.filesystem !== null && priv.path !== "")
            {
                let blob = null;
                if (typeof Blob !== "undefined")
                {
                    blob = new Blob([JSON.stringify(priv.doc)], { type: "application/json" });
                }
                else
                {
                    blob = JSON.stringify(priv.doc);
                }

                priv.filesystem.write(priv.path, blob)
                .then(() =>
                {

                })
                .catch(err =>
                {
                    console.error(this.objectType + "@" + this.objectLocation +
                                  ": Failed to save file '" + priv.path + "'");
                });
            }
        }

        addProperty(key, getter, setter, innate)
        {
            if (innate)
            {
                super.addProperty(key, getter, setter);
                return;
            }

            const priv = d.get(this);
            priv.properties.add(key);

            let isSet = false;

            const s = (v) =>
            {
                if (! isSet && priv.doc[key] !== undefined)
                {
                    // set the persisted value instead of the default value
                    isSet = true;
                    return setter(priv.doc[key]);
                }
                else
                {
                    priv.doc[key] = v;
                    this.saveDocument();
                    isSet = true;
                    return setter(v);
                }
            };

            super.addProperty(key, getter, s);
        }

    }
    exports.FileStorage = FileStorage;
});