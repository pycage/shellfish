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

shRequire(["shellfish/core"], (core) =>
{
    const d = new WeakMap();

    /**
     * Class representing an image-based tile set for use on a tile map.
     * 
     * @extends core.Object
     * @memberof html
     * 
     * @property {bool} gpu - (default: `false`) Whether to store the image data on the GPU. This may not be supported by all environments.
     * @property {string} source - The image source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     * @property {number} tileSize - (default: `32`) The width and height of a single tile.
     */
    class TileSet extends core.Object
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
                data: null,
                gpuImage: null,
                aliasMap: new Map()
            });

            this.notifyable("gpu");
            this.notifyable("source");
            this.notifyable("status");
            this.notifyable("tileSize");

            /**
             * Is triggered when the tile set data changed.
             * @event invalidate
             * @memberof html.TileSet
             */
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
        }

        get status() { return d.get(this).status; }

        get source() { return d.get(this).source; }
        set source(s)
        {            
            d.get(this).source = s;
            this.sourceChanged();
            
            d.get(this).status = "loading";
            this.statusChanged();
         
            d.get(this).image.src = shRequire.resource(s);
        }

        get tileSize() { return d.get(this).tileSize; }
        set tileSize(s)
        {
            d.get(this).tileSize = s;
            this.tileSizeChanged();
        }

        get gpu() { return d.get(this).gpu; }
        set gpu(v)
        {
            if (v && ! window.createImageBitmap /* Hello, Safari! */)
            {
                this.log("", "warning", "This platform does not support GPU-based tiles. Falling back to CPU-based implementation.");
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
                priv.gpuImage = bitmap;
                if (callback)
                {
                    callback();
                }
            });
        }

        /**
         * Returns the tile for the given tile ID.
         * 
         * @param {number} n - The tile ID.
         * @return {object} The tile object, or the null tile if the tile does not exist.
         */
        getTile(n)
        {
            const priv = d.get(this);

            const tileId = priv.aliasMap.has(n) ? priv.aliasMap.get(n)
                                                : n;

            if (priv.gpu)
            {
                if (priv.gpuImage && tileId >= 0)
                {
                    const perRow = Math.floor(priv.gpuImage.width / priv.tileSize);
                    const x = tileId % perRow;
                    const y = Math.floor(tileId / perRow);
    
                    // [actual tile ID, image, x, y]
                    return [tileId, priv.gpuImage, x * priv.tileSize, y * priv.tileSize];
                }
                else
                {
                    return [-1, null, 0, 0];
                }
            }
            else
            {
                if (priv.data && tileId >= 0)
                {
                    const perRow = Math.floor(priv.image.width / priv.tileSize);
                    const x = tileId % perRow;
                    const y = Math.floor(tileId / perRow);

                    const begin = y * priv.tileSize * priv.image.width + x * priv.tileSize;
                    const end = begin + priv.tileSize * priv.image.width;
                    
                    // [actual tile ID, buffer, begin, end, rowStride]
                    return [tileId, priv.data, begin * 4, end * 4, priv.image.width * 4];
                }
                else
                {
                    return [-1, null, 0, 0, 0];
                }
            }
        }

        /**
         * Sets an alias for a tile ID, which will be looked up by `getTile`
         * instead. This can be used for animating tiles.
         * 
         * @param {number} n - A tile ID.
         * @param {number} to - The tile ID to use instead.
         */
        setAlias(n, to)
        {
            d.get(this).aliasMap.set(n, to);
            this.invalidate();
        }
    }
    exports.TileSet = TileSet;
});