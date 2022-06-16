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

shRequire(["shellfish/core", "shellfish/core/matrix"], (core, mat) =>
{
    const d = new WeakMap();

    /**
     * Class representing a sub-view displaying a 3D scene within a view.
     * 
     * @memberof shf3d
     * @extends core.Object
     * 
     * @property {color} ambience - (default: `rgb(0, 0, 0)`) The ambient light color.
     * @property {color} color - (default: `rgb(0, 0, 0)`) The background color.
     * @property {shf3d.Camera} camera - (default: `null`) The active camera.
     * @property {shf3d.Entity} scene - (default: `null`) The scene to show.
     */
    class SubView extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                ambience: this.rgb(0, 0, 0),
                color: this.rgb(0, 0, 0),
                camera: null,
                scene: null,
                x: 0,
                y: 0,
                width: 100,
                height: 100
            });

            this.notifyable("ambience");
            this.notifyable("camera");
            this.notifyable("color");
            this.notifyable("height");
            this.notifyable("scene");
            this.notifyable("width");
            this.notifyable("x");
            this.notifyable("y");

            this.transitionable("ambience", this.colorInterpolate);
            this.transitionable("color", this.colorInterpolate);

            this.registerEvent("invalidateScene");

            const priv = d.get(this);

            this.onInitialization = () =>
            {
                if (priv.scene)
                {
                    this.invalidateScene();
                }
            }
        }

        get ambience() { return d.get(this).ambience; }
        set ambience(a)
        {
            d.get(this).ambience = a;
            this.ambienceChanged();
            this.invalidateScene();
        }

        get camera() { return d.get(this).camera; }
        set camera(c)
        {
            if (d.get(this).camera)
            {
                d.get(this).camera.disconnect("matrixChanged", this);
            }

            d.get(this).camera = c;
            if (c && ! c.parent)
            {
                c.parent = this;
            }
            this.cameraChanged();
            this.invalidateScene();
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            d.get(this).color = c;
            this.colorChanged();
            this.invalidateScene();
        }

        get scene() { return d.get(this).scene; }
        set scene(s)
        {
            if (d.get(this).scene)
            {
                d.get(this).scene.disconnect("invalidate", this);
            }
            d.get(this).scene = s;
            if (! s.parent)
            {
                s.parent = this;
            }
            this.sceneChanged();

            s.connect("invalidate", this, () => { this.invalidateScene(); });
        }

        get x() { return d.get(this).x; }
        set x(v)
        {
            d.get(this).x = v;
            this.xChanged();
            this.invalidateScene();
        }

        get y() { return d.get(this).y; }
        set y(v)
        {
            d.get(this).y = v;
            this.yChanged();
            this.invalidateScene();
        }

        get width() { return d.get(this).width; }
        set width(v)
        {
            d.get(this).width = v;
            this.widthChanged();
            this.invalidateScene();
        }

        get height() { return d.get(this).height; }
        set height(v)
        {
            d.get(this).height = v;
            this.heightChanged();
            this.invalidateScene();
        }

        /**
         * Renders the scene.
         */
        renderScene(gl)
        {
            //console.log("render scene into " + this.objectLocation);
            const priv = d.get(this);

            if (! priv.scene || ! priv.camera || ! this.parent)
            {
                return;
            }

            const pbbox = this.parent.bbox;
            const xScale = this.parent.originalWidth / pbbox.width;
            const yScale = this.parent.originalHeight / pbbox.height;
            const x = priv.x * xScale;
            const y = priv.y * yScale;
            const w = priv.width * xScale;
            const h = priv.height * yScale;

            gl.enable(gl.SCISSOR_TEST);
            gl.scissor(x, this.parent.originalHeight - (y + h), w, h);
            gl.clearColor(priv.color.r, priv.color.g, priv.color.b, priv.color.a);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.disable(gl.SCISSOR_TEST);
            gl.viewport(x, this.parent.originalHeight - (y + h), w, h);

            if (priv.scene && priv.scene.visible)
            {
                const sceneInfo = {
                    activeCamera: priv.camera,
                    viewMatrix: mat.identityM(4),
                    ambience: priv.ambience,
                    lights: [],
                    colliders: []
                };
                priv.scene.prepareScene(mat.scalingM(mat.vec(1, 1, 1, 1)), sceneInfo);
                priv.scene.renderScene(gl, mat.scalingM(mat.vec(1, 1, 1, 1)), sceneInfo);
            }
        }
    }
    exports.SubView = SubView;
});
