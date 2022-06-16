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

shRequire(["shellfish/low", "shellfish/html", "shellfish/core/matrix"], (low, html, mat) =>
{
    const d = new WeakMap();

    /**
     * Class representing a view displaying a 3D scene.
     * 
     * @memberof shf3d
     * @extends html.Canvas
     * 
     * @property {color} ambience - (default: `rgb(0, 0, 0)`) The ambient light color.
     * @property {color} color - (default: `rgb(0, 0, 0)`) The background color.
     * @property {shf3d.Camera} camera - (default: `null`) The active camera.
     * @property {shf3d.Entity} scene - (default: `null`) The scene to show.
     */
    class View extends html.Canvas
    {
        constructor()
        {
            super();
            d.set(this, {
                renderPending: false,
                gl: this.get().getContext("webgl"),
                ambience: this.rgb(0, 0, 0),
                color: this.rgb(0, 0, 0),
                camera: null,
                scene: null
            });

            this.notifyable("ambience");
            this.notifyable("camera");
            this.notifyable("color");
            this.notifyable("scene");

            this.transitionable("ambience", this.colorInterpolate);
            this.transitionable("color", this.colorInterpolate);

            const priv = d.get(this);
            const gl = priv.gl;

            gl.enable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);

            this.onInitialization = () =>
            {
                if (priv.scene)
                {
                    this.invalidateScene();
                }
            }

            this.onOriginalWidthChanged = () =>
            {
                this.invalidateScene();
            };

            this.onOriginalHeightChanged = () =>
            {
                this.invalidateScene();
            };
        }

        get ambience() { return d.get(this).ambience; }
        set ambience(a)
        {
            const col = typeof a === "string" ? this.colorName(a) : a;
            d.get(this).ambience = col;
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
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).color = col;
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

        /**
         * Invalidates the scene and causes it to render again.
         */
        invalidateScene()
        {
            const priv = d.get(this);
            if (! priv.renderPending)
            {
                priv.renderPending = true;
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.renderScene();
                    priv.renderPending = false;
                }, this.objectType + "@" + this.objectLocation);
            }
        }

        /**
         * Renders the scene.
         */
        renderScene()
        {
            //console.log("render scene into " + this.objectLocation);
            const priv = d.get(this);

            if (! priv.scene)
            {
                return;
            }

            const gl = priv.gl;

            //console.log(priv.color);
            gl.clearColor(priv.color.r, priv.color.g, priv.color.b, priv.color.a);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.viewport(0, 0, this.originalWidth, this.originalHeight);

            if (priv.scene && priv.scene.visible)
            {
                const sceneInfo = {
                    activeCamera: priv.camera,
                    viewMatrix: mat.identityM(4),
                    cameraLocation: [0, 0, 0],
                    ambience: priv.ambience,
                    lights: [],
                    colliders: []
                };
                priv.scene.prepareScene(mat.scalingM(mat.vec(1, 1, 1, 1)), sceneInfo);
                
                sceneInfo.colliders.forEach((entry) =>
                {
                    const objs = priv.scene.collisionsWith(entry.vertex);
                    entry.target.collide(objs);
                });
                
                priv.scene.renderScene(gl, mat.scalingM(mat.vec(1, 1, 1, 1)), sceneInfo);
            }

            // render subviews
            this.children.filter(c => c !== priv.scene && c.renderScene).forEach((obj) =>
            {
                //console.log("child: " + obj.constructor.name);
                obj.renderScene(gl);
            });
        }

        add(child)
        {
            if (child.invalidateScene)
            {
                child.connect("invalidateScene", this, () =>
                {
                    this.invalidateScene();
                });
            }
            child.parent = this;
        }
    }
    exports.View = View;
});
