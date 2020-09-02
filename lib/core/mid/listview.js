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

shRequire([__dirname + "/../low.js", __dirname + "/item.js", __dirname + "/listmodel.js"], function (low, item, listModel)
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

        forEach(f)
        {
            this.ranges.forEach(function (r)
            {
                let idx = r[0];
                r[1].forEach((item) =>
                {
                    f(item, idx);
                    ++idx;
                });
            });
        }
    }


    const d = new WeakMap();

    /**
     * Class representing a list or grid view fed from a model.
     * @extends mid.Item
     * @memberof mid
     */
    exports.ListView = class ListView extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                renderHandle: null,
                indexOffset: 0,
                totalSize: 0,
                model: null,
                delegate: (modelData) => null,
                itemMeta: new SparseList(),
                cellWidth: 64,
                cellHeight: 32,
                cacheMargin: 0,
                itemsPerRow: 0,
                windowRange: [0, 0],
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
                        //.style("background-color", "red")
                    )
                    .html()
                )
            });

            this.notifyable("cacheMargin");
            this.notifyable("count");
            this.notifyable("cellHeight");
            this.notifyable("cellWidth");
            this.notifyable("model");
            this.notifyable("scrollbars");

            d.get(this).item.addEventListener("scroll", () =>
            {
                this.contentXChanged();
                this.contentYChanged();
                this.updateLayout();
            }, { passive: true });
            
            this.onContentYChanged = () => this.updateLayout();
            this.onCellWidthChanged = () => this.updateLayout();
            this.onCellHeightChanged = () => this.updateLayout();
            this.onBboxChanged = () =>
            {
                this.updateContentSize();
                this.updateLayout();
            };

            this.canFocus = true;
        }

        get contentHeight() { return d.get(this).totalSize; }

        get cacheMargin() { return d.get(this).cacheMargin; }
        set cacheMargin(c)
        {
            d.get(this).cacheMargin = c;
            this.cacheMarginChanged();
            this.updateLayout();
        }

        get scrollbars() { return d.get(this).scrollbars; }
        set scrollbars(value)
        {
            d.get(this).scrollbars = value;
            if (value)
            {
                d.get(this).item.classList.remove("sh-no-scrollbars");
            }
            else
            {
                d.get(this).item.classList.add("sh-no-scrollbars");
            }
            this.scrollbarsChanged();
        }

        get count() { return d.get(this).model.size || 0; }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);

            // clear old content
            const toDestroy = [];
            priv.itemMeta.forEach((item, idx) =>
            {
                toDestroy.push(idx);
            });
            toDestroy.forEach((idx) =>
            {
                this.destroyItem(idx);
            });
            priv.itemMeta.clear();

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
            }

            //console.log("got model:");
            //console.log(m);
            priv.model = mObj;
            mObj.connect("modelReset", this, () =>
            {
                //console.log("model reset");
                const toDestroy = [];
                priv.itemMeta.forEach((item, idx) =>
                {
                    toDestroy.push(idx);
                });
                toDestroy.forEach((idx) =>
                {
                    this.destroyItem(idx);
                });
                priv.itemMeta.clear();
                this.render();
                this.updateContentSize();
                this.countChanged();
            });
            mObj.connect("modelInsert", this, (at, size) =>
            {
                //console.log("model insert at " + at + ", size: " + size);
                const windowRange = priv.windowRange;
                for (let i = 0; i < size; ++i)
                {
                    priv.itemMeta.insertBefore(at, undefined);
                }
                //console.log("insert item before " + at + ", range " + JSON.stringify(range));
                if (at + size < windowRange[1] || at >= priv.itemMeta.length)
                {
                    // the index of the following alive items increases
                    for (let i = at + size; i <= windowRange[1]; ++i)
                    {
                        this.updateItem(i);
                    }
                }
                this.render();
                this.updateContentSize();
                this.countChanged();
            });
            mObj.connect("modelRemove", this, (at) =>
            {
                let windowRange = priv.windowRange;
                //console.log("remove at " + at);
                //console.log("range before remove: " + JSON.stringify(range));
                this.destroyItem(at);
                priv.itemMeta.removeAt(at);
                if (at <= windowRange[1])
                {
                    // the index of the following alive items decreases
                    priv.itemMeta.forEach((item, idx) =>
                    {
                        if (idx >= at)
                        {
                            this.updateItem(idx);
                        }
                    });
                    this.render();
                }
                this.updateContentSize();
                this.countChanged();
            });

            this.render();
            this.updateContentSize();
            this.modelChanged();
            this.countChanged();
        }

        get delegate() { return d.get(this).delegate; }
        set delegate(del)
        {
            d.get(this).delegate = del;
            this.render();
        }

        get cellWidth() { return d.get(this).cellWidth; }
        set cellWidth(w)
        {
            d.get(this).cellWidth = w;
            this.cellWidthChanged();
            this.updateContentSize();
            this.updateLayout();
        }

        get cellHeight() { return d.get(this).cellHeight; }
        set cellHeight(h)
        {
            d.get(this).cellHeight = h;
            this.cellHeightChanged();
            this.updateContentSize();
            this.updateLayout();
        }

        updateLayout()
        {
            const priv = d.get(this);

            const bbox = this.bbox;
            const cellWidth = priv.cellWidth;
            const cellHeight = priv.cellHeight;

            priv.itemsPerRow = cellWidth > 0 ? Math.max(1, Math.floor(bbox.width / cellWidth))
                                             : 0;

            const y1 = this.contentY - priv.cacheMargin;
            const y2 = y1 + bbox.height + 2 * priv.cacheMargin;
            
            const begin = this.indexAt(y1 - cellHeight);
            const end = this.indexAt(y2 + cellHeight);

            let willRender = false;

            if (begin !== priv.windowRange[0])
            {
                priv.windowRange[0] = begin;
                willRender = true;
            }
            if (end !== priv.windowRange[1])
            {
                priv.windowRange[1] = end;
                willRender = true;
            }

            if (willRender && this.delegate && this.model && priv.itemsPerRow > 0)
            {
                //console.log("window content range: " + priv.windowRange[0] + ", " + priv.windowRange[1]);
                this.render();
            }
        }

        createItem(idx)
        {
            //console.log("create item " + idx);
            const priv = d.get(this);
            let modelData = {
                index: idx,
                value: priv.model.at(idx)
            };
            const item = priv.delegate(modelData);
            if (item)
            {
                item.position = "free";
                item.width = priv.cellWidth;
                item.height = priv.cellHeight;
                priv.itemMeta.set(idx, item);
            }
            
            return item;
        }

        updateItem(idx)
        {
            //console.log("update item " + idx);
            const priv = d.get(this);
            let modelData = {
                index: idx,
                value: priv.model.at(idx)
            };
            if (modelData.value !== undefined)
            {
                let item = priv.itemMeta.at(idx);
                if (item)
                {
                    item.dataChange(modelData);
                }
            }
            //console.log("updated " + idx);
        }

        destroyItem(idx)
        {
            //console.log("destroy item " + idx);
            const priv = d.get(this);
            let item = priv.itemMeta.at(idx);
            if (item)
            {
                priv.itemMeta.set(idx, undefined);
                item.discard();
            }
        }

        indexAt(y)
        {
            const priv = d.get(this);
            const idx = Math.floor(y / priv.cellHeight) * priv.itemsPerRow;
            return idx;
        }

        positionOf(idx)
        {
            const priv = d.get(this);
            return [
                (idx % priv.itemsPerRow) * priv.cellWidth,
                Math.floor(idx / priv.itemsPerRow) * priv.cellHeight
            ];
        }

        updateContentSize()
        {
            const priv = d.get(this);
            const model = priv.model;
            if (! model)
            {
                return;
            }
            const totalSize = this.positionOf(model.size - 1)[1] + priv.cellHeight;
            //console.log("totalSize: " + totalSize + " model.size: " + model.size);
            if (totalSize !== priv.totalSize)
            {
                priv.totalSize = totalSize;
                low.css(priv.item.children[1], "top", (totalSize - 1) + "px");

                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.contentXChanged();
                    this.contentYChanged();
                    this.contentWidthChanged();
                    this.contentHeightChanged();
                });
            }
        }

        render()
        {
            const now = new Date().getTime();

            const priv = d.get(this);
            const model = priv.model;
            const delegate = priv.delegate;
            const cellHeight = priv.cellHeight;

            if (priv.renderHandle)
            {
                //console.log("cancel render");
                priv.renderHandle.cancel();
                priv.renderHandle = null;
            }

            if (! model || ! delegate || this.lifeCycleStatus !== "initialized")
            {
                return;
            }

            //console.log("render");

            const bbox = this.bbox;

            // remove items out of sight
            let removeCount = 0;
            const toDestroy = [];
            priv.itemMeta.forEach((item, idx) =>
            {
                if (item && idx < priv.windowRange[0] || idx > priv.windowRange[1])
                {
                    toDestroy.push(idx);
                }
            });
            toDestroy.forEach((idx) =>
            {
                this.destroyItem(idx);
                ++removeCount;
            });

            const beginIndex = Math.max(0, priv.windowRange[0]);
            const endIndex = Math.min(model.size - 1, priv.windowRange[1]);

            //console.log("begin index: " + beginIndex + ", end index: " + endIndex);

            // create current items
            let itemPos = this.positionOf(beginIndex);
            //console.log("itemPos of " + beginIndex + ": " + itemPos);
            let addCount = 0;
            const items = [];
            for (let i = beginIndex; i <= endIndex; ++i)
            {
                const dist = Math.abs(itemPos[1] - this.contentY + bbox.height / 2);

                /*
                const onScreen = itemPos[1] < this.contentY + bbox.height &&
                                 itemPos[1] >= this.contentY - this.cellHeight;
                */

                items.push([i, itemPos.slice(), dist]);

                itemPos[0] += this.cellWidth;
                if (itemPos[0] > bbox.width - this.cellWidth)
                {
                    itemPos[0] = 0;
                    itemPos[1] += cellHeight;
                }
            }

            // sort to render items next to the screen first
            items.sort((a, b) =>
            {
                const aDist = a[2];
                const bDist = b[2];

                return aDist < bDist ? -1 : 1;
            });
           
            this.renderItems(items);

            //console.log("new range: " + JSON.stringify([beginIndex, endIndex]));

            //console.log("removed : " + removeCount + ", added: " + addCount);
            //console.log("sparsity: " + d.get(this).itemMeta.sparseLength);
        }

        renderItems(items)
        {
            const now = new Date().getTime();
            const bbox = this.bbox;
            const priv = d.get(this);

            //console.log("render " + items.length + " items " + JSON.stringify(bbox));
            for (let n = 0; n < items.length; ++n)
            {
                let item = null;
                const lastIndex = items[n][0];
                const itemPos = items[n][1];
                const dist = items[n][2];

                if (priv.itemMeta.at(lastIndex))
                {
                    // item exists already
                    //console.log("item exists already: " + lastIndex);
                    item = priv.itemMeta.at(lastIndex);
                }
                else
                {
                    item = this.createItem(lastIndex);
                    if (! item)
                    {
                        break;
                    }
                    priv.item.children[0].appendChild(item.get());
                    item.parent = this;
                }

                if (item.x !== itemPos[0])
                {
                    item.x = itemPos[0];
                    //console.log("x changed");
                }
                if (item.y !== itemPos[1])
                {
                    item.y = itemPos[1];
                    //console.log("y changed");
                }
                if (item.width !== this.cellWidth)
                {
                    item.width = this.cellWidth;
                    //console.log("width changed");
                }
                if (item.height !== this.cellHeight)
                {
                    item.height = this.cellHeight;
                    //console.log("height changed");
                }

                if (dist > bbox.height / 2 && new Date().getTime() - now > 1000 / 60)
                {
                    //console.log("later");
                    const remainingItems = items.slice(n + 1);
                    const handle = window.setTimeout(() =>
                    {
                        priv.renderHandle = null;
                        this.renderItems(remainingItems);
                    }, 20);
                    priv.renderHandle = {
                        cancel: () => { window.clearTimeout(handle); priv.renderHandle = null; }
                    };
                    break;
                }
            }
        }

        positionViewAt(idx)
        {
            const pos = this.positionOf(idx)[1];
            const cellHeight = d.get(this).cellHeight;
            const viewSize = this.bbox.height;

            if (pos + cellHeight > this.contentY + viewSize)
            {
                this.contentY = Math.max(0, pos + cellHeight - viewSize);
            }
            else if (pos < this.contentY)
            {
                this.contentY = pos;
            }
        }

        containerOf(child)
        {
            return d.get(this).item.children[0];
        }

        get()
        {
            return d.get(this).item;
        }

    };

});
