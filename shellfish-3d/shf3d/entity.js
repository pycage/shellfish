/*******************************************************************************
This file is part of Shellfish-3D.
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

shRequire(["shellfish/core", "shellfish/core/matrix", "shellfish/core/vector"], (core, mat, vec) =>
{
    const d = new WeakMap();

    /**
     * Base class for entities in the 3D space.
     * 
     * @memberof shf3d
     * @extends core.Object
     * 
     * @property {vec3} location - (default: `vec3(0, 0, 0)`) The current location.
     * @property {number} rotationAngle - (default: `0`) The rotation angle in degrees.
     * @property {vec3} rotationAxis - (default: `vec3(0, 1, 0)`) The rotation axis. 
     * @property {vec3} scale - (default: `vec3(1, 1, 1)`) The current scale.
     * @property {bool} visible - (default: `true`) Whether the entity is visible.
     */
    exports.Entity = class Entity extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                scheduledFunctions: [],
                location: this.vec3(0, 0, 0),
                rotationAxis: this.vec3(0, 1, 0),
                rotationAngle: 0,
                rotationQuaternion: [0, 0, 0, 0],
                scale: this.vec3(1, 1, 1),
                visible: true,
                inverseMatrix: mat.identityM(4)
            });

            this.notifyable("location");
            this.notifyable("matrix");
            this.notifyable("visible");
            this.notifyable("rotationAxis");
            this.notifyable("rotationAngle");
            this.notifyable("scale");

            this.transitionable("location", vec.vec3Interpolate);
            this.transitionable("rotationAngle");
            this.transitionable("scale", vec.vec3Interpolate);

            this.registerEvent("invalidate");

            this.onMatrixChanged = () =>
            {
                d.get(this).inverseMatrix = mat.inv(this.matrix);
                this.invalidate();
            };
        }

        get visible() { return d.get(this).visible; }
        set visible(v)
        {
            d.get(this).visible = v;
            this.visibleChanged();
            this.invalidate();
        }

        get matrix()
        {
            const priv = d.get(this);

            const phi = priv.rotationAngle / 180 * Math.PI;
            const c = Math.cos(phi / 2);
            const s = Math.sin(phi / 2);
            const len = priv.rotationAxis.length();
            const normalizedAxis = len !== 0 ? priv.rotationAxis.scale(1 / len)
                                             : priv.rotationAxis;

            priv.rotationQuaternion = [
                c,
                normalizedAxis.x * s,
                normalizedAxis.y * s,
                normalizedAxis.z * s
            ];

            return mat.mul(
                mat.translationM(mat.vec(priv.location.x, priv.location.y, priv.location.z)),
                mat.mul(
                    mat.rotationMByQuaternion(priv.rotationQuaternion),
                    mat.scalingM(mat.vec(priv.scale.x, priv.scale.y, priv.scale.z, 1))
                )
            );
        }

        get inverseMatrix() { return d.get(this).inverseMatrix; }

        get rotationAxis() { return d.get(this).rotationAxis; }
        set rotationAxis(a)
        {
            d.get(this).rotationAxis = a;
            this.rotationAxisChanged();
            this.matrixChanged();
        }

        get rotationAngle() { return d.get(this).rotationAngle; }
        set rotationAngle(a)
        {
            d.get(this).rotationAngle = a;
            this.rotationAngleChanged();
            this.matrixChanged();
        }

        get rotationQuaternion() { return d.get(this).rotationQuaternion; }

        get location() { return d.get(this).location; }
        set location(l)
        {
            if (l)
            {
                d.get(this).location = l;
                this.locationChanged();
                this.matrixChanged();
            }
            else
            {
                throw new Error("Invalid vec3 value.");
            }
        }

        get scale() { return d.get(this).scale; }
        set scale(s)
        {
            if (s)
            {
                d.get(this).scale = s;
                this.scaleChanged();
                this.matrixChanged();
            }
            else
            {
                throw new Error("Invalid vec3 value.");
            }
        }

        /**
         * Creates a 3-component vector.
         * 
         * @memberof shf3d
         * @param {number} x - The X component.
         * @param {number} y - The Y component.
         * @param {number} z - The Z component.
         * @returns {vec3} The vector.
         */
        vec3(x, y, z)
        {
            return vec.vec3(x, y, z);
        }

        /**
         * Schedules a function to be executed with a GL context.
         * 
         * @memberof shf3d.Entity
         * @param {function} f - The function.
         */
        schedule(f)
        {
            d.get(this).scheduledFunctions.push(f);
        }

        prepare(gl)
        {
            d.get(this).scheduledFunctions.forEach((f) =>
            {
                f(gl);
            });
            d.get(this).scheduledFunctions = [];
        }

        /**
         * Moves the entity by the given directional vector.
         * The vector is expected to be in the entity-local coordinate-system.
         * 
         * @memberof shf3d.Entity
         * @param {vec3} dv - The directional vector.
         */
        move(dv)
        {
            const priv = d.get(this);

            const rm = mat.rotationMByQuaternion(priv.rotationQuaternion);
            const xv = mat.mul(rm, mat.vec(dv.x, 0, 0, 1));
            const yv = mat.mul(rm, mat.vec(0, dv.y, 0, 1));
            const zv = mat.mul(rm, mat.vec(0, 0, dv.z, 1));

            const delta = mat.add(mat.add(xv, yv), zv);

            this.change("location", vec.vec3(
                this.location.x + delta[0][0],
                this.location.y + delta[1][0],
                this.location.z + delta[2][0]
            ));
        }

        collisionsWith(v)
        {
            return [];
        }

        prepareScene(om, sceneInfo)
        {
            // no action by default
        }

        renderScene(gl, om, sceneInfo)
        {
            // no action by default
        }
    };
});