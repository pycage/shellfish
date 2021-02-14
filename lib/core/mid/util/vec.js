/*******************************************************************************
This file is part of Shellfish.
Copyright (c) 2021 Martin Grimme <martin.grimme@gmail.com>

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

exports.__id = "shellfish/vector";

exports.vec2 = function (x, y)
{
    return {
        x,
        y,
        length: function () { return vec2Length(this); },
        scale: function (s) { return vec2Scale(this, s); },
        add: function (other) { return vec2Add(this, other); },
        subtract: function (other) { return vec2Subtract(this, other); }
    };
};

function vec2Length(v)
{
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vec2Scale(v, s)
{
    return exports.vec2(
        v.x * s,
        v.y * s
    );
}

function vec2Add(v1, v2)
{
    return exports.vec2(
        v1.x + v2.x,
        v1.y + v2.y
    );
}

function vec2Subtract(v1, v2)
{
    return exports.vec2(
        v1.x - v2.x,
        v1.y - v2.y
    );
}

exports.vec2Interpolate = function (v1, v2, x)
{
    return v1.add(v2.subtract(v1).scale(x));
};


exports.vec3 = function (x, y, z)
{
    return {
        x,
        y,
        z,
        length: function () { return vec3Length(this); },
        scale: function (s) { return vec3Scale(this, s); },
        add: function (other) { return vec3Add(this, other); },
        subtract: function (other) { return vec3Subtract(this, other); }
    };
};

function vec3Length(v)
{
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Scale(v, s)
{
    return exports.vec3(
        v.x * s,
        v.y * s,
        v.z * s
    );
}

function vec3Add(v1, v2)
{
    return exports.vec3(
        v1.x + v2.x,
        v1.y + v2.y,
        v1.z + v2.z
    );
}

function vec3Subtract(v1, v2)
{
    return exports.vec3(
        v1.x - v2.x,
        v1.y - v2.y,
        v1.z - v2.z
    );
}

exports.vec3Interpolate = function (v1, v2, x)
{
    return v1.add(v2.subtract(v1).scale(x));
};
