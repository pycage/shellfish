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

shRequire(["shellfish/low", __dirname + "/canvas.js"], function (low, cnv)
{
    const d = new WeakMap();

    /**
     * Class representing a scrollable tile map.
     * 
     * The tile map supports two modes of rendering tiles:
     * 
     *  * RAM to GPU: Tiles are copied from an image buffer in the RAM to
     *    the GPU in this mode.
     * 
     *  * GPU to GPU: Tiles are stored on the GPU and are copied
     *    internally on the GPU only, which results in less overhead and helps
     *    maintaining a higher frame rate. This mode, however, is not supported
     *    by all platforms.
     * 
     * The tile set implementation controls which mode to use.
     * 
     * @extends html.Canvas
     * @memberof html
     * 
     * @property {number} contentHeight - [readonly] The current scrolling viewport height.
     * @property {number} contentWidth - [readonly] The current scrolling viewport width.
     * @property {number} contentX - (default: `0`) The current horizontal scrolling position.
     * @property {number} contentY - (default: `0`) The current vertical scrolling position.
     * @property {number} contentColumn - [readonly] The current tiles column at `contentX`.
     * @property {number} contentRow - [readonly] The current tiles row at `contentY`.
     * @property {string} key - (default: `""`) The key of the tile type in the model items.
     * @property {html.ListModel} model - (default: `null`) The model of the map.
     * @property {number} rowStride - (default: `1`) The amount of tiles per row.
     * @property {html.TileSet} tileSet - (default: `null`) The tile set to use for rendering.
     */
    class TileMap extends cnv.Canvas
    {
        constructor()
        {
            super();
            d.set(this, {
                key: "",
                model: null,
                rowStride: 1,
                tileSet: null,
                contentX: 0,
                contentY: 0,
                contentWidth: 0,
                contentHeight: 0,
                contentColumn: 0,
                contentRow: 0,
                bufferX: 0,
                bufferY: 0,
                buffer: null,
                renderPending: false,
                currentLayout: new Map(),
                
                context: null,
                offscreenCanvas: low.createElementTree(
                    low.tag("canvas")
                    .attr("width", "100")
                    .attr("height", "100")
                    .html()
                ),
                offscreenContext: null
            });

            this.notifyable("contentColumn");
            this.notifyable("contentRow");
            this.notifyable("key");
            this.notifyable("model");
            this.notifyable("rowStride");
            this.notifyable("tileSet");

            this.onOriginalWidthChanged = () => this.invalidateBuffer();
            this.onOriginalHeightChanged = () => this.invalidateBuffer();

            this.onContentXChanged = () =>
            {
                const priv = d.get(this);
                if (! priv.tileSet || priv.contentWidth === 0)
                {
                    return;
                }

                let cx = priv.contentX;
                while (cx < 0)
                {
                    cx += priv.contentWidth;
                }
                const col = (priv.contentX / priv.tileSet.tileSize) | 0;
                if (col !== priv.contentColumn)
                {
                    priv.contentColumn = col;
                    this.contentColumnChanged();
                }
            };

            this.onContentYChanged = () =>
            {
                const priv = d.get(this);
                if (! priv.tileSet || priv.contentHeight === 0)
                {
                    return;
                }

                let cy = priv.contentY;
                while (cy < 0)
                {
                    cy += priv.contentHeight;
                }
                const row = (cy / priv.tileSet.tileSize) | 0;
                if (row !== priv.contentRow)
                {
                    priv.contentRow = row;
                    this.contentRowChanged();
                }
            };

            this.onDestruction = () =>
            {
                d.get(this).offscreenContext = null;
                d.get(this).offscreenCanvas.remove();
            }
        }

        get key() { return d.get(this).key; }
        set key(k)
        {
            d.get(this).key = k;
            this.keyChanged();
            this.renderLater();
        }

        get model() { return d.get(this).model; }
        set model(m)
        {
            const priv = d.get(this);
            if (priv.model)
            {
                // stop watching previous model
                priv.model.disconnect("modelReset", this);
                priv.model.disconnect("modelInsert", this);
                priv.model.disconnect("modelRemove", this);
                priv.model.referenceRemove(this);
            }
            d.get(this).model = m;
            if (m)
            {
                m.referenceAdd(this);
                m.connect("modelReset", this, () =>
                {
                    this.updateContentSize();
                    this.renderLater();
                });
                m.connect("modelInsert", this, (at, size) =>
                {
                    this.updateContentSize();
                    this.renderLater();
                });
                m.connect("modelRemove", this, (at) =>
                {
                    this.updateContentSize();
                    this.renderLater();
                });

            }
            this.updateContentSize();
            this.modelChanged();
        }

        get contentX() { return d.get(this).contentX; }
        set contentX(x)
        {
            const changed = Math.round(d.get(this).contentX) !== Math.round(x);

            d.get(this).contentX = Math.round(x);
            this.contentXChanged();
            if (changed)
            {
                this.renderLater();
            }
        }

        get contentY() { return d.get(this).contentY; }
        set contentY(y)
        {
            const changed = Math.round(d.get(this).contentY) !== Math.round(y);

            d.get(this).contentY = Math.round(y);
            this.contentYChanged();
            if (changed)
            {
                this.renderLater();
            }
        }

        get contentWidth() { return d.get(this).contentWidth; }
        get contentHeight() { return d.get(this).contentHeight; }

        get contentColumn() { return d.get(this).contentColumn; }
        get contentRow() { return d.get(this).contentRow; }

        get rowStride() { return d.get(this).rowStride; }
        set rowStride(r)
        {
            d.get(this).rowStride = r;
            this.rowStrideChanged();
            this.updateContentSize();
            this.renderLater();
        }

        get tileSet() { return d.get(this).tileSet; }
        set tileSet(s)
        {
            const priv = d.get(this);
            if (priv.tileSet)
            {
                // stop watching previous tile set
                priv.tileSet.disconnect("invalidate", this);
                priv.tileSet.referenceRemove(this);
            }
            d.get(this).tileSet = s;
            if (s)
            {
                s.referenceAdd(this);
                s.connect("invalidate", this, () =>
                {
                    this.renderLater();
                });
            }
            priv.currentLayout.clear();
            this.tileSetChanged();
            this.updateContentSize();
        }

        updateContentSize()
        {
            const priv = d.get(this);
            let newContentWidth = 0;
            let newContentHeight = 0;
            if (!! priv.tileSet && !! priv.model && priv.model.size > 0)
            {
                newContentWidth = priv.rowStride * priv.tileSet.tileSize;
                newContentHeight = Math.ceil(priv.model.size / priv.rowStride) * priv.tileSet.tileSize;
            }

            if (newContentWidth !== priv.contentWidth)
            {
                priv.contentWidth = newContentWidth;
                this.contentWidthChanged();
            }

            if (newContentHeight !== priv.contentHeight)
            {
                priv.contentHeight = newContentHeight;
                this.contentHeightChanged();
            }

        }

        invalidateBuffer()
        {
            d.get(this).buffer = null;
            d.get(this).currentLayout.clear();
            this.renderLater();
        }

        resizeBuffer()
        {
            const priv = d.get(this);
            if (! priv.tileSet)
            {
                return;
            }

            let w = this.originalWidth;
            let h = this.originalHeight;
            
            if (w * h > 0)
            {
                const tileSize = priv.tileSet.tileSize;

                // widen by one tile for scrolling
                w += tileSize;
                h += tileSize;

                priv.context = this.context2d;
                priv.context.imageSmoothingEnabled = false;
                priv.buffer = priv.context.createImageData(w, h);
                priv.offscreenCanvas.width = w;
                priv.offscreenCanvas.height = h;
                priv.offscreenContext = priv.offscreenCanvas.getContext("2d");
                priv.offscreenContext.imageSmoothingEnabled = false;
            }
        }

        putTile(tile, x, y, tileSize)
        {
            // for CPU-based rendering
            // copy from RAM to RAM

            //console.log("putTile " + x + ", " + y);
            const priv = d.get(this);
            const buffer = tile[1];
            const begin = tile[2];
            const end = tile[3];
            const rowStride = tile[4];
            
            const blockLength = x + tileSize < priv.buffer.width ? tileSize * 4
                                                                 : (priv.buffer.width - x) * 4;
            
            // copy line by line
            let targetOffset = (y * priv.buffer.width) + x;
            for (let offset = begin; offset < end; offset += rowStride)
            {
                const dest = targetOffset * 4;
                if (dest + blockLength >= priv.buffer.data.length)
                {
                    break;
                }
                priv.buffer.data.set(buffer.subarray(offset, offset + blockLength), dest);
                targetOffset += priv.buffer.width;
            }
        }

        clearRect(x, y, w, h)
        {
            // for CPU-based rendering
            // copy from RAM to RAM

            const priv = d.get(this);
            
            const blockLength = x + w < priv.buffer.width ? w * 4
                                                          : (priv.buffer.width - x) * 4;
            
            // clear line by line
            let targetOffset = (y * priv.buffer.width) + x;
            for (let i = 0; i < h; ++i)
            {
                const dest = targetOffset * 4;
                if (dest + blockLength >= priv.buffer.data.length)
                {
                    break;
                }
                priv.buffer.data.fill(0, dest, dest + blockLength);
                targetOffset += priv.buffer.width;
            }
        }

        renderMap()
        {
            const priv = d.get(this);

            if (! priv.tileSet || ! priv.model)
            {
                return 0;
            }
            
            const tileSize = priv.tileSet.tileSize;
            const w = priv.buffer.width;
            const h = priv.buffer.height;
            let offsetX = Math.round(priv.contentX);
            let offsetY = Math.round(priv.contentY);
            const xMod = priv.rowStride * tileSize;
            const yMod = (priv.model.size / priv.rowStride) * tileSize;
            const useGpuTiles = priv.tileSet.gpu;

            if (offsetX < 0)
            {
                offsetX = xMod - (Math.abs(offsetX) % xMod);
            }
            if (offsetY < 0)
            {
                offsetY = yMod - (Math.abs(offsetY) % yMod);
            }

            let tileIndex = 0;
            let tilesRendered = 0;

            let modelItem = null;
            for (let y = 0; y < h; y += tileSize)
            {
                for (let x = 0; x < w; x += tileSize)
                {
                    ++tileIndex;

                    const translatedX = (x + offsetX) % xMod;
                    const translatedY = (y + offsetY) % yMod;
                    const idx = ((translatedY / tileSize) | 0) * priv.rowStride + ((translatedX / tileSize) | 0);
                    //console.log("tile: " + idx + " @ " + x + ", " + y);
                    
                    modelItem = priv.model.at(idx);
                    const tileType = priv.key === "" ? modelItem 
                                                     : modelItem[priv.key];

                    const tile = priv.tileSet.getTile(tileType);
                    
                    if (priv.currentLayout.get(tileIndex) === tile[0])
                    {
                        // the tile was already rendered at this place
                        continue;
                    }
                    else
                    {
                        priv.currentLayout.set(tileIndex, tile[0]);
                        ++tilesRendered;
                    }
                    
                    if (useGpuTiles)
                    {
                        priv.offscreenContext.clearRect(x, y, tileSize, tileSize);
                        if (tile[1])
                        {
                            priv.offscreenContext.drawImage(tile[1], 
                                                            tile[2], tile[3], tileSize, tileSize,
                                                            x, y, tileSize, tileSize);
                        }
                    }
                    else
                    {   
                        this.clearRect(x, y, tileSize, tileSize);
                        if (tile[1])
                        {
                            this.putTile(tile, x, y, tileSize);
                        }
                    }
                }//for x
            }// for y

            return tilesRendered;
        }

        renderLater()
        {
            const priv = d.get(this);
            if (! priv.renderPending)
            {
                if (low.isFrameUpdate())
                {
                    this.render();
                }
                else
                {
                    const handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        if (this.lifeCycleStatus === "initialized")
                        {
                            priv.renderPending = false;
                            this.render();
                        }
                    }, this.objectType + "@" + this.objectLocation);
                }
            }
        }

        render()
        {
            const priv = d.get(this);
            if (! priv.buffer)
            {
                this.resizeBuffer();
            }
            if (! priv.buffer || ! priv.tileSet || ! priv.model || priv.model.size === 0)
            {
                return;
            }

            const tilesAmountRendered = this.renderMap();
            if (tilesAmountRendered && ! priv.tileSet.gpu)
            {
                // upload to GPU
                priv.offscreenContext.putImageData(priv.buffer, 0, 0);
            }
            
            let offsetX = Math.round(priv.contentX);
            let offsetY = Math.round(priv.contentY);
            const tileSize = priv.tileSet.tileSize;
            const xMod = priv.rowStride * tileSize;
            const yMod = (priv.model.size / priv.rowStride) * tileSize;

            if (offsetX < 0)
            {
                offsetX = xMod - (Math.abs(offsetX) % xMod);
            }
            if (offsetY < 0)
            {
                offsetY = yMod - (Math.abs(offsetY) % yMod);
            }

            const scrollX = offsetX % tileSize;
            const scrollY = offsetY % tileSize;

            if (tilesAmountRendered === 0 && priv.bufferX === -scrollX && priv.bufferY === -scrollY)
            {
                // nothing changed
                return;
            }

            // by keeping the scroll offset out of the buffer, we have to
            // re-render the buffer much less times

            priv.context.clearRect(0, 0, this.originalWidth, this.originalHeight);
            priv.context.drawImage(priv.offscreenCanvas, -scrollX, -scrollY);

            priv.bufferX = -scrollX;
            priv.bufferY = -scrollY;
        }
    }
    exports.TileMap = TileMap;
});