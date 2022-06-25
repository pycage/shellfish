/*******************************************************************************
This file is part of Shellfish-3D.
Copyright (c) 2020 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
    const VERTEX_SHADER = `
        attribute vec4 vPos;
        attribute vec4 vNormal;
        attribute vec4 vTangent;
        attribute vec2 vTexCoord;
        
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec4 fTangent;
        varying vec2 fTexCoord;
        varying mat3 fTbn;
        
        uniform mat4 om;
        uniform mat4 vm;

        void main()
        {
            highp vec4 objPos = om * vPos;

            fPos = objPos;
            fNormal = vNormal;
            fTangent = vTangent;
            fTexCoord = vTexCoord;

            vec4 bt = vec4(cross(vTangent.xyz, vNormal.xyz), 0.0);
            fTbn = mat3(
                normalize(vec3(vTangent)),
                normalize(vec3(bt)),
                normalize(vec3(vNormal))
            );

            gl_Position = vm * objPos;
        }
    `;

    const FRAGMENT_SHADER = `
        precision mediump float;
    
        varying vec4 fPos;
        varying vec4 fNormal;
        varying vec4 fTangent;
        varying vec2 fTexCoord;
        varying mat3 fTbn;
        
        uniform vec4 ambience;
        
        uniform vec4 cameraLocation;

        uniform int numLights;
        uniform vec4 lightPos[16];
        uniform vec4 lightColor[16];
        uniform float lightRange[16];

        uniform vec4 diffuseColor;
        uniform vec4 specularColor;
        uniform vec4 emissiveColor;
        uniform float shininess;
        uniform float opacity;

        uniform bool hasTexture;
        uniform bool hasBumpTexture;
        uniform sampler2D texture;
        uniform sampler2D bumpTexture;
        uniform float textureRepeatS;
        uniform float textureRepeatT;

        uniform mat4 nm;

        void main()
        {
            if (opacity < 0.1)
            {
                discard;
            }

            vec3 viewDirection = normalize(cameraLocation.xyz - fPos.xyz);
            float specularStrength = 0.5;
            vec4 diffuseReflection = diffuseColor;
            
            vec3 normal;
            if (hasBumpTexture)
            {
                normal = normalize(texture2D(bumpTexture, fTexCoord.st).rgb * 2.0 - 1.0);
                normal = fTbn * normal;
            }
            else
            {
                normal = fNormal.xyz;
            }
            normal = normalize(vec3(nm * vec4(normal, 0.0)));

            if (hasTexture)
            {
                vec4 texColor = texture2D(texture, vec2(fTexCoord.s * textureRepeatS, fTexCoord.t * textureRepeatT));
                if (texColor.a < 0.01)
                {
                    discard;
                }
                diffuseReflection *= vec4(texColor.rgb, 1.0);
            }

            vec4 reflectionColor = emissiveColor + diffuseReflection * ambience;
            
            for (int i = 0; i < 16; ++i)
            {
                if (i >= numLights)
                {
                    break;
                }
                vec3 lightVector = lightPos[i].xyz - fPos.xyz;
                float lightDistance = length(lightVector);
                vec3 lightDirection = normalize(lightVector);
                vec3 halfDirection = normalize(lightDirection + viewDirection);
                
                float diffuseImpact = max(dot(lightDirection, normal), 0.0);
                float spec = pow(max(dot(normal, halfDirection), 0.0), shininess);

                vec4 specularReflection = specularStrength * spec * specularColor;
                if (dot(lightDirection, normal) < 0.0)
                {
                    specularReflection = vec4(0, 0, 0, 1);
                }
                float attenuation = clamp(1.0 - lightDistance / lightRange[i], 0.0, 1.0);
                attenuation *= attenuation;

                reflectionColor += (diffuseReflection * diffuseImpact +
                                    specularReflection) *
                                   lightColor[i] * attenuation;

                //gl_FragColor = vec4((viewDirection.rgb + 1.0 / 2.0), 1.0);
                //break;
            }
            
            gl_FragColor = vec4(reflectionColor.rgb, opacity);
            //gl_FragColor = vec4((normal.rgb + 1.0 / 2.0), 1.0);
        }
    `;

    const programInfos = new WeakMap();

    const d = new WeakMap();

    /**
     * Class representing a surface material.
     * 
     * @memberof shf3d
     * @property {string} bumpSource - (default: `""`) The URL of a bump map, i.e. a texture with surface normal vectors encoded in RGB values.
     * @property {color} color - (default: `rgb(1, 1, 1)`) The surface color.
     * @property {number} columns - (default: `1`) The amount of texture repetitions per row.
     * @property {color} emissiveColor - (default: `rgb(0, 0, 0)`) The color emitted by the surface. In other words, it glows in that color.
     * @property {number} opacity - (default: `1`) The surface's opacity, ranging from `0` (transparent) to `1` (opaque).
     * @property {number} rows - (default: `1`) The amount of texture repetitions per column.
     * @property {number} shininess - (default: `1`) The surface's shininess. The lower the shininess value, the matter the surface appears.
     * @property {string} source - (default: `""`) The URL of a texture.
     */
    class Material extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                color: this.rgb(1, 1, 1),
                emissiveColor: this.rgb(0, 0, 0),
                opacity: 1.0,
                shininess: 16,
                source: "",
                columns: 1,
                rows: 1,
                bumpSource: "",
                texture: null,
                bumpTexture: null,
                scheduledFunctions: []
            });

            this.notifyable("bumpSource");
            this.notifyable("color");
            this.notifyable("columns");
            this.notifyable("emissiveColor");
            this.notifyable("opacity");
            this.notifyable("rows");
            this.notifyable("shininess");
            this.notifyable("source");

            this.transitionable("color", this.colorInterpolate);
            this.transitionable("emissiveColor", this.colorInterpolate);

            this.registerEvent("invalidate");

            this.schedule((gl) => { this.initGl(gl); });
        }

        get emissiveColor() { return d.get(this).emissiveColor; }
        set emissiveColor(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).emissiveColor = col;
            this.emissiveColorChanged();
            this.invalidate();
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).color = col;
            this.colorChanged();
            this.invalidate();
        }

        get opacity() { return d.get(this).opacity; }
        set opacity(o)
        {
            d.get(this).opacity = o;
            this.opacityChanged();
            this.invalidate();
        }

        get shininess() { return d.get(this).shininess; }
        set shininess(s)
        {
            d.get(this).shininess = s;
            this.shininessChanged();
            this.invalidate();
        }

        get columns() { return d.get(this).columns; }
        set columns(c)
        {
            d.get(this).columns = c;
            this.columnsChanged();
            this.invalidate();
        }

        get rows() { return d.get(this).rows; }
        set rows(r)
        {
            d.get(this).rows = r;
            this.rowsChanged();
            this.invalidate();
        }

        get bumpSource() { return d.get(this).bumpSource; }
        set bumpSource(b)
        {
            const priv = d.get(this);
            priv.bumpSource = b;
            this.bumpSourceChanged();

            if (b === "")
            {
                this.invalidate();
                return;
            }

            const img = new Image();
            img.onload = this.safeCallback(() =>
            {
                //console.log("bump map loaded: " + b);
                this.schedule((gl) =>
                {
                    priv.bumpTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, priv.bumpTexture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                    gl.generateMipmap(gl.TEXTURE_2D)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.bindTexture(gl.TEXTURE_2D, null);

                });
                this.invalidate();
            });
            img.onerror = (err) =>
            {
                console.error("Failed to load bump map: " + b);
            }
            console.log("Loading bump map: " + b);
            img.src = shRequire.resource(b);
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);
            priv.source = s;
            this.sourceChanged();

            if (s === "")
            {
                this.invalidate();
                return;
            }

            const img = new Image();
            img.onload = this.safeCallback(() =>
            {
                //console.log("texture loaded: " + s);
                this.schedule((gl) =>
                {
                    priv.texture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, priv.texture);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                    gl.generateMipmap(gl.TEXTURE_2D)
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                    gl.bindTexture(gl.TEXTURE_2D, null);
                });
                this.invalidate();
            });
            img.onerror = (err) =>
            {
                console.error("Failed to load texture: " + s);
            }
            //console.log("Loading texture: " + s);
            img.src = shRequire.resource(s);
        }

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

        initGl(gl)
        {
            if (! programInfos.get(gl))
            {
                const programId = gl.createProgram();

                const vShaderId = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vShaderId, VERTEX_SHADER);
                gl.compileShader(vShaderId);
                if (! gl.getShaderParameter(vShaderId, gl.COMPILE_STATUS))
                {
                    const info = gl.getShaderInfoLog(vShaderId);
                    throw "Failed to compile vertex shader: " + info;
                }
                gl.attachShader(programId, vShaderId);
        
                const fShaderId = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fShaderId, FRAGMENT_SHADER);
                gl.compileShader(fShaderId);
                if (! gl.getShaderParameter(fShaderId, gl.COMPILE_STATUS))
                {
                    const info = gl.getShaderInfoLog(fShaderId);
                    throw "Failed to compile fragment shader: " + info;
                }
                gl.attachShader(programId, fShaderId);
        
                gl.linkProgram(programId);
                if (! gl.getProgramParameter(programId, gl.LINK_STATUS))
                {
                    const info = gl.getProgramInfoLog(programId);
                    throw "Failed to link GLSL program: " + info;
                }

                gl.useProgram(programId);
        
                programInfos.set(gl, {
                    id: programId,
                    uniforms: {
                        viewMatrix: gl.getUniformLocation(programId, "vm"),
                        objectMatrix: gl.getUniformLocation(programId, "om"),
                        normalMatrix: gl.getUniformLocation(programId, "nm"),
                        cameraLocation: gl.getUniformLocation(programId, "cameraLocation"),
                        ambience: gl.getUniformLocation(programId, "ambience"),
                        numLights: gl.getUniformLocation(programId, "numLights"),
                        lightPos: gl.getUniformLocation(programId, "lightPos"),
                        lightColor: gl.getUniformLocation(programId, "lightColor"),
                        lightRange: gl.getUniformLocation(programId, "lightRange"),
                        diffuseColor: gl.getUniformLocation(programId, "diffuseColor"),
                        emissiveColor: gl.getUniformLocation(programId, "emissiveColor"),
                        specularColor: gl.getUniformLocation(programId, "specularColor"),
                        opacity: gl.getUniformLocation(programId, "opacity"),
                        shininess: gl.getUniformLocation(programId, "shininess"),
                        hasTexture: gl.getUniformLocation(programId, "hasTexture"),
                        texture: gl.getUniformLocation(programId, "texture"),
                        hasBumpTexture: gl.getUniformLocation(programId, "hasBumpTexture"),
                        bumpTexture: gl.getUniformLocation(programId, "bumpTexture"),
                        textureRepeatS: gl.getUniformLocation(programId, "textureRepeatS"),
                        textureRepeatT: gl.getUniformLocation(programId, "textureRepeatT")
                    },
                    attribs: {
                        vertex: gl.getAttribLocation(programId, "vPos"),
                        normal: gl.getAttribLocation(programId, "vNormal"),
                        tangent: gl.getAttribLocation(programId, "vTangent"),
                        texture: gl.getAttribLocation(programId, "vTexCoord")
                    }
                });
            }
        }

        apply(gl, entityInfo)
        {
            // nothing to do
        }

        bind(gl, om, sceneInfo, entityInfo)
        {
            this.prepare(gl);

            const programInfo = programInfos.get(gl);
            const priv = d.get(this);

            gl.useProgram(programInfo.id);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.vertex);
            gl.vertexAttribPointer(programInfo.attribs.vertex, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.vertex);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.normal);
            gl.vertexAttribPointer(programInfo.attribs.normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.normal);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.tangent);
            gl.vertexAttribPointer(programInfo.attribs.tangent, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.tangent);

            gl.bindBuffer(gl.ARRAY_BUFFER, entityInfo.buffer.texture);
            gl.vertexAttribPointer(programInfo.attribs.texture, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribs.texture);

            // our matrices are row-major and must thus be transposed for OpenGL
            gl.uniformMatrix4fv(programInfo.uniforms.viewMatrix, false, new Float32Array(mat.flat(mat.t(sceneInfo.viewMatrix))));
            gl.uniformMatrix4fv(programInfo.uniforms.objectMatrix, false, new Float32Array(mat.flat(mat.t(om))));
            gl.uniformMatrix4fv(programInfo.uniforms.normalMatrix, false, new Float32Array(mat.flat(mat.inv(om))));  // transposed of transposed

            gl.uniform4fv(programInfo.uniforms.cameraLocation, new Float32Array(sceneInfo.cameraLocation));

            gl.uniform4fv(programInfo.uniforms.ambience, new Float32Array(sceneInfo.ambience.toArray()));

            gl.uniform4fv(programInfo.uniforms.diffuseColor, new Float32Array(priv.color.toArray()));
            gl.uniform4fv(programInfo.uniforms.emissiveColor, new Float32Array(priv.emissiveColor.toArray()));
            gl.uniform4fv(programInfo.uniforms.specularColor, new Float32Array([1, 1, 1, 1]));
            gl.uniform1f(programInfo.uniforms.shininess, priv.shininess);
            gl.uniform1f(programInfo.uniforms.opacity, priv.opacity);

            if (d.get(this).texture)
            {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, d.get(this).texture);
                gl.uniform1i(programInfo.uniforms.texture, 0);
                gl.uniform1i(programInfo.uniforms.hasTexture, 1);
                gl.uniform1f(programInfo.uniforms.textureRepeatS, priv.columns);
                gl.uniform1f(programInfo.uniforms.textureRepeatT, priv.rows);
            }
            else
            {
                gl.uniform1i(programInfo.uniforms.hasTexture, 0);
            }

            if (d.get(this).bumpTexture)
            {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, d.get(this).bumpTexture);
                gl.uniform1i(programInfo.uniforms.bumpTexture, 1);
                gl.uniform1i(programInfo.uniforms.hasBumpTexture, 1);
            }
            else
            {
                gl.uniform1i(programInfo.uniforms.hasBumpTexture, 0);
            }

            gl.uniform1i(programInfo.uniforms.numLights, sceneInfo.lights.length);
            if (sceneInfo.lights.length > 0)
            {
                const lightPositions = sceneInfo.lights.map(l => [l.x, l.y, l.z, 1.0]).reduce((a, b) => a.concat(b), []);
                const lightColors = sceneInfo.lights.map(l => l.color.toArray()).reduce((a, b) => a.concat(b), []);
                const lightRanges = sceneInfo.lights.map(l => l.range).reduce((a, b) => a.concat(b), []);
                gl.uniform4fv(programInfo.uniforms.lightPos, new Float32Array(lightPositions));
                gl.uniform4fv(programInfo.uniforms.lightColor, new Float32Array(lightColors));
                gl.uniform1fv(programInfo.uniforms.lightRange, new Float32Array(lightRanges));
            }
        }
    }
    exports.Material = Material;
});