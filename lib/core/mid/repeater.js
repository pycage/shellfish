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

shRequire([__dirname + "/../low.js", __dirname + "/object.js", __dirname + "/listmodel.js"], function (low, obj, listModel)
{
    let d = new WeakMap();

    /**
     * Class representing a repeater.
     * 
     * The repeater creates a dynamic set of children from its delegate
     * template according to a list model.
     * 
     * The repeater is not a visual element. The children are created within the
     * parent container.
     * 
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {function} delegate - (default: `null`) The delegate template.
     * @property {mid.ListModel} model - (default: `null`) The list model.
     */
    exports.Repeater = class Repeater extends obj.Object
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

            this.onInitialization = () =>
            {
                this.clear();
                this.renderAll();
            };
        }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);

            let mObj = null;
            if (typeof m === "number")
            {
                mObj = new listModel.ListModel();
                const arr = [];
                for (let i = 0; i < m; ++i) arr.push({ });
                mObj.reset(arr);
            }
            else
            {
                mObj = m;
            }

            if (priv.model)
            {
                // stop watching previous model
                priv.model.disconnect("modelReset", this);
                priv.model.disconnect("modelInsert", this);
                priv.model.disconnect("modelRemove", this);
                priv.model.referenceRemove(this);
            }

            priv.model = mObj;
            if (mObj)
            {
                mObj.referenceAdd(this);
                mObj.connect("modelReset", this, () =>
                {
                    this.clear();
                    this.renderAll();
                });
                mObj.connect("modelInsert", this, (at, size) =>
                {
                    this.clear();
                    this.renderAll();
                });
                mObj.connect("modelRemove", this, (at) =>
                {
                    this.clear();
                    this.renderAll();
                });
            }

            this.modelChanged();
            this.clear();
            this.renderAll();
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
            this.clear();
            this.renderAll();
        }

        get items() { return d.get(this).items.slice(); }

        clear()
        {
            d.get(this).items.forEach((item) => { item.discard(); });
            d.get(this).items = [];
        }

        renderAll()
        {
            if (this.lifeCycleStatus !== "initialized")
            {
                return;
            }

            const model = d.get(this).model;
            const delegate = d.get(this).delegate;
            const items = d.get(this).items;
            
            if (! model || ! delegate || ! this.parent)
            {
                return;
            }
            //console.log("render " + this.objectLocation);

            for (let i = 0; i < model.size; ++i)
            {
                const modelData = {
                    index: i,
                    value: model.at(i)
                };
                const item = delegate(modelData);
                if (item)
                {
                    items.push(item);
                    this.parent.add(item);
                }
            }
        }
    };

});