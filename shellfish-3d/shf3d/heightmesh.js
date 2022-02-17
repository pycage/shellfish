/*******************************************************************************
This file is part of Shellfish-3D.
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

shRequire([__dirname + "/mesh.js", __dirname + "/util/util.js"], (mesh, util) =>
{
    const d = new WeakMap();

    /**
     * Class representing a height-field mesh.
     * 
     * The height-field is loaded from a grey-map image file.
     * 
     * @memberof shf3d
     * @extends shf3d.Mesh
     * @property {shf3d.Material} material - (default: `null`) The surface material.
     * @property {string} source - (default: `""`) The URL of the height-field image.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    exports.HeightMesh = class HeightMesh extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                status: "empty",
                material: null,
                source: "",
                columns: 100,
                rows: 100,
                vertices: [],
                texAnchors: [],
                surfaces: []
            });

            this.notifyable("material");
            this.notifyable("source");
            this.notifyable("status");

            this.onMaterialChanged = () => { this.invalidate(); };


            const priv = d.get(this);
            const vertices = [];
            const normals = [];
            const texAnchors = [];
            const surfaces = [];

            for (let row = 0; row < priv.rows; ++row)
            {
                for (let col = 0; col < priv.columns; ++col)
                {
                    vertices.push([col / priv.columns - 0.5, 0, row / priv.rows - 0.5]);
                    texAnchors.push([col / priv.columns, row / priv.rows]);

                    if (row > 0 && col > 0)
                    {
                        const p1 = (row - 1) * priv.columns + (col - 1);
                        const p2 = (row - 1) * priv.columns + col;
                        const p3 = row * priv.columns + col;
                        const p4 = row * priv.columns + (col - 1);
                        surfaces.push(...util.rectSurfaces(
                            [p1, p2, p3, p4],
                            [p1, p2, p3, p4],
                            [p1, p2, p3, p4]
                        ));
                    }
                    normals.push([0, 1, 0]);
                }
            }

            priv.vertices = vertices;
            priv.texAnchors = texAnchors;
            priv.surfaces = surfaces;
            
            this.buildMesh(vertices, normals, texAnchors, surfaces.slice());
        }

        get status() { return d.get(this).status; }

        get material() { return d.get(this).material; }
        set material(m)
        {
            const priv = d.get(this);
            if (priv.material)
            {
                priv.material.disconnect("invalidate", this);
            }
            priv.material = m;
            if (! m.parent)
            {
                m.parent = this;
            }
            
            this.assignMaterial(m, 0,  (priv.rows - 2) * (priv.columns - 2) * 2);           
            m.connect("invalidate", this, () => { this.invalidate(); });
            
            this.materialChanged();
            this.invalidate();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);
            priv.source = s;
            this.sourceChanged();

            priv.status = "loading";
            this.statusChanged();

            const img = new Image();
            img.onload = () =>
            {
                const cnv = document.createElement("canvas");
                cnv.width = priv.columns;
                cnv.height = priv.rows;
                const ctx = cnv.getContext("2d");
                ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
                const data = ctx.getImageData(0, 0, priv.columns, priv.rows);
                
                for (let row = 0; row < priv.rows; ++row)
                {
                    for (let col = 0; col < priv.columns; ++col)
                    {
                        const pos = row * priv.columns + col;
                        //console.log(row * priv.columns + col);
                        const pixel = data.data[pos * 4];
                        //console.log(pixel);
                        const v = priv.vertices[pos];
                        v[1] = (pixel / 255.0);
                    }
                }

                const normals = [];
                for (let row = 0; row < priv.rows; ++row)
                {
                    for (let col = 0; col < priv.columns; ++col)
                    {
                        // interpolate normals
                        if (row > 0 && col > 0 &&
                            row < priv.rows - 1 && col < priv.columns - 1)
                        {
                            const p11 = (row - 1) * priv.columns + (col - 1);
                            const p12 = row * priv.columns + col;
                            const p13 = (row - 1) * priv.columns + col;

                            const p21 = (row - 1) * priv.columns + col;
                            const p22 = row * priv.columns + col;
                            const p23 = (row - 1) * priv.columns + (col + 1);

                            const p31 = (row + 1) * priv.columns + (col - 1);
                            const p32 = row * priv.columns + col;
                            const p33 = row * priv.columns + (col - 1);

                            const p41 = row * priv.columns + (col + 1);
                            const p42 = row * priv.columns + col;
                            const p43 = (row + 1) * priv.columns + col;

                            const normal1 = util.surfaceNormal(priv.vertices[p11], priv.vertices[p12], priv.vertices[p13]);
                            const normal2 = util.surfaceNormal(priv.vertices[p21], priv.vertices[p22], priv.vertices[p23]);
                            const normal3 = util.surfaceNormal(priv.vertices[p31], priv.vertices[p32], priv.vertices[p33]);
                            const normal4 = util.surfaceNormal(priv.vertices[p41], priv.vertices[p42], priv.vertices[p43]);

                            const normal = [normal2, normal3, normal4].reduce((a, b) =>
                            {
                                return util.interpolateVector(a, b);
                            }, normal1);
                            normals.push(normal);
                        }
                        else
                        {
                            normals.push([0, 1, 0]);
                        }
                    }
                }
                
                this.buildMesh(priv.vertices, normals, priv.texAnchors, priv.surfaces.slice());
                priv.status = "success";
                this.statusChanged();    
                this.invalidate();
            };

            img.onerror = (err) =>
            {
                console.error("Failed to load height map: " + s);
                priv.status = "error";
                this.statusChanged();
            };
            console.log("Loading height map: " + s);
            img.src = shRequire.resource(s);
        }

        /**
         * Returns the interpolated height at the given location on the
         * height-field. 
         * 
         * @memberof shf3d.HeightMesh
         * @param {number} s - The S position in the height-field coordinate system.
         * @param {number} t - The T position in the height-field coordinate system.
         * @returns {number} The height.
         */
        heightAt(s, t)
        {
            //console.log("heightAt: " + x + ", " + y);
            const priv = d.get(this);

            const x1 = Math.max(0, Math.min(priv.columns - 1, Math.floor(s)));
            const x2 = Math.max(0, Math.min(priv.columns - 1, Math.ceil(s)));
            const y1 = Math.max(0, Math.min(priv.rows - 1, Math.floor(t)));
            const y2 = Math.max(0, Math.min(priv.rows - 1, Math.ceil(t)));

            const xOffset = x2 > x1 ? (s - x1) / (x2 - x1) : 0;
            const yOffset = y2 > y1 ? (t - y1) / (y2 - y1) : 0;

            const h1 = priv.vertices[y1 * priv.columns + x1][1];
            const h2 = priv.vertices[y1 * priv.columns + x2][1];
            const h3 = priv.vertices[y2 * priv.columns + x1][1];
            const hx = h1 + (h2 - h1) * xOffset;
            const hy = h1 + (h3 - h1) * yOffset;

            return (hx + hy) / 2;
        }
    };
});