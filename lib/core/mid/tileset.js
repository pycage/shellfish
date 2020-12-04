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

shRequire([__dirname + "/object.js"], (obj) =>
{
    const d = new WeakMap();

    exports.TileSet = class TileSet extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                source: "",
                status: "empty",
                tileSize: 32,
                gpu: false,
                image: new Image(),
                gpuImage: null,
                data: null,
                nullTile: null,
                aliasMap: new Map()
            });

            this.notifyable("gpu");
            this.notifyable("source");
            this.notifyable("status");
            this.notifyable("tileSize");

            this.registerEvent("invalidate");

            d.get(this).image.onload = () =>
            {
                const priv = d.get(this);
                const tmpCnv = document.createElement("canvas");
                tmpCnv.width = priv.image.width;
                tmpCnv.height = priv.image.height;
                const ctx = tmpCnv.getContext("2d");
                ctx.drawImage(priv.image, 0, 0);
                const imageData = ctx.getImageData(0, 0, tmpCnv.width, tmpCnv.height);
                tmpCnv.remove();
                priv.data = new Uint8Array(new ArrayBuffer(imageData.data.length));
                priv.data.set(imageData.data, 0);

                if (priv.gpu)
                {
                    this.updateGpuImage(() =>
                    {
                        priv.status = "success";
                        this.statusChanged();
                    });
                }
                else
                {
                    priv.status = "success";
                    this.statusChanged();
                }
            };

            d.get(this).image.onerror = () =>
            {
                d.get(this).status = "error";
                this.statusChanged();
            };

            this.updateNullTile();
        }

        get status() { return d.get(this).status; }

        get source() { return d.get(this).source; }
        set source(s)
        {            
            d.get(this).source = s;
            this.sourceChanged();
            
            d.get(this).status = "loading";
            this.statusChanged();
         
            d.get(this).image.src = s;
        }

        get tileSize() { return d.get(this).tileSize; }
        set tileSize(s)
        {
            d.get(this).tileSize = s;
            this.tileSizeChanged();

            this.updateNullTile();
        }

        get gpu() { return d.get(this).gpu; }
        set gpu(v)
        {
            if (v && ! window.createImageBitmap /* Hello, Safari! */)
            {
                console.warn("This environment does not support GPU-based tiles. Falling back to CPU-based implementation.");
                v = false;
            }

            d.get(this).gpu = v;
            this.gpuChanged();

            if (v)
            {
                this.updateGpuImage();
            }
            else
            {
                d.get(this).gpuImage = null;
            }
        }

        updateNullTile()
        {
            const priv = d.get(this);
            const buffer = new Uint8Array(new ArrayBuffer(priv.tileSize * priv.tileSize * 4));
            buffer.fill(0x0);            
            d.get(this).nullTile = buffer;
        }

        updateGpuImage(callback)
        {
            const priv = d.get(this);
            priv.gpuImage = null;

            if (! priv.image || priv.image.width * priv.image.height === 0)
            {
                return;
            }

            window.createImageBitmap(priv.image)
            .then(bitmap =>
            {
                console.log("updated GPU image");
                console.log(bitmap);
                priv.gpuImage = bitmap;
                if (callback)
                {
                    callback();
                }
            });
        }

        getTile(n)
        {
            const priv = d.get(this);

            const tileId = priv.aliasMap.has(n) ? priv.aliasMap.get(n)
                                                : n;

            if (priv.data && tileId >= 0)
            {
                const perRow = Math.floor(priv.image.width / priv.tileSize);
                const x = tileId % perRow;
                const y = Math.floor(tileId / perRow);
                //console.log("x " + x + ", y " + y + ", perRow " + perRow + ", n " + n);
                const begin = y * priv.tileSize * priv.image.width + x * priv.tileSize;
                const end = begin + priv.tileSize * priv.image.width;
                //console.log("getTile " + tileId + " @ " + x + ", " + y + JSON.stringify([begin * 4, end * 4, priv.image.width * 4]));
                
                // buffer, begin, end, rowStride
                return [tileId, priv.data, begin * 4, end * 4, priv.image.width * 4];
            }
            else
            {
                return [-1, priv.nullTile, 0, priv.nullTile.length, priv.tileSize * 4];
            }
        }

        getGpuTile(n)
        {
            const priv = d.get(this);

            const tileId = priv.aliasMap.has(n) ? priv.aliasMap.get(n)
                                                : n;


            if (tileId >= 0 && priv.gpuImage)
            {
                const perRow = Math.floor(priv.gpuImage.width / priv.tileSize);
                const x = tileId % perRow;
                const y = Math.floor(tileId / perRow);

                return [tileId, priv.gpuImage, x * priv.tileSize, y * priv.tileSize];
            }
            else
            {
                return [-1, null, 0, 0, 0];
            }
        }

        setAlias(n, to)
        {
            d.get(this).aliasMap.set(n, to);
            this.invalidate();
        }
    };
});