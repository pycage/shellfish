/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2025 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/item.js", "shellfish/core/matrix"], function (low, item, mat)
{
        const simpleVertexShader = `#version 300 es
        in vec2 position;
        out vec2 uv;

        void main()
        {
            uv = position;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;

    function loadImage(source)
    {
        return new Promise((resolve, reject) =>
        {
            const img = new Image();
            img.onload = () =>
            {
                resolve(img);
            };
            img.onerror = (err) =>
            {
                reject(err);
            };
            img.src = shRequire.resource(source);
        });
    }

    function createTexture(gl, image)
    {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, null);

        return texture;
    }


    const d = new WeakMap();

    /**
     * Class representing a HTML5 canvas. It provides a `context2d` property
     * for using the HTML5 Canvas API, and a `fragmentShader` property for GPU-driven
     * rendering using a GLSL fragment shader.
     * 
     * @extends html.Item
     * @memberof html
     * 
     * @property {object} context2d - [readonly] The 2D canvas context.
     * @property {number} originalHeight - (default: `100`) The original unscaled height.
     * @property {number} originalWidth - (default: `100`) The original unscaled width.
     * @property {string} fragmentShader - (default: `""`) An optional GLSL fragment shader for rendering directly into the canvas.
     */
    class Canvas extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                item: low.createElementTree(
                    low.tag("canvas")
                    .attr("width", "100")
                    .attr("height", "100")
                    //.style("pointer-events", "none")
                    .html()
                ),
                gl: null,
                programId: 0,
                shader: "",
                textures: [],
                renderingScheduled: false
            });

            this.notifyable("originalWidth");
            this.notifyable("originalHeight");
            this.notifyable("fragmentShader");
        }

        updateContentSize()
        {
            this.invalidateCanvas();
        }

        /**
         * Sets a uniform value to pass to the fragment shader.
         * 
         * When passing vectors and matrices, they must be of the form created
         * by Shellfish's {@link core.matrix matrix} tools.
         * 
         * When passing textures, `value` is the source path of the image file.
         * 
         * @param {string} type - The type of uniform. Supported types are: `bool|float|int|mat3|mat4|vec2|vec3|vec4|texture`
         * @param {string} name - The name of the uniform. It must be defined by that name in the shader.
         * @param {any} value - The value to set.
         * @see {@link core.matrix matrix}
         */
        setUniform(type, name, value)
        {
            const priv = d.get(this);
            const gl = priv.gl;
            if (! gl)
            {
                return;
            }

            const uniformLocation = gl.getUniformLocation(priv.programId, name);
            if (! uniformLocation)
            {
                console.error("Cannot find fragment shader uniform: " + name);
                return;
            }

            if (type === "bool")
            {
                gl.uniform1b(uniformLocation, value);
            }
            if (type === "float")
            {
                gl.uniform1f(uniformLocation, value);
            }
            else if (type === "int")
            {
                gl.uniform1i(uniformLocation, value);
            }
            else if (type === "mat3")
            {
                // transpose for OpenGL
                gl.uniformMatrix3fv(uniformLocation, false, new Float32Array(mat.flat(mat.t(value))));
            }    
            else if (type === "mat4")
            {
                // transpose for OpenGL
                gl.uniformMatrix4fv(uniformLocation, false, new Float32Array(mat.flat(mat.t(value))));
            }
            else if (type === "texture")
            {
                let texIndex = priv.textures.findIndex(tex => tex.uniform === uniformLocation);
                if (texIndex === -1)
                {
                    loadImage(value)
                    .then(img =>
                    {
                        priv.textures.push({
                            uniform: uniformLocation,
                            source: value,
                            texture: createTexture(gl, img)
                        });
                        texIndex = priv.textures.length - 1;
                        gl.activeTexture(gl.TEXTURE0 + texIndex);
                        gl.bindTexture(gl.TEXTURE_2D, priv.textures[texIndex].texture);
                        gl.uniform1i(uniformLocation, texIndex);
                    });
                }
                else
                {
                    if (priv.textures[texIndex].source !== source)
                    {
                        gl.deleteTexture(priv.textures[texIndex].texture);
                        loadImage(value)
                        .then(img =>
                        {
                            priv.textures.push({
                                uniform: uniformLocation,
                                source: value,
                                texture: createTexture(gl, img)
                            });
                            gl.activeTexture(gl.TEXTURE0 + texIndex);
                            gl.bindTexture(gl.TEXTURE_2D, priv.textures[texIndex].texture);
                            gl.uniform1i(uniformLocation, texIndex);
                        });
                    }
                    else
                    {
                        gl.activeTexture(gl.TEXTURE0 + texIndex);
                        gl.bindTexture(gl.TEXTURE_2D, priv.textures[texIndex].texture);
                        gl.uniform1i(uniformLocation, texIndex);
                    }
                }
            }
            else if (type === "vec2")
            {
                gl.uniform2fv(uniformLocation, new Float32Array(mat.flat(value)));
            }
            else if (type === "vec3")
            {
                gl.uniform3fv(uniformLocation, new Float32Array(mat.flat(value)));
            }
            else if (type === "vec4")
            {
                gl.uniform4fv(uniformLocation, new Float32Array(mat.flat(value)));
            }
            
            this.invalidateCanvas();
        }

        setTexture(uniform, source)
        {

        }

        initShader()
        {
            const priv = d.get(this);
            const gl = this.get().getContext("webgl2");

            const vShaderId = gl.createShader(gl.VERTEX_SHADER);
            const fShaderId = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(vShaderId, simpleVertexShader);
            
            gl.compileShader(vShaderId);
            if (! gl.getShaderParameter(vShaderId, gl.COMPILE_STATUS))
            {
                const info = gl.getShaderInfoLog(vShaderId);
                throw "Failed to compile vertex shader: " + info;
            }
                
            gl.shaderSource(fShaderId, priv.fragmentShader);
            gl.compileShader(fShaderId);
            if (! gl.getShaderParameter(fShaderId, gl.COMPILE_STATUS))
            {
                const info = gl.getShaderInfoLog(fShaderId);
                throw "Failed to compile fragment shader: " + info;
            }

            const programId = gl.createProgram();
            gl.attachShader(programId, vShaderId);
            gl.attachShader(programId, fShaderId);
            gl.linkProgram(programId);
            if (! gl.getProgramParameter(programId, gl.LINK_STATUS))
            {
                const info = gl.getProgramInfoLog(programId);
                throw "Failed to link GLSL program: " + info;
            }

            gl.useProgram(programId);

            const positionAttrib = gl.getAttribLocation(programId, "position");

            const vertices = [
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ];

            const vbo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
            
            gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(positionAttrib);


            priv.gl = gl;
            priv.programId = programId;
        }
        
        invalidateCanvas()
        {
            const priv = d.get(this);
            if (! priv.gl || priv.renderingScheduled)
            {
                return;
            }

            priv.renderingScheduled = true;

            this.nextFrame(() =>
            {
                priv.renderingScheduled = false;

                const gl = priv.gl;
                gl.viewport(0, 0, this.originalWidth, this.originalHeight);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        }

        get context2d() { return this.get().getContext("2d"); }

        get originalWidth() { return this.get().width; }
        set originalWidth(w)
        {
            if (w !== this.get().width)
            {
                this.get().width = w;
            }
            this.originalWidthChanged();
        }

        get originalHeight() { return this.get().height; }
        set originalHeight(h)
        {
            if (h !== this.get().height)
            {
                this.get().height = h;
            }
            this.originalHeightChanged();
        }

        get fragmentShader() { return d.get(this).fragmentShader; }
        set fragmentShader(s)
        {
            if (s !== d.get(this).fragmentShader)
            {
                d.get(this).fragmentShader = s;
                if (s !== "")
                {
                    this.initShader();
                    this.invalidateCanvas();
                }
                this.fragmentShaderChanged();
            }
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Canvas = Canvas;

});