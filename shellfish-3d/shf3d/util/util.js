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

exports.PLUS = (a, b) => a + b;
exports.MINUS = (a, b) => a - b;

exports.surface = function (vs, ns, ts)
{
    const res = [];
    vs.forEach((nil, idx) =>
    {
        res.push({
            vertex: vs[idx],
            normal: ns[idx] !== undefined ? ns[idx] : -1,
            texture: ts[idx] !== undefined ? ts[idx] : -1
        });
    });
    return res;
};

exports.rectSurfaces = function (vs, ns, ts)
{
    return [
        exports.surface([vs[3], vs[2], vs[0]],
                        [ns[3] || -1, ns[2] || -1, ns[0] || -1],
                        [ts[3], ts[2], ts[0]]),
        exports.surface([vs[0], vs[2], vs[1]],
                        [ns[0] || -1, ns[2] || -1, ns[1] || -1],
                        [ts[0], ts[2], ts[1]])
    ];
}

exports.surfaceNormal = function (v1, v2, v3)
{
    const u = exports.elementWise(v2, v1, exports.MINUS);
    const v = exports.elementWise(v3, v1, exports.MINUS);

    const n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
    // normalize
    const l = exports.vectorLength(n);
    return n.map(a => a / l);
};

exports.interpolateVector = function (v1, v2)
{
    const delta = exports.elementWise(v1, v2, exports.MINUS);
    const deltaHalf = delta.map(d => d / 2);
    return exports.elementWise(v1, deltaHalf, exports.PLUS);
};

exports.vectorLength = function (v)
{
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

exports.surfaceTangent = function (v1, v2, v3, uv1, uv2, uv3)
{
    const e1 = exports.elementWise(v2, v1, exports.MINUS);
    const e2 = exports.elementWise(v3, v1, exports.MINUS);
    const deltaUv1 = exports.elementWise(uv2, uv1, exports.MINUS);
    const deltaUv2 = exports.elementWise(uv3, uv1, exports.MINUS);

    /*
    console.log("v1: " + JSON.stringify(v1));
    console.log("v2: " + JSON.stringify(v2));
    console.log("v3: " + JSON.stringify(v3));

    console.log("e1: " + JSON.stringify(e1));
    console.log("e2: " + JSON.stringify(e2));

    console.log("uv1: " + JSON.stringify(uv1));
    console.log("uv2: " + JSON.stringify(uv2));
    console.log("uv3: " + JSON.stringify(uv3));
    
    console.log("deltaUv1: " + JSON.stringify(deltaUv1));
    console.log("deltaUv2: " + JSON.stringify(deltaUv2));
    */

    let f = 0.0;
    let t = (deltaUv1[0] * deltaUv2[1] - deltaUv2[0] * deltaUv1[1]);
    if (t !== 0)
    {
        f = 1.0 / (deltaUv1[0] * deltaUv2[1] - deltaUv2[0] * deltaUv1[1]);
    }

    return [
        f * (deltaUv2[1] * e1[0] - deltaUv1[1] * e2[0]),
        f * (deltaUv2[1] * e1[1] - deltaUv1[1] * e2[1]),
        f * (deltaUv2[1] * e1[2] - deltaUv1[1] * e2[2])
    ];

};

exports.elementWise = function (v1, v2, op)
{
    return v1.map((a, idx) => op(a, v2[idx]));
};