/*******************************************************************************
This file is part of Shellfish-3D.
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

shRequire([__dirname + "/mesh.js", __dirname + "/util/util.js", "shellfish/core/matrix"], (mesh, util, mat) =>
{      
   const VERTICES = [
       [-0.5, 0.5, 0.0],
       [0.5, 0.5, 0.0],
       [0.5, -0.5, 0.0],
       [-0.5, -0.5, 0.0]
    ];
    
    const TEX_ANCHORS = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
    ];
    
    const SURFACES = util.rectSurfaces([0, 1, 2, 3], [], [0, 1, 2, 3]);
                     
    
    const d = new WeakMap();

    /**
     * Class representing a 2D surface mesh.
     * 
     * Without transformations, the surface is centered around (0, 0, 0) with a
     * side length of 1 each.
     * 
     * @memberof shf3d
     * @extends shf3d.Mesh
     * @property {shf3d.Material} material - (default: `null`) The surface material.
     */
    class Surface extends mesh.Mesh
    {
        constructor()
        {
            super();
            d.set(this, {
                material: null
            });

            this.notifyable("material");

            this.onMaterialChanged = () => { this.invalidate(); };

            this.buildMesh(VERTICES, [], TEX_ANCHORS, SURFACES);
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
            this.assignMaterial(m, 0, 1);
                       
            m.connect("invalidate", this, () => { this.invalidate(); });
            
            this.materialChanged();
        }

        collisionsWith(v)
        {
            const transformed = mat.mul(this.inverseMatrix, v);
            //console.log("check collider at " + JSON.stringify(transformed) + " " + this.objectLocation);
            if (Math.abs(transformed[0]) <= 0.5 &&
                Math.abs(transformed[1]) <= 0.5 &&
                Math.abs(transformed[2]) <= 0.00001)
            {
                return [this];
            }
            else
            {
                return [];
            }
        }
    }
    exports.Surface = Surface;
});