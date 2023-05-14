/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 Martin Grimme <martin.grimme@gmail.com>

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
    const HAS_STORAGE = typeof localStorage !== undefined;

    function stripNs(ns, key)
    {
        return key.startsWith(ns + ".") ? key.substr(ns.length + 1) : key;
    }

    const d = new WeakMap();

    /**
     * Class representing a storage for persisted properties, such as user preferences.
     * 
     * The properties are persisted in the HTML5 local storage, if available,
     * and their values must be JSON-serializable.
     * 
     * **Note:** Multiple instances of the same document share the same local storage and
     * instances will see changes made by other instances immediately.
     * 
     * @extends html.Object
     * @memberof html
     * 
     * @property {string} namespace - (default: `""`) A namespace for distinguishing multiple instances.
     */
    class LocalStorage extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                namespace: "",
                properties: new Set()
            });

            this.notifyable("namespace");

            if (HAS_STORAGE)
            {
                this.addHtmlEventListener(window, "storage", (ev) =>
                {
                    const key = stripNs(d.get(this).namespace, ev.key);
                    if (d.get(this).properties.has(key))
                    {
                        console.log("storage changed: " + ev.key + " = " + ev.newValue);
                        this[key] = JSON.parse(ev.newValue);
                    }
                });
            }
            else
            {
                console.warn(this.objectType + "@" + this.objectLocation +
                             ": LocalStorage is not available. " +
                             "Properties will not be persisted.");
            }
        }

        get namespace() { return d.get(this).namespace; }
        set namespace(ns)
        {
            d.get(this).namespace = ns;
            this.namespaceChanged();
        }

        addProperty(key, getter, setter, innate)
        {
            if (innate || ! HAS_STORAGE)
            {
                super.addProperty(key, getter, setter);
                return;
            }

            const priv = d.get(this);
            priv.properties.add(key);

            let isSet = false;

            const s = (v) =>
            {
                const ns = priv.namespace;
                const nsKey = [ns, key].join(".");
                if (! isSet && localStorage.getItem(nsKey) !== null)
                {
                    // set the persisted value instead of the default value
                    isSet = true;
                    return setter(JSON.parse(localStorage.getItem(nsKey)));
                }
                else
                {
                    localStorage.setItem(nsKey, JSON.stringify(v));
                    isSet = true;
                    return setter(v);
                }
            };

            super.addProperty(key, getter, s);
        }

    }
    exports.LocalStorage = LocalStorage;
});