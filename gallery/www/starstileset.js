/*******************************************************************************
This file is part of the Shellfish UI toolkit examples.
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

shRequire(["shellfish/core"], (core) =>
{
    const d = new WeakMap();

    exports.StarsTileSet = class StarsTileSet extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                canvas: null,
                ctx: null
            });

            this.notifyable("tileSize");
            this.registerEvent("invalidate");

            const priv = d.get(this);
            priv.canvas = document.createElement("canvas");
            priv.canvas.width = 32 * 100;
            priv.canvas.height = 32 * 20;
            priv.ctx = priv.canvas.getContext("2d");
            priv.ctx.imageSmoothingEnabled = false;

            this.onDestruction = () =>
            {
                priv.canvas.remove();
            };
        }

        get tileSize() { return 32; }
        get gpu() { return true; }

        generate(from, to)
        {
            //console.log("generating tiles " + from + " to " + to);
            
            const priv = d.get(this);
            for (let i = from; i <= to; ++i)
            {
                // GPU
                const y = Math.floor(i / 100);
                const x = i % 100;

                priv.ctx.fillStyle = i < 1000 ? "#606060" : "#ffffff";
                priv.ctx.clearRect(x * 32, y * 32, 32, 32);

                for (let n = 0; n < Math.ceil(3 * Math.random()); ++n)
                {
                    const r = Math.max(1, Math.ceil(3 * Math.random()));
                    priv.ctx.fillRect(x * 32 + Math.random() * (32 - r), y * 32 + Math.random() * (32 - r), r, r);
                }
            }
        }

        getTile(n)
        {
            const priv = d.get(this);

            const y = Math.floor(n / 100);
            const x = n % 100;
            return [n, priv.canvas, x * 32, y * 32];
        }
    };
});