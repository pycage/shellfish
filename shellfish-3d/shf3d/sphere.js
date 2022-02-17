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
    function location(longitude, latitude)
    {
        /*
          x = sin(lat) * cos(long)
          y = sin(long)
          z = cos(lat) * cos(long)
        */
        return [Math.sin(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * longitude),
                Math.sin(Math.PI / 180 * longitude),
                Math.cos(Math.PI / 180 * latitude) * Math.cos(Math.PI / 180 * longitude)];
    }

    function texLocation(longitude, latitude)
    {
        return [latitude / 360.0,
                1.0 - Math.sin(Math.PI / 180 * ((longitude + 90) / 2))];
    }

    function makeSphere()
    {
        const vertices = [];
        const texAnchors = [];
        const surfaces = [];

        let offset = 0;
        const stepSize = 12;
        for (let longitude = -90; longitude < 90; longitude += stepSize)
        {
            for (let latitude = 0; latitude < 360; latitude += stepSize)
            {
                const vs = [
                    location(longitude, latitude),
                    location(longitude + stepSize, latitude),
                    location(longitude + stepSize, latitude + stepSize),
                    location(longitude, latitude + stepSize)
                ];

                const ts = [
                    texLocation(longitude, latitude),
                    texLocation(longitude + stepSize, latitude),
                    texLocation(longitude + stepSize, latitude + stepSize),
                    texLocation(longitude, latitude + stepSize)
                ];

                const rectSurfaces = util.rectSurfaces(
                    [offset + 0, offset + 1, offset + 2, offset + 3],
                    [],
                    [offset + 0, offset + 1, offset + 2, offset + 3]);

                vertices.push(...vs);
                texAnchors.push(...ts);
                surfaces.push(...rectSurfaces);
                offset += 4;
            }
        }

        return { vertices, texAnchors, surfaces };
    }

    
    const d = new WeakMap();
    
    /**
     * Class representing a spherical mesh.
     * 
     * Without transformations, the sphere is centered around (0, 0, 0) with
     * radius 1.
     * 
     * @memberof shf3d
     * @extends shf3d.Mesh
     * @property {shf3d.Material} material - (default: `null`) The surface material.
     */
    exports.Sphere = class Sphere extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                info: null,
                material: null
            });
            
            this.notifyable("material");
            
            this.onMaterialChanged = () => { this.invalidate(); };
            
            const sphere = makeSphere();
            this.buildMesh(sphere.vertices, [], sphere.texAnchors, sphere.surfaces);
        }

        get material() { return d.get(this).material; }
        set material(m)
        {
            if (d.get(this).material)
            {
                d.get(this).material.disconnect("invalidate", this);
            }
            d.get(this).material = m;
            if (! m.parent)
            {
                m.parent = this;
            }
            this.assignMaterial(m, 0, 899);
                       
            m.connect("invalidate", this, () => { this.invalidate(); });
            
            this.materialChanged();
        }
    };
});