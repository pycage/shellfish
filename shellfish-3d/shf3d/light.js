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
     * Class representing a light source in a 3D scene.
     * 
     * Scenes without light sources display objects in the ambient only, without
     * highlights or shades.
     * 
     * A scene may use up to 16 light sources.
     * 
     * @memberof shf3d
     * @extends shf3d.Entity
     * @property {color} color - The light color.
     * @property {number} range - The range of the light until 100% fall-off.
     */
    exports.Light = class Light extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                color: this.rgb(1, 1, 1),
                range: 100.0
            });

            this.notifyable("color");
            this.notifyable("range");

            this.transitionable("color", this.colorInterpolate);
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).color = col;
            this.colorChanged();
            this.invalidate();
        }

        get range() { return d.get(this).range; }
        set range(r)
        {
            d.get(this).range = r;
            this.rangeChanged();
            this.invalidate();
        }

        prepareScene(om, sceneInfo)
        {
            const v = mat.flat(mat.mul(mat.mul(om, this.matrix), mat.vec(0, 0, 0, 1)));
            //const v = [this.x, this.y, this.z, 1];
            //console.log("Light at " + v);
            sceneInfo.lights.push({
                x: v[0],
                y: v[1],
                z: v[2],
                color: this.color,
                range: this.range
            });
        }
    };
});
