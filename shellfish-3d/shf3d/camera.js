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
    function orthographic(left, right, bottom, top, near, far)
    {
        return [
            [2 / (right - left), 0, 0, (left + right) / (left - right)],
            [0, 2 / (top - bottom), 0, (bottom + top) / (bottom - top)],
            [0, 0, 2 / (near - far), (near + far) / (near - far)],
            [0, 0, 0, 1]
        ];
    }
    
    function frustum(l, r, b, t, n, f)
    {
        const q = f / (f - n);
    
        return [
            [n / (r - l), 0, 0, 0],
            [0, n / (t - b), 0, 0],
            [0, 0, q * (n - 1), -n * q],
            [0, 0, -1, 0]
        ];
    }
    
    function perspective(fov, aspect, near, far)
    {
        const y = Math.tan((fov / 180 * Math.PI) / 2) * near;
        const x = y * aspect;
        return frustum(-x, x, -y, y, near, far);
    }

    const d = new WeakMap();

    /**
     * Represents a camera in the scene.
     * 
     * There may be multiple cameras in a scene and the active camera may be
     * switched in the View element by assigning the `camera` property.
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * 
     * @property {number} aspect - (default: `1`) The aspect ratio of the camera view.
     * @property {number} fieldOfView - (default: `45`) The field of view in degrees.
     * @property {string} projection - (default: `"perspective"`) The projection mode. One of `perspective|orthographic`
     */
    class Camera extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                aspect: 1,
                fieldOfView: 45,
                projection: "perspective"
            });

            this.notifyable("aspect");
            this.notifyable("fieldOfView");
            this.notifyable("projection");
        }

        get aspect() { return d.get(this).aspect; }
        set aspect(a)
        {
            d.get(this).aspect = a;
            this.aspectChanged();
            this.invalidate();
        }

        get fieldOfView() { return d.get(this).fieldOfView; }
        set fieldOfView(v)
        {
            d.get(this).fieldOfView = v;
            this.fieldOfViewChanged();
            this.invalidate();
        }

        get projection() { return d.get(this).projection; }
        set projection(p)
        {
            d.get(this).projection = p;
            this.projectionChanged();
            this.invalidate();
        }

        prepareScene(om, sceneInfo)
        {
            if (sceneInfo.activeCamera === this || sceneInfo.activeCamera === null)
            {
                const priv = d.get(this);
                const projectionMatrix = priv.projection === "perspective" 
                                         ? perspective(priv.fieldOfView, priv.aspect, 0.05, 100)
                                         : orthographic(-10, 10, -10, 10, -10, 10);
    
                sceneInfo.viewMatrix = mat.mul(
                    projectionMatrix,
                    mat.inv(mat.mul(om, this.matrix))
                );

                sceneInfo.cameraLocation = mat.mul(mat.mul(om, this.matrix), mat.vec(0, 0, 0, 1));
            }
        }
    }
    exports.Camera = Camera;
});
