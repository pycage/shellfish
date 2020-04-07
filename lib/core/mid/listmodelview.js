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

shRequire([__dirname + "/../low.js", __dirname + "/item.js"], function (low, item)
{

    class SparseList
    {
        constructor()
        {
            // list of (begin, data) tuples
            this.ranges = [];
        }

        get length()
        {
            return this.ranges.length > 0 ? this.ranges[this.ranges.length - 1][0] +
                                            this.ranges[this.ranges.length - 1][1].length
                                          : 0;
        }

        get sparseLength()
        {
            return this.ranges.reduce((a, r) => a + r[1].length, 0);
        }

        clear()
        {
            this.ranges = [];
        }

        optimizeRange(r)
        {
            while (r[1].length > 0 && r[1][0] === undefined)
            {
                r[1].shift();
                ++r[0];
            }
            while (r[1].length > 0 && r[1][r[1].length - 1] === undefined)
            {
                r[1].pop();
            }
        }

        mergeRange(r)
        {
            const mergeDistance = Math.min(100, Math.ceil(this.length / 10));

            // insert
            let inserted = false;
            for (let i = 0; i < this.ranges.length; ++i)
            {
                if (this.ranges[i][0] > r[0])
                {
                    this.ranges.splice(i, 0, r);
                    inserted = true;
                    break;
                }
            }
            if (! inserted)
            {
                this.ranges.push(r);
            }

            this.ranges.forEach(this.optimizeRange);

            // merge
            let ranges = [this.ranges[0]];
            for (let i = 1; i < this.ranges.length; ++i)
            {
                let dist = this.ranges[i][0] - (this.ranges[i - 1][0] + this.ranges[i - 1][1].length);
                if (dist < mergeDistance)
                {
                    let r = ranges[ranges.length - 1];
                    for (let j = 0; j < dist; ++j)
                    {
                        r[1].push(undefined);
                    }
                    r[1] = r[1].concat(this.ranges[i][1]);
                }
                else
                {
                    ranges.push(this.ranges[i]);
                }
            }
            this.ranges = ranges;
        }

        append(value)
        {
            this.insertBefore(this.length, value);
        }

        insertBefore(pos, value)
        {
            let range = this.ranges.find((r) => pos >= r[0] && pos <= r[0] + r[1].length);
            if (range)
            {
                // insert into existing range
                range[1].splice(pos - range[0], 0, value);
                this.optimizeRange(range);
            }
            else
            {
                // create a new range
                this.mergeRange([pos, [value]]);
            }
        }

        removeAt(pos)
        {
            //console.log("before removeAt(" + pos + ") " + JSON.stringify(this.ranges));
            let range = this.ranges.find((r) => pos >= r[0] && pos < r[0] + r[1].length);
            this.ranges.forEach((r) => { if (r[0] > pos) { r[0] = r[0] - 1; } });
            if (range)
            {
                const innerPos = pos - range[0];
                const a = range[1].slice(0, innerPos);
                const b = range[1].slice(innerPos + 1);
                range[1] = a;
                this.mergeRange([pos, b]);
            }
            this.ranges = this.ranges.filter(r => r[1].length > 0);
            //console.log("after removeAt(" + pos + ") " + JSON.stringify(this.ranges));
        }

        at(pos)
        {
            let range = this.ranges.find((r) => pos >= r[0] && pos < r[0] + r[1].length);
            if (range)
            {
                return range[1][pos - range[0]];
            }
            else
            {
                return undefined;
            }
        }

        set(pos, value)
        {
            let range = this.ranges.find((r) => pos >= r[0] && pos < r[0] + r[1].length);
            if (range)
            {
                range[1][pos - range[0]] = value;
            }
            else
            {
                this.mergeRange([pos, [value]]);
            }
            //console.log("ranges: " + this.ranges.length);
        }

        accumulate(from, to, defaultValue, f)
        {
            //console.log("accumulate " + from + ", " + to + ", " + defaultValue);
            let value = 0;
            let nextPos = from;

            this.ranges.forEach(function (r)
            {
                //console.log("range at " + r[0] + " -> " + (r[0] + r[1].length - 1));
                //console.log("nextPos: " + nextPos);
                const dist = Math.max(0, Math.min(to + 1, r[0]) - nextPos);
                //console.log("dist to " + r[0] + ": " + dist);
                value += dist * defaultValue;

                const offset = Math.max(0, from - r[0]);
                const until = Math.min(r[1].length - 1, to - r[0]);
                //console.log("offset: " + offset + ", until: " + until);

                for (let i = offset; i <= until; ++i)
                {
                    const v = r[1][i];
                    value += v !== undefined ? f(v) : defaultValue;
                }
                nextPos = r[0] + until + 1;
            });

            //console.log("nextPos: " + nextPos);
            const dist = Math.max(0, to - nextPos);
            //console.log("final dist to " + to + ": " + dist);
            value += dist * defaultValue;

            return value;
        }
    }


    const d = new WeakMap();

    /* Class representing a list view fed from a model.
     */
    exports.ListView = class ListView extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                indexOffset: 0,
                totalSize: 0,
                model: null,
                delegate: (modelData) => null,
                range: [-1, -1],
                itemMeta: new SparseList(),
                itemSize: 16,
                item: low.createElementTree(
                    low.tag("div")
                    .class("sh-no-scrollbars")
                    .style("position", "relative")
                    .style("width", "auto")
                    .style("height", "auto")
                    .style("overflow", "auto")
                    .content(
                        // content box
                        low.tag("div")
                    )
                    .content(
                        // size spanner
                        low.tag("div")
                        .style("position", "absolute")
                        .style("width", "1px")
                        .style("height", "1px")
                    )
                    .html()
                )
            });

            this.notifyable("model");

            d.get(this).item.addEventListener("scroll", () =>
            {
                this.contentXChanged();
                this.contentYChanged();
            }, { passive: true });
            
            this.onContentYChanged = () => { this.render(); };
            this.onBboxChanged = () =>
            {
                //console.log("listmodelview bbox changed " + JSON.stringify(this.bbox));
                this.render();
            };

            this.onInitialization = () => { this.render(); };

            this.canFocus = true;
        }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const that = this;
            //console.log("got model:");
            //console.log(m);
            d.get(this).itemMeta.clear();
            d.get(this).model = m;
            m.onModelReset = function ()
            {
                let range = d.get(that).range;
                for (let i = range[0]; i <= range[1]; ++i)
                {
                    that.destroyItem(i);
                }
                range[0] = 0;
                range[1] = 0;
                d.get(that).itemMeta.clear();
                that.render();
            };
            m.onModelInsert = function (at)
            {
                const range = d.get(that).range;
                d.get(that).itemMeta.insertBefore(at, undefined);
                //console.log("insert item before " + at + ", range " + JSON.stringify(range));
                if (at <= range[1] || at >= d.get(that).itemMeta.length)
                {
                    // the index of the following alive items increases
                    for (let i = at + 1; i <= range[1]; ++i)
                    {
                        that.updateItem(i);
                    }
                    that.render();
                }
                else
                {
                    that.updateContentSize();
                }
            };
            m.onModelRemove = function (at)
            {
                let range = d.get(that).range;
                //console.log("range before remove: " + JSON.stringify(range));
                if (range[1] > 0)
                {
                    --range[1];
                }
                that.destroyItem(at);
                d.get(that).itemMeta.removeAt(at);
                //console.log("range after remove: " + JSON.stringify(d.get(that).range));
                if (at <= range[1])
                {
                    // the index of the following alive items decreases
                    for (let i = at; i <= range[1]; ++i)
                    {
                        that.updateItem(i);
                    }
                    that.render();
                }
                else
                {
                    that.updateContentSize();
                }
            };

            this.render();
            this.updateContentSize();
            this.modelChanged();
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
            this.render();
        }

        createItem(idx)
        {
            //console.log("create item " + idx);
            let modelData = d.get(this).model.at(idx);
            modelData.index = idx;
            const item = d.get(this).delegate(modelData);
            if (item)
            {
                item.position = "free";
                let entry = [item, item.bbox.height];
                d.get(this).itemMeta.set(idx, entry);
                //d.get(this).itemSize = item.bbox.height;
                item.onBboxChanged = () =>
                {
                    //console.log("item bbox changed " + JSON.stringify(item.bbox));
                    //d.get(this).itemSize = item.bbox.height;
                    this.contentWidthChanged();
                    this.contentHeightChanged();
                };
            }
            
            return item;
        }

        updateItem(idx)
        {
            //console.log("update item " + idx);
            let modelData = d.get(this).model.at(idx);
            if (modelData)
            {
                modelData.index = idx;
                let item = d.get(this).itemMeta.at(idx);
                if (item)
                {
                    item[0].dataChange(modelData);
                }
            }
            //console.log("updated " + idx);
        }

        destroyItem(idx)
        {
            //console.log("destroy item " + idx);
            let item = d.get(this).itemMeta.at(idx);
            if (item)
            {
                d.get(this).itemMeta.set(idx, undefined);
                item[0].discard();
            }
        }

        indexAt(pos)
        {
            let itemSize = d.get(this).itemSize;
            let idx = Math.floor(pos / itemSize);
            return Math.max(0, Math.min(d.get(this).model.size - 1, idx));

            /*
            let currentPos = 0;
            while (idx < d.get(this).model.size)
            {
                if (currentPos >= pos)
                {
                    return idx;
                }
                currentPos += itemSize;
                ++idx;
            }
            return d.get(this).model.size - 1;
            */
        }

        positionOf(idx)
        {
            return idx * d.get(this).itemSize;
            //return d.get(this).itemMeta.accumulate(0, idx - 1, 32, v => v[1]);
        }

        updateContentSize()
        {
            const model = d.get(this).model;
            if (! model)
            {
                return;
            }
            const totalSize = this.positionOf(model.size) - 1;
            if (totalSize !== d.get(this).totalSize)
            {
                d.get(this).totalSize = totalSize;
                low.css(d.get(this).item.children[1], "top", (totalSize - 1) + "px");

                this.contentWidthChanged();
                this.contentHeightChanged();
            }
        }

        render()
        {
            const model = d.get(this).model;
            const delegate = d.get(this).delegate;
            const itemSize = d.get(this).itemSize;
            if (! model || ! delegate)
            {
                return;
            }

            const range = d.get(this).range;

            //console.log("visible: " + this.contentY + ", " + (this.contentY + this.bbox.height));
            //console.log("visible range: " + this.indexAt(this.contentY) + ", " + this.indexAt(this.contentY + this.bbox.height));

            const begin = this.indexAt(this.contentY - itemSize);
            const end = this.indexAt(this.contentY + this.bbox.height);

            // remove items out of sight
            //console.log("removing in range " + range[0] + " to " + range[1]);
            for (let i = range[0]; i <= range[1]; ++i)
            {
                if ( i < begin || i > end)
                {
                    this.destroyItem(i);
                }
            }

            // create current items
            let itemPos = this.positionOf(begin);
            //console.log("itemPos of " + begin + ": " + itemPos);
            let newItemSize = 0;
            for (let i = begin; i <= end && i < model.size; ++i)
            {
                let item = null;
                if (d.get(this).itemMeta.at(i))
                {
                    // item exists already
                    item = d.get(this).itemMeta.at(i)[0];
                }
                else
                {
                    item = this.createItem(i);
                    if (! item)
                    {
                        break;
                    }
                    d.get(this).item.children[0].append(item.get());
                }
                if (newItemSize === 0)
                {
                    newItemSize = Math.max(item.bbox.height, newItemSize);
                }
                
                if (item.y !== itemPos)
                {
                    //console.log("position list item " + i + " at " + itemPos);
                    item.y = itemPos;
                }
                itemPos += newItemSize;
            }
            d.get(this).range = [begin, end];
            if (newItemSize !== 0 && d.get(this).itemSize !== newItemSize)
            {
                d.get(this).itemSize = newItemSize;
                //console.log("new item size: " + newItemSize);
            }
            //console.log("new range: " + JSON.stringify([begin, end]));

            this.updateContentSize();

            //console.log("sparsity: " + d.get(this).itemMeta.sparseLength);
        }

        positionViewAt(idx)
        {
            const pos = this.positionOf(idx);
            const itemSize = d.get(this).itemSize;
            const viewSize = this.bbox.height;
            if (pos + itemSize > this.contentY + this.bbox.height)
            {
                this.contentY = Math.max(0, pos + itemSize - viewSize);
            }
            else if (pos < this.contentY)
            {
                this.contentY = pos;
            }
        }

        get()
        {
            return d.get(this).item;
        }

    };

});
