/*******************************************************************************
This file is part of Shellfish.
Copyright (c) 2022 Martin Grimme <martin.grimme@gmail.com>

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

exports.__id = "shellfish/core/warehouse";

/**
 * Class for pre-producing items in the background and keeping them in stock
 * for quick delivery.
 */
class Warehouse
{
    constructor(factoryFunction, capacity)
    {
        this.factoryFunction = factoryFunction;
        this.capacity = capacity;
        this.storage = new Map(); // type -> list of items
        this.inProduction = new Map(); // type -> bool
    }

    clear(type)
    {
        this.storage.set(type, []);
    }

    retrieve(type)
    {
        if (! this.storage.has(type))
        {
            this.storage.set(type, []);
            this.inProduction.set(type, false);
        }

        const stock = this.storage.get(type);
        if (stock.length === 0)
        {
            this.produce(type);
        }
        if (stock.length < this.capacity && ! this.inProduction.get(type))
        {
            this.inProduction.set(type, true);
            setTimeout(() => { this.fillStock(type); }, 30);
        }
        return stock.pop();
    }

    produce(type)
    {
        const item = this.factoryFunction(type);
        this.storage.get(type).push(item);
    }

    fillStock(type)
    {
        const stock = this.storage.get(type);
        if (stock.length < this.capacity)
        {
            this.produce(type);
            setTimeout(() => { this.fillStock(type); }, 30);
        }
        else
        {
            this.inProduction.set(type, false);
            console.log("Warehouse stock filled: " + stock.length);
        }
    }
}
exports.Warehouse = Warehouse;
