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

shRequire([__dirname + "/entity.js", "shellfish/core/matrix"], (entity, mat) =>
{
    const d = new WeakMap();

    /**
     * Class representing a cloned entity.
     * 
     * Multiple clones may reference the same entity but apply individual
     * transformations to each clone. This way expensive entities need to be
     * created or held in memory only once.
     * 
     * @example
     * Clone {
     *      id: a
     *      entity: Cube { }
     * }
     * 
     * Clone {
     *      location: vec3(5, 0, 0)
     *      entity: a.entity
     * }
     * 
     * Clone {
     *      location: vec3(10, 0, 0)
     *      entity: a.entity
     * }
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * @property {shf3d.Entity} entity - (default: `null`) The shared entity.
     */
    class Clone extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                entity: null
            });

            this.notifyable("entity");
        }

        get entity() { return d.get(this).entity; }
        set entity(e)
        {
            d.get(this).entity = e;
            if (! e.parent)
            {
                e.parent = this;
            }
            e.connect("invalidate", this, () => { this.invalidate(); });
            this.entityChanged();
            this.invalidate();
        }

        prepareScene(om, sceneInfo)
        {
            const priv = d.get(this);
            if (priv.entity && priv.entity.visible)
            {
                const matrix = mat.mul(om, this.matrix);
                priv.entity.prepareScene(matrix, sceneInfo);
            }
        }

        renderScene(gl, om, sceneInfo)
        {
            const priv = d.get(this);
            if (priv.entity && priv.entity.visible)
            {
                const matrix = mat.mul(om, this.matrix);
                priv.entity.renderScene(gl, matrix, sceneInfo);
            }
        }

        collisionsWith(v)
        {
            const priv = d.get(this);
            const transformed = mat.mul(this.inverseMatrix, v);
            return priv.entity ? priv.entity.collisionsWith(transformed) : [];
        }
    }
    exports.Clone = Clone;
});
