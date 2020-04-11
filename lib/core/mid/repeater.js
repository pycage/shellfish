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

shRequire([__dirname + "/../low.js", __dirname + "/box.js"], function (low, box)
{
    let d = new WeakMap();

    exports.Repeater = class Repeater extends box.Box
    {
        constructor()
        {
            super();
            d.set(this, {
                model: null,
                delegate: (modelData) => null,
                items: []
            });

            this.notifyable("model");
        }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const that = this;

            // FIXME: stop watching previous model
            d.get(this).model = m;
            m.onModelReset = function ()
            {
                that.clear();
                that.renderAll();
            };
            m.onModelInsert = function (at)
            {

            };
            m.onModelRemove = function (at)
            {

            };

            this.modelChanged();
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
            this.clear();
            this.renderAll();
        }

        clear()
        {
            d.get(this).items.forEach((item) => { item.discard(); });
            d.get(this).items = [];
        }

        renderAll()
        {
            const model = d.get(this).model;
            const delegate = d.get(this).delegate;
            const items = d.get(this).items;

            for (let i = 0; i < model.size; ++i)
            {
                const item = delegate(model.at(i));
                items.push(item);
                this.get().appendChild(item.get());
            }
        }
    };

});