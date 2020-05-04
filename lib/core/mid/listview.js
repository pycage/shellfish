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
                renderPending: false,
                indexOffset: 0,
                totalSize: 0,
                model: null,
                delegate: (modelData) => null,
                range: [0, 0],
                itemMeta: new SparseList(),
                itemsToDestroy: [],
                cellWidth: 64,
                cellHeight: 32,
                window: {
                    x: 0,
                    y: 0,
                    width: -1,
                    height: -1
                },
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

            this.notifyable("model");
            this.notifyable("cellWidth");
            this.notifyable("cellHeight");
            this.notifyable("windowX");
            this.notifyable("windowY");
            this.notifyable("windowWidth");
            this.notifyable("windowHeight");
            this.notifyable("count");

            d.get(this).item.addEventListener("scroll", () =>
            {
                this.contentXChanged();
                this.contentYChanged();
            }, { passive: true });
            
            this.onContentYChanged = () => this.render();
            this.onWindowYChanged = () => this.renderLater();
            this.onWindowHeightChanged = () => this.renderLater();
            this.onBboxChanged = () => { this.updateContentSize(); this.renderLater(); };
            this.onInitialization = () => { this.updateContentSize(); this.render(); };

            this.canFocus = true;
        }

        get windowX() { return d.get(this).window.x; }
        set windowX(x)
        {
            d.get(this).window.x = x;
            this.windowXChanged();
        }

        get windowY() { return d.get(this).window.y; }
        set windowY(y)
        {
            d.get(this).window.y = y;
            this.windowYChanged();
        }

        get windowWidth() { return d.get(this).window.width; }
        set windowWidth(w)
        {
            d.get(this).window.width = w;
            this.windowWidthChanged();
        }

        get windowHeight() { return d.get(this).window.height; }
        set windowHeight(h)
        {
            d.get(this).window.height = h;
            this.windowHeightChanged();
        }

        get count() { return d.get(this).model.size || 0; }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);

            // clear old content
            let range = priv.range;
            for (let i = range[0]; i <= range[1]; ++i)
            {
                this.destroyItem(i);
            }
            range[0] = 0;
            range[1] = 0;
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
            priv.itemMeta.clear();
            priv.model = mObj;
            mObj.connect("modelReset", this, () =>
            {
                //console.log("model reset");
                let range = priv.range;
                for (let i = range[0]; i <= range[1]; ++i)
                {
                    this.destroyItem(i);
                }
                range[0] = 0;
                range[1] = 0;
                priv.itemMeta.clear();
                this.render();
                this.updateContentSize();
                this.countChanged();
            });
            mObj.connect("modelInsert", this, (at, size) =>
            {
                //console.log("model insert at " + at + ", size: " + size);
                const range = priv.range;
                for (let i = 0; i < size; ++i)
                {
                    priv.itemMeta.insertBefore(at, undefined);
                }
                //console.log("insert item before " + at + ", range " + JSON.stringify(range));
                if (at + size < range[1] || at >= priv.itemMeta.length)
                {
                    // the index of the following alive items increases
                    for (let i = at + size; i <= range[1]; ++i)
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
                let range = priv.range;
                //console.log("range before remove: " + JSON.stringify(range));
                if (range[1] > 0)
                {
                    --range[1];
                }
                this.destroyItem(at);
                priv.itemMeta.removeAt(at);
                //console.log("range after remove: " + JSON.stringify(d.get(that).range));
                if (at <= range[1])
                {
                    // the index of the following alive items decreases
                    for (let i = at; i <= range[1]; ++i)
                    {
                        this.updateItem(i);
                    }
                    this.render();
                }
                else
                {
                    this.updateContentSize();
                }
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
            this.render();
            this.updateContentSize();
        }

        get cellHeight() { return d.get(this).cellHeight; }
        set cellHeight(h)
        {
            d.get(this).cellHeight = h;
            this.cellHeightChanged();
            this.render();
            this.updateContentSize();
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
                priv.itemsToDestroy.push(item);
            }
        }

        indexAt(y)
        {
            const priv = d.get(this);
            const perRow = Math.max(1, Math.floor(this.bbox.width / priv.cellWidth));
            const idx = Math.floor(y / priv.cellHeight) * perRow;
            return Math.max(0, Math.min(priv.model.size - 1, idx));
        }

        positionOf(idx)
        {
            const priv = d.get(this);
            const perRow = Math.max(1, Math.floor(this.bbox.width / priv.cellWidth));
            return [
                (idx % perRow) * priv.cellWidth,
                Math.floor(idx / perRow) * priv.cellHeight
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
            const totalSize = this.positionOf(model.size - 1)[1] + priv.cellHeight - 1;
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

        renderLater()
        {
            const priv = d.get(this);
            if (! priv.renderPending)
            {
                priv.renderPending = true;
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    priv.renderPending = false;
                    this.render();
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
            if (! model || ! delegate)
            {
                return;
            }

            const range = priv.range;
            const bbox = this.bbox;

            // the range that we want to render; this may be larger than the
            // visible range in order to prepare items before they get into view

            let y1 = this.contentY;
            let y2 = y1 + bbox.height;
            //console.log("visible content range: " + y1 + ", " + y2);

            y1 += this.windowY;
            if (this.windowHeight !== -1)
            {
                y2 = y1 + this.windowHeight;
            }
            //console.log("visible windowed range: " + y1 + ", " + y2);
            
            const begin = this.indexAt(y1 - cellHeight);
            const end = this.indexAt(y2 + cellHeight);
            //console.log("visible indices: " + begin + ", " + end);

            // remove items out of sight
            //console.log("removing in range " + range[0] + " to " + range[1]);
            let removeCount = 0;
            for (let i = range[0]; i <= range[1]; ++i)
            {
                if ( i < begin || i > end)
                {
                    this.destroyItem(i);
                    ++removeCount;
                }
            }

            // create current items
            let itemPos = this.positionOf(begin);
            //console.log("itemPos of " + begin + ": " + itemPos);
            let addCount = 0;
            const to = Math.min(Math.max(begin + 1, end), model.size - 1);
            //console.log("to: " + to + " model.size: " + model.size);
            for (let i = begin; i <= to /*Math.max(begin + 1, end) && i < model.size*/; ++i)
            {
                let item = null;
                if (d.get(this).itemMeta.at(i))
                {
                    // item exists already
                    item = priv.itemMeta.at(i);
                }
                else
                {
                    item = this.createItem(i);
                    if (! item)
                    {
                        break;
                    }
                    priv.item.children[0].appendChild(item.get());
                    item.init();
                    item.parent = this;
                    ++addCount;
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

                itemPos[0] += this.cellWidth;
                if (itemPos[0] > bbox.width - this.cellWidth)
                {
                    itemPos[0] = 0;
                    itemPos[1] += cellHeight;
                }

                if (addCount > 0 && new Date().getTime() - now > 1000 / 60)
                {
                    // we already took too long for this frame; continue next frame
                    this.renderLater();
                    break;
                }
            }
            priv.range = [begin, end];
            //console.log("new range: " + JSON.stringify([begin, end]));

            const itemsToDestroy = priv.itemsToDestroy.slice();
            priv.itemsToDestroy = [];
            
            const handle = low.addFrameHandler(() =>
            {
                handle.cancel();
                itemsToDestroy.forEach((item) => item.discard());
            });

            //console.log("removed : " + removeCount + ", added: " + addCount);
            //console.log("sparsity: " + d.get(this).itemMeta.sparseLength);
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

        get()
        {
            return d.get(this).item;
        }

    };

});
