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

shRequire([__dirname + "/object.js"], function (obj)
{
    const d = new WeakMap();

    /**
     * Class representing a list model of arbitrary data items.
     * 
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {any[]} data - The data items of the model.
     * @property {number} size - [readonly] The current amount of items in the model.
     */
    class ListModel extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                data: []
            });

            this.notifyable("data");
            this.notifyable("size");

            /**
             * Is triggered when the model was reset.
             * @event modelReset
             * @memberof mid.ListModel
             */
            this.registerEvent("modelReset");
            /**
             * Is triggered when data items were inserted.
             * @event modelInsert
             * @memberof mid.ListModel
             * @param {number} at - The position where the items where inserted at.
             * @param {number} n - The amount of items inserted.
             */
            this.registerEvent("modelInsert");
            /**
             * Is triggered when data items were removed.
             * @event modelRemove
             * @memberof mid.ListModel
             * @param {number} at - The position where the item was removed from.
             */
            this.registerEvent("modelRemove");
        }

        get data() { return d.get(this).data.slice(); }
        set data(dat)
        {
            this.reset(dat);
            this.dataChanged();
        }

        get size() { return d.get(this).data.length; }

        /**
         * Creates a sequence of numbers to be used for the `data` property.
         * 
         * @param {number} from - The starting number. 
         * @param {number} n - The amount of sequential numbers.
         * @returns {number[]} A sequence of numbers. 
         */
        sequence(from, n)
        {
            const arr = [];
            for (let i = from; i < from + n; ++i)
            {
                arr.push(i);
            }
            return arr;
        }

        /**
         * Resets the model with the given data items.
         * 
         * @param {any[]} data - The new data items.
         */
        reset(data)
        {
            d.get(this).data = data;
            this.sizeChanged();
            this.modelReset();
        }

        /**
         * Inserts a data item at the given position.
         * 
         * @param {number} at - The position to insert at.
         * @param {any} data - The data item.
         */
        insert(at, data)
        {
            //console.log("insert " + at + " " + JSON.stringify(data));
            const priv = d.get(this);
            if (at >= 0 && at <= priv.data.length)
            {
                priv.data.splice(at, 0, data);
                this.modelInsert(at, 1);
                this.sizeChanged();
            }
        }

        /**
         * Inserts a bulk of data items at the given position.
         * 
         * @param {number} at - The position to insert at.
         * @param {any[]} bulk - The bulk of data items.
         */
        bulkInsert(at, bulk)
        {
            //console.log("bulkInsert " + at + " " + JSON.stringify(bulk));
            const priv = d.get(this);
            if (at >= 0 && at <= priv.data.length)
            {
                const data = priv.data;
                priv.data = data.slice(0, at).concat(bulk).concat(priv.data.slice(at));
                this.modelInsert(at, bulk.length);
                this.sizeChanged();
            }
        }

        /**
         * Removes the data item at the given position.
         * 
         * @param {number} at - The position to remove from.
         */
        remove(at)
        {
            if (at >= 0 && at < d.get(this).data.length)
            {
                d.get(this).data.splice(at, 1);
                this.sizeChanged();
                this.modelRemove(at);
            }
        }

        /**
         * Returns the data item at the given position.
         * 
         * @param {number} n - The position.
         * @returns {any} The data item at that position.
         */
        at(n)
        {
            return d.get(this).data[n];
        }

    }
    exports.ListModel = ListModel;
 
 
});