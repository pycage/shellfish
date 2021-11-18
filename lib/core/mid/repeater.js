/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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
     * @example <caption>Shui code</caption>
     * Box {
     *     Repeater {
     *         model: ListModel { data: sequence(0, 3) }
     *         delegate: template Label {
     *             text: "Label #" + modelData.index
     *         }
     *     }
     * }
     * 
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {number} count - [readonly] The amount of items.
     * @property {fengshui.Template} delegate - (default: `null`) The delegate template. This does not need to be a visual element.
     * @property {mid.Object[]} items - [readonly] The list of items.
     * @property {mid.ListModel} model - (default: `null`) The list model. You may pass a number value to implicitly create a simple model.
     */
    class Repeater extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                model: null,
                delegate: () => null,
                items: [],
                recycleBin: []
            });

            this.notifyable("count");
            this.notifyable("model");

            this.onInitialization = () =>
            {
                this.clear();
                this.renderAll();
            };

            this.onDestruction = () =>
            {
                this.clear();
            }
        }

        get count() { return !! d.get(this).model ? d.get(this).model.size : 0; }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);

            let mObj = null;
            if (typeof m === "number")
            {
                if (priv.model)
                {
                    while (priv.model.size > m)
                    {
                        priv.model.remove(priv.model.size - 1);
                    }
                    if (m > priv.model.size)
                    {
                        const arr = [];
                        for (let i = priv.model.size; i < m; ++i) arr.push({ });
                        priv.model.bulkInsert(priv.model.size, arr);
                    }
                    // we're done
                    return;
                }
                else
                {
                    mObj = new listModel.ListModel();
                    const arr = [];
                    for (let i = 0; i < m; ++i) arr.push({ });    
                    mObj.reset(arr);
                }
            }
            else
            {
                mObj = m;
            }

            // clear old content
            this.clear();

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
                    const toDestroy = [];
                    priv.items.forEach((item, idx) =>
                    {
                        toDestroy.push(idx);
                    });
                    toDestroy
                    .sort((a, b) => b < a ? -1 : 1)
                    .forEach(idx =>
                    {
                        this.destroyItem(idx);
                    });

                    priv.items = [];
                    for (let i = 0; i < mObj.size; ++i)
                    {
                        priv.items.push(undefined);
                    }

                    this.dumpRecycleBin();
                    this.renderAll();
                    this.countChanged();
                });
                mObj.connect("modelInsert", this, (at, size) =>
                {
                    for (let i = 0; i < size; ++i)
                    {
                        priv.items = priv.items.slice(0, at)
                                     .concat([undefined])
                                     .concat(priv.items.slice(at));
                    }
                    // the index of the following alive items increases
                    for (let i = at + size; i < priv.items.length; ++i)
                    {
                        this.updateItem(i);
                    }
                    this.renderAll();
                    this.countChanged();
                });
                mObj.connect("modelRemove", this, (at) =>
                {
                    this.destroyItem(at);
                    // the index of the following items decreases
                    priv.items.splice(at, 1);
                    priv.items.forEach((item, idx) =>
                    {
                        if (idx >= at)
                        {
                            this.updateItem(idx);
                        }
                    });
                    this.renderAll();
                    this.countChanged();
                });
                mObj.connect("modelReplace", this, (at) =>
                {
                    this.updateItem(at);
                    this.renderAll();
                });
            }

            this.renderAll();
            this.modelChanged();
            this.countChanged();
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
            this.renderAll();
        }

        get items() { return d.get(this).items.slice(); }

        dumpRecycleBin()
        {
            const priv = d.get(this);
            priv.recycleBin.forEach((item) =>
            {
                item.referenceRemove(this);
            });
            priv.recycleBin = [];
        }

        createItem(idx)
        {
            const priv = d.get(this);
            const modelData = {
                index: idx,
                value: priv.model.at(idx)
            };

            let item = null;
            if (priv.recycleBin.length > 0)
            {
                item = priv.recycleBin.pop();
                item.modelData = modelData;
            }
            else
            {
                item = priv.delegate();
                item.modelData = modelData;
                item.referenceAdd(this);
            }

            return item;
        }

        updateItem(idx)
        {
            const priv = d.get(this);
            const modelData = {
                index: idx,
                value: priv.model.at(idx)
            };
            if (modelData.value !== undefined)
            {
                const item = this.getItem(idx);
                if (item)
                {
                    item.modelData = modelData;
                }
            }
        }

        destroyItem(idx)
        {
            const priv = d.get(this);
            const item = this.getItem(idx);
            if (item)
            {
                priv.recycleBin.push(item);
                item.parent = null;
            }
        }

        getItem(idx)
        {
            return d.get(this).items[idx];
        }

        clear()
        {
            d.get(this).items.forEach(item =>
            {
                if (item !== undefined)
                {
                    item.parent = null;
                    item.referenceRemove(this);
                }
            });
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

            const f = () =>
            {
                const existingItems = items.filter(c => c !== undefined);
                for (let i = 0; i < model.size; ++i)
                {
                    if (items[i] === undefined)
                    {
                        const item = this.createItem(i);
                        if (item)
                        {
                            if (existingItems.length === 0)
                            {
                                this.parent.add(item);
                            }
                            else
                            {
                                this.parent.add(item, existingItems[0]);
                            }

                            items[i] = item;
                        }
                    }
                    else
                    {
                        if (existingItems.length > 0 && existingItems[0] === items[i])
                        {
                            existingItems.shift();
                        }
                    }
                }
            };

            const now = Date.now();
            if (this.parent.withoutSizing)
            {
                this.parent.withoutSizing(f);
            }
            else
            {
                f();
            }
            //console.log("Filling repeater took " + (Date.now() - now) + " ms");
        }
    }
    exports.Repeater = Repeater;

});