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

shRequire([__dirname + "/entity.js",
           __dirname + "/util/util.js",
           "shellfish/core/matrix"], (entity, util, mat) =>
{
    const d = new WeakMap();
    
    /**
     * Class representing a base class for mesh models.
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * @property {bool} clockWise - (default: `false`) If `true`, the model's
     *                              surfaces are considered to be defined in
     *                              clockwise order instead of being in
     *                              counter-clockwise order.
     */
    class Mesh extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                info: null,
                clockWise: false,
                materials: []
            });
            
            this.notifyable("clockWise");
                       
            this.schedule((gl) =>
            {
                const priv = d.get(this);       

                priv.info = {
                    buffer: {
                        vertex: gl.createBuffer(),
                        normal: gl.createBuffer(),
                        tangent: gl.createBuffer(),
                        texture: gl.createBuffer()
                    },
                    numVertices: 0
                };
            });
        }

        get clockWise() { return d.get(this).clockWise; }
        set clockWise(cw)
        {
            d.get(this).clockWise = cw;
            this.clockWiseChanged();
        }

        /**
         * Builds a mesh.
         * 
         * @memberof shf3d.Mesh
         * @param {number[][]} vertices - The vertices.
         * @param {number[][]} normals - The vertex normals.
         * @param {number[][]} texAnchors - The texture anchor points.
         * @param {object[]} surfaces - The surfaces.
         */
        buildMesh(vertices, normals, texAnchors, surfaces)
        {
            const priv = d.get(this);

            const vertexArray = [];
            const texAnchorArray = [];
            const normalsArray = [];
            const tangentsArray = [];

            surfaces.slice().forEach((sfc) =>
            {
                if (priv.clockWise)
                {
                    // flip vertices to make surface counter-clockwise
                    sfc = [sfc[0], sfc[2], sfc[1]];
                }

                const p1 = vertices[sfc[0].vertex];
                const p2 = vertices[sfc[1].vertex];
                const p3 = vertices[sfc[2].vertex];
                
                let autoNormal = [0, 0, 0];
                if (sfc[0].normal === -1)
                {
                    // supply auto-normals if the model defines none
                    autoNormal = util.surfaceNormal(p1, p2, p3);                    
                }

                let tangent = [0, 0, 0];
                if (sfc[0].texture !== -1)
                {
                    const uv1 = texAnchors[sfc[0].texture];
                    const uv2 = texAnchors[sfc[1].texture];
                    const uv3 = texAnchors[sfc[2].texture];

                    tangent = util.surfaceTangent(p1, p2, p3, uv1, uv2, uv3);
                }

                sfc.forEach((tuple) =>
                {
                    const vertex = vertices[tuple.vertex].slice(0, 3);
                    const normalVertex = tuple.normal !== -1 ? normals[tuple.normal].slice(0, 3)
                                                             : autoNormal;
                    const texAnchor = tuple.texture !== -1 ? texAnchors[tuple.texture].slice(0, 2)
                                                           : [0, 0];

                    vertexArray.push(...vertex);
                    normalsArray.push(...normalVertex);
                    tangentsArray.push(...tangent);
                    texAnchorArray.push(...texAnchor);
                });
            });

            /*
            console.log("Mesh " + this.constructor.name + " (" + this.objectLocation + ")");
            console.log("Vertices:");
            console.log(vertexArray);

            console.log("Normals:");
            console.log(normalsArray);
            
            console.log("Texture Anchors:");
            console.log(texAnchorArray);
            
            console.log("Tangents:");
            console.log(tangentsArray);
            */

           
           this.schedule((gl) =>
           {
                priv.info.numVertices = vertexArray.length / 3;

                gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.vertex);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexArray), gl.STATIC_DRAW);
    
                gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.normal);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalsArray), gl.STATIC_DRAW);
    
                gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.tangent);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangentsArray), gl.STATIC_DRAW);
    
                gl.bindBuffer(gl.ARRAY_BUFFER, priv.info.buffer.texture);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texAnchorArray), gl.STATIC_DRAW);
            });
        }

        /**
         * Assigns a material to a range of surfaces of the mesh.
         * 
         * @param {shf3d.Material} material - The material.
         * @param {number} from - The first surface of the range.
         * @param {number} to - The last surface of the range.
         */
        assignMaterial(material, from, to)
        {
            d.get(this).materials.push({ material, from, to });
        }

        renderScene(gl, om, sceneInfo)
        {
            const priv = d.get(this);

            this.prepare(gl);

            if (! priv.info || priv.info.numVertices === 0)
            {
                return;
            }
           
            // divide into materials
            priv.materials.forEach((range) =>
            {
                if (range.material)
                {
                    //console.log("mtl " + range.name);
                    range.material.bind(gl,
                                        mat.mul(om, this.matrix),
                                        sceneInfo,
                                        priv.info);
                    gl.drawArrays(gl.TRIANGLES, range.from * 3, (range.to - range.from + 1) * 3);
                }
            });
        }
    }
    exports.Mesh = Mesh;
});