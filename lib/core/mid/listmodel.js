/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js"], function (obj)
{
    const d = new WeakMap();

    /* Class representing a list model.
     */
    exports.ListModel = class ListModel extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                data: []
            });

            this.notifyable("data");
            this.notifyable("size");

            this.registerEvent("modelReset");
            this.registerEvent("modelInsert");
            this.registerEvent("modelRemove");
        }

        get data() { return d.get(this).data.slice(); }
        set data(dat)
        {
            this.reset(dat);
        }

        get size() { return d.get(this).data.length; }

        reset(data)
        {
            d.get(this).data = data;
            this.sizeChanged();
            this.modelReset();
        }

        insert(at, data)
        {
            //console.log("insert " + at + " " + JSON.stringify(data));
            const priv = d.get(this);
            if (at >= 0 && at <= priv.data.length)
            {
                priv.data.splice(at, 0, data);
                this.sizeChanged();
                this.modelInsert(at, 1);
            }
        }

        bulkInsert(at, bulk)
        {
            const priv = d.get(this);
            if (at >= 0 && at <= priv.data.length)
            {
                const data = priv.data;
                priv.data = data.slice(0, at).concat(bulk).concat(priv.data.slice(at));
                this.sizeChanged();
                this.modelInsert(at, bulk.length);
            }
        }

        remove(at)
        {
            if (at >= 0 && at < d.get(this).data.length)
            {
                d.get(this).data.splice(at, 1);
                this.sizeChanged();
                this.modelRemove(at);
            }
        }

        at(n)
        {
            return d.get(this).data[n];
        }

    };
 
 
});