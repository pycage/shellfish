/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2021 Martin Grimme <martin.grimme@gmail.com>

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
                bboxWidth: 0,
                bboxHeight: 0,
                renderHandle: null,
                shallRenderAgain: false,
                indexOffset: 0,
                totalSize: 0,
                model: null,
                delegate: (modelData) => null,
                itemMeta: new SparseList(),
                orientation: "vertical",
                cellWidth: 64,
                cellHeight: 32,
                cacheMargin: 0,
                itemsPerRow: 0,
                windowRange: [-1, -1],
                recycleBin: [],
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
            this.notifyable("orientation");
            this.notifyable("scrollbars");

            this.onContentXChanged = () => this.updateLayout(false);
            this.onContentYChanged = () => this.updateLayout(false);
            this.onCellWidthChanged = () => window.setTimeout(() => this.updateLayout(true), 0);
            this.onCellHeightChanged = () => window.setTimeout(() => this.updateLayout(true), 0);
            this.onBboxChanged = () => {
                const b = this.bbox;
                if (d.get(this).bboxWidth !== b.width || d.get(this).bboxHeight !== b.height)
                {
                    //console.log("bbox changed: " + b.width + " x " + b.height);
                    d.get(this).bboxWidth = b.width;
                    d.get(this).bboxHeight = b.height;

                    const f = () => this.updateLayout(false);
                    window.setTimeout(f, 0);
                }
            };

            this.canFocus = true;
        }

        get orientation() { return d.get(this).orientation; }
        set orientation(o)
        {
            d.get(this).orientation = o;
            this.orientationChanged();
            this.updateLayout(false);
        }

        get cacheMargin() { return d.get(this).cacheMargin; }
        set cacheMargin(c)
        {
            d.get(this).cacheMargin = c;
            this.cacheMarginChanged();
            this.updateLayout(false);
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

        get count() { return !! d.get(this).model ? d.get(this).model.size : 0; }

        get model() { return d.get(this).model; }
        set model(m)
        {
            console.log("set model");
            const priv = d.get(this);

            // clear old content
            const toDestroy = [];
            priv.itemMeta.forEach((item, idx) =>
            {
                toDestroy.push(idx);
            });
            toDestroy
            .sort((a, b) => b < a ? -1 : 1)
            .forEach((idx) =>
            {
                this.destroyItem(idx);
            });
            this.dumpRecycleBin();
            priv.windowRange = [-1, -1];

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

            //console.log("got model:");
            //console.log(m);
            priv.model = mObj;
            if (mObj)
            {
                mObj.referenceAdd(this);
                mObj.connect("modelReset", this, () =>
                {
                    console.log("model reset");
                    if (priv.renderHandle)
                    {
                        priv.renderHandle.cancel();
                        priv.renderHandle = null;
                    }

                    const toDestroy = [];
                    priv.itemMeta.forEach((item, idx) =>
                    {
                        toDestroy.push(idx);
                    });
                    toDestroy
                    .sort((a, b) => b < a ? -1 : 1)
                    .forEach((idx) =>
                    {
                        this.destroyItem(idx);
                    });
                    priv.windowRange = [-1, -1];
                    this.dumpRecycleBin();
                    this.updateLayout(false)
                    this.countChanged();
                });
                mObj.connect("modelInsert", this, (at, size) =>
                {
                    console.log("model insert at " + at + ", size: " + size);
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
                    this.updateLayout(false);
                    this.countChanged();
                });
                mObj.connect("modelRemove", this, (at) =>
                {
                    console.log("model remove at " + at);
                    if (priv.renderHandle)
                    {
                        priv.renderHandle.cancel();
                        priv.renderHandle = null;
                    }
                    
                    let windowRange = priv.windowRange.slice();
                    this.destroyItem(at);
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
                    this.updateLayout(false);
                    this.countChanged();
                });
            }

            this.updateLayout(false);
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
        }

        get cellHeight() { return d.get(this).cellHeight; }
        set cellHeight(h)
        {
            d.get(this).cellHeight = h;
            this.cellHeightChanged();
        }

        updateLayout(force)
        {
            const priv = d.get(this);

            if (! priv.model)
            {
                return;
            }

            const bbox = this.bbox;
            const cellWidth = priv.cellWidth;
            const cellHeight = priv.cellHeight;
            const modelSize = priv.model.size;

            let willRender = force;

            let itemsPerRow = 0;
            let totalSize = 0;
            let begin = 0;
            let end = 0;

            if (priv.orientation === "vertical")
            {
                itemsPerRow = cellWidth > 0 ? Math.max(1, Math.floor(bbox.width / cellWidth))
                                            : 0;
            }
            else
            {
                itemsPerRow = cellHeight > 0 ? Math.max(1, Math.floor(bbox.height / cellHeight))
                                             : 0;
            }

            if (itemsPerRow !== priv.itemsPerRow)
            {
                console.log("itemsPerRowChanged: " + priv.itemsPerRow + " -> " + itemsPerRow);
                priv.itemsPerRow = itemsPerRow;

                willRender = true;
            }

            if (priv.orientation === "vertical")
            {
                totalSize = modelSize > 0 ? this.positionOf(modelSize - 1)[1] + cellHeight
                                          : 0;

                const y1 = this.contentY - priv.cacheMargin;
                const y2 = y1 + bbox.height + 2 * priv.cacheMargin;
                
                begin = this.indexAt(0, y1 - cellHeight);
                end = this.indexAt(0, y2 + cellHeight);
            }
            else
            {
                totalSize = modelSize > 0 ? this.positionOf(modelSize - 1)[0] + cellWidth
                                          : 0;

                const x1 = this.contentX - priv.cacheMargin;
                const x2 = x1 + bbox.width + 2 * priv.cacheMargin;
                
                begin = this.indexAt(x1 - cellWidth, 0);
                end = this.indexAt(x2 + cellWidth, 0);
            }

            begin = Math.max(0, Math.min(modelSize - 1, begin));
            end = Math.max(0, Math.min(modelSize - 1, end));

            if (totalSize !== priv.totalSize)
            {
                console.log("totalSizeChanged: " + priv.totalSize + " -> " + totalSize);
                priv.totalSize = totalSize;
                if (priv.orientation === "vertical")
                {
                    low.css(priv.item.children[1], "top", (totalSize - 1) + "px");
                    low.css(priv.item.children[1], "left", "0");
                }
                else
                {
                    low.css(priv.item.children[1], "top", "0");
                    low.css(priv.item.children[1], "left", (totalSize - 1) + "px");
                }

                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.contentXChanged();
                    this.contentYChanged();
                    this.contentWidthChanged();
                    this.contentHeightChanged();
                }, this.objectType + "@" + this.objectLocation);
                willRender = true;
            }

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

        dumpRecycleBin()
        {
            const priv = d.get(this);
            priv.recycleBin.forEach((item) =>
            {
                item.parent = null;
            });
            priv.recycleBin = [];
        }

        createItem(idx)
        {
            const priv = d.get(this);
            let modelData = {
                index: idx,
                value: priv.model.at(idx)
            };

            let item = null;
            if (priv.recycleBin.length > 0)
            {
                //console.log("recycle item for " + idx);
                item = priv.recycleBin.pop();
                item.dataChange(modelData);
            }
            else
            {
                //console.log("create item for " + idx);
                item = priv.delegate(modelData);
            }
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

        suspendItem(idx)
        {
            //console.log("suspend item " + idx);
            const priv = d.get(this);
            let item = priv.itemMeta.at(idx);
            if (item)
            {
                priv.itemMeta.set(idx, undefined);
                priv.recycleBin.push(item);
                item.x = -priv.cellWidth;
                item.y = 0;
            }
        }

        destroyItem(idx)
        {
            //console.log("destroy item " + idx);
            const priv = d.get(this);
            let item = priv.itemMeta.at(idx);
            if (item)
            {
                priv.itemMeta.removeAt(idx);
                priv.recycleBin.push(item);
                item.x = -priv.cellWidth;
                item.y = 0;
            }
        }

        indexAt(x, y)
        {
            const priv = d.get(this);
            if (priv.cellWidth === 0 || priv.cellHeight === 0)
            {
                return 0;
            }

            let idx = 0;
            if (priv.orientation === "vertical")
            {
                idx = Math.floor(y / priv.cellHeight) * priv.itemsPerRow +
                      Math.floor(x / priv.cellWidth);
            }
            else
            {
                idx = Math.floor(x / priv.cellWidth) * priv.itemsPerRow +
                      Math.floor(y / priv.cellHeight);
            }
            return idx;
        }

        positionOf(idx)
        {
            const priv = d.get(this);
            if (idx < 0 || priv.itemsPerRow === 0)
            {
                return [0, 0];
            }

            if (priv.orientation === "vertical")
            {
                return [
                    (idx % priv.itemsPerRow) * priv.cellWidth,
                    Math.floor(idx / priv.itemsPerRow) * priv.cellHeight
                ];
            }
            else
            {
                return [
                    Math.floor(idx / priv.itemsPerRow) * priv.cellWidth,
                    (idx % priv.itemsPerRow) * priv.cellHeight
                ];
            }
        }

        render()
        {
            this.withoutSizing(() =>
            {
                this.doRender();
            });
        }

        doRender()
        {
            const now = Date.now();

            const priv = d.get(this);
            const model = priv.model;
            const bbox = this.bbox;
            const delegate = priv.delegate;
            const cellWidth = priv.cellWidth;
            const cellHeight = priv.cellHeight;

            if (priv.renderHandle)
            {
                priv.shallRenderAgain = true;
                return;
            }

            if (! model || ! delegate || this.lifeCycleStatus !== "initialized" || (bbox.width === 0 && bbox.height === 0))
            {
                return;
            }

            //console.log("render");

            // remove items out of sight
            let removeCount = 0;
            priv.itemMeta.forEach((item, idx) =>
            {
                if (item && idx < priv.windowRange[0] || idx > priv.windowRange[1])
                {
                    this.suspendItem(idx);
                    ++removeCount;
                }
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
                if (priv.orientation === "vertical")
                {
                    const dist = Math.abs(itemPos[1] - (this.contentY + bbox.height / 2));
                    items.push([i, itemPos.slice(), dist]);
    
                    itemPos[0] += cellWidth;
                    if (itemPos[0] > bbox.width - cellWidth)
                    {
                        itemPos[0] = 0;
                        itemPos[1] += cellHeight;
                    }
                }
                else
                {
                    const dist = Math.abs(itemPos[0] - (this.contentX + bbox.width / 2));
                    items.push([i, itemPos.slice(), dist]);
    
                    itemPos[1] += cellHeight;
                    if (itemPos[1] > bbox.height - cellHeight)
                    {
                        itemPos[1] = 0;
                        itemPos[0] += cellWidth;
                    }
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
            const now = Date.now();
            const bbox = this.bbox;
            const priv = d.get(this);

            //console.log("render " + items.length + " items " + JSON.stringify(bbox));
            //console.log("itemsPerRow: " + priv.itemsPerRow);
            for (let n = 0; n < items.length; ++n)
            {
                if (priv.shallRenderAgain)
                {
                    break;
                }

                let item = null;
                const lastIndex = items[n][0];
                const itemPos = items[n][1];
                const dist = items[n][2];

                let isNew = false;
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
                    if (! item.parent)
                    {
                        priv.item.children[0].appendChild(item.get());
                        item.parent = this;
                    }
                    isNew = true;
                }

                if (item.x !== itemPos[0])
                {
                    item.x = itemPos[0];
                    //console.log("x changed: " + item.x);
                }
                if (item.y !== itemPos[1])
                {
                    item.y = itemPos[1];
                    //console.log("y changed: " + item.y);
                }
                if (item.width !== priv.cellWidth)
                {
                    item.width = priv.cellWidth;
                    //console.log("width changed: " + item.width);
                }
                if (item.height !== priv.cellHeight)
                {
                    item.height = priv.cellHeight;
                    //console.log("height changed: " + item.height);
                }

                let distExceeded = false;
                if (priv.orientation === "vertical")
                {
                    distExceeded = dist > bbox.height / 2;
                }
                else
                {
                    distExceeded = dist > bbox.width / 2;
                }
                if (distExceeded && Date.now() - now > 1000 / 30)
                {
                    const remainingItems = items.slice(n + 1);
                    //console.log("later, remaining: " + remainingItems.length);
                    const handle = window.setTimeout(() =>
                    {
                        priv.renderHandle = null;
                        this.withoutSizing(() =>
                        {
                            this.renderItems(remainingItems);
                        });
                    }, 20);
                    priv.renderHandle = {
                        cancel: () => { window.clearTimeout(handle); priv.renderHandle = null; }
                    };
                    return;
                }
            }

            if (priv.shallRenderAgain)
            {
                priv.shallRenderAgain = false;
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.render();
                }, this.objectType + "@" + this.objectLocation);
            }
        }

        positionViewAt(idx)
        {
            const priv = d.get(this);
            const pos = this.positionOf(idx);
            
            if (priv.orientation === "vertical")
            {
                const viewSize = this.bbox.height;
                if (pos[1] + priv.cellHeight > this.contentY + viewSize)
                {
                    this.contentY = Math.max(0, pos[1] + priv.cellHeight - viewSize);
                }
                else if (pos[1] < this.contentY)
                {
                    this.contentY = pos[1];
                }
            }
            else
            {
                const viewSize = this.bbox.width;
                if (pos[0] + priv.cellWidth > this.contentX + viewSize)
                {
                    this.contentX = Math.max(0, pos[0] + priv.cellWidth - viewSize);
                }
                else if (pos[0] < this.contentX)
                {
                    this.contentX = pos[0];
                }
            }         
        }

        get()
        {
            return d.get(this).item;
        }

    };

});
