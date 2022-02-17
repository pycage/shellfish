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

const TOKEN_NUMBER = /^-?[0-9]+(\.[0-9]+)?([eE]-?[0-9]+)?/;
const TOKEN_NAME = /^[^ \r\n]+/;
const TOKEN_NAME_WITH_SPACES = /^[^\r\n]+/;

function lineOfPos(data, pos)
{
    const lines = data.split("\n");
    let sum = 0;
    for (let line = 0; line < lines.length; ++line)
    {
        sum += lines[line].length + 1 /* the '\n' we split at */;
        if (sum > pos.value)
        {
            return line + 1;
        }
    }
    return -1;
}

function skipWhitespace(data, pos, skipNewline, skipComments)
{
    function skip(data, pos, what)
    {
        while (pos.value < data.length && what.indexOf(data[pos.value]) !== -1)
        {
            ++pos.value;
        }
    }

    while (pos.value < data.length)
    {
        skip(data, pos, skipNewline ? "\t\n\r\v " : "\t\r\v ");
        if (skipComments)
        {
            if (next(data, pos, "//"))
            {
                readUntilNewline(data, pos);
            }
            else if (next(data, pos, "/*"))
            {
                skipCommentBlock(data, pos);
            }
            else
            {
                break;
            }
        }
        else
        {
            break;
        }
    }
}

function skipCommentBlock(data, pos)
{
    let idx = data.indexOf("*/", pos.value);
    if (idx !== -1)
    {
        pos.value = idx + 2;
    }
    else
    {
        throw "Syntax error in line " + lineOfPos(data, pos) + ": end of comment block expected.";
    }
}

function next(data, pos, what)
{
    return data.substr(pos.value, what.length) === what;
}

function nextIsUpperCase(data, pos)
{
    let c = data[pos.value];
    return (c >= 'A' && c <= 'Z');
}

function nextIsToken(data, pos, regExp)
{
    if (pos.value < data.length)
    {
        return regExp.test(data.substr(pos.value));
    }
    else
    {
        return false;
    }
}

function expect(data, pos, what)
{
    if (data.substr(pos.value, what.length) === what)
    {
        pos.value += what.length;
        return what;
    }
    else
    {
        console.log(data.substr(pos.value, 80));
        throw "Syntax error in line " + lineOfPos(data, pos) + ": '" + what + "' expected.";
    }
}

function readUntil(data, pos, chars)
{
    // read until, but not including the given characters
    let s = "";
    while (pos.value < data.length && chars.indexOf(data[pos.value]) === -1)
    {
        s += data[pos.value];
        ++pos.value;
    }
    return s;
}

function readUntilNewline(data, pos)
{
    // read until, but not including, newline
    let s = readUntil(data, pos, "\r\n");
    return s;
}

function readToken(data, pos, regExp)
{
    let s = "";
    if (pos.value < data.length)
    {
        let matches = regExp.exec(data.substr(pos.value));
        if (matches)
        {
            let result = matches[0];
            pos.value += result.length;
            //console.log("read token: " + result);
            return result;
        }
    }
    return "";
}

function readString(data, pos)
{
    if (pos.value >= data.length)
    {
        return "";
    }

    let delimiter = "";
    if (data[pos.value] === "'")
    {
        delimiter = "'";
        ++pos.value;
    }
    else if (data[pos.value] === "\"")
    {
        delimiter = "\"";
        ++pos.value;
    }

    let result = "";
    while (pos.value < data.length)
    {
        if (delimiter !== "" && data[pos.value] === delimiter)
        {
            ++pos.value;
            break;
        }
        else if (delimiter === "" && "\t\n\r\v ".indexOf(data[pos.value]) !== -1)
        {
            break;
        }
        else if (next(data, pos, "\\n"))
        {
            result += "\\n";
            ++pos.value;
        }
        else if (data[pos.value] === "\\")
        {

        }
        else
        {
            result += data[pos.value];
        }
        ++pos.value;
    }

    //console.log("string: " + result);
    return result;
}

function parseEntry(data, pos, obj)
{
    if (next(data, pos, "#"))
    {
        readUntilNewline(data, pos);
        return;
    }

    const cmd = readToken(data, pos, /^[#a-z_]+/i);
    skipWhitespace(data, pos, false, true);
    switch (cmd)
    {
    case "f":
        const f = parseFace(data, pos, obj.v.length, obj.vt.length, obj.vn.length);
        if (f.length > 3)
        {
            fs = splitFace(f);
            obj.surfaces.push(...fs);
        }
        else
        {
            obj.surfaces.push(f);
        }
        obj.material.ranges[obj.material.ranges.length - 1].to = obj.surfaces.length - 1;
        break;
    case "g":
        readUntilNewline(data, pos);
        break;
    case "mtllib":
        skipWhitespace(data, pos, false, true);
        libs = parseFilenames(data, pos);
        obj.material.libraries.push(...libs);
        break;
    case "s":
        readUntilNewline(data, pos);
        break;
    case "usemtl":
        skipWhitespace(data, pos, false, true);
        const mtlName = readToken(data, pos, TOKEN_NAME);
        obj.material.ranges.push({
            name: mtlName,
            from: obj.surfaces.length,
            to: -1
        });
        break;
    case "v":
        const v = parseVertex(data, pos);
        obj.v.push(v);
        break;
    case "vn":
        const vn = parseVertex(data, pos);
        obj.vn.push(vn);
        break;
    case "vt":
        const vt = parseVertex(data, pos);
        if (vt[0] < 0) vt[0] = 1 + vt[0];
        if (vt[0] > 1) vt[0] = 2 - vt[0];
        if (vt[1] < 0) vt[1] = 1 + vt[1];
        if (vt[1] > 1) vt[1] = 2 - vt[1];
        obj.vt.push(vt);
        break;
    default:
        readUntilNewline(data, pos);
        console.error("Unsupported entry in obj file: " + cmd);
    }
}

function parseFilenames(data, pos)
{
    const filenames = [];
    while (pos.value < data.length)
    {
        const name = readToken(data, pos, TOKEN_NAME_WITH_SPACES);
        filenames.push(name);
        skipWhitespace(data, pos, false, true);
        if (! nextIsToken(data, pos, TOKEN_NAME))
        {
            break;
        }
    }
    return filenames;
}

function parseVertex(data, pos)
{
    const v = [];
    v.push(Number.parseFloat(readToken(data, pos, TOKEN_NUMBER)));
    skipWhitespace(data, pos, false, true);
    v.push(Number.parseFloat(readToken(data, pos, TOKEN_NUMBER)));
    skipWhitespace(data, pos, false, true);
    if (nextIsToken(data, pos, TOKEN_NUMBER))
    {
        v.push(Number.parseFloat(readToken(data, pos, TOKEN_NUMBER)));
        skipWhitespace(data, pos, false, true);
    }
    else
    {
        v.push(0.0);
    }
    if (nextIsToken(data, pos, TOKEN_NUMBER))
    {
        v.push(Number.parseFloat(readToken(data, pos, TOKEN_NUMBER)));
    }
    else
    {
        v.push(1.0);
    }
    return v;
}

function parseFace(data, pos, vAmount, vtAmount, vnAmount)
{
    const f = [];
    while (pos.value < data.length)
    {
        f.push(parseFaceTuple(data, pos, vAmount, vtAmount, vnAmount));
        skipWhitespace(data, pos, false, true);
        if (! nextIsToken(data, pos, TOKEN_NUMBER))
        {
            break;
        }
    }
    return f;
}

function parseFaceTuple(data, pos, vAmount, vtAmount, vnAmount)
{
    const tuple = {
        v: -1,
        vt: -1,
        vn: -1
    };

    // always subtract 1 because we start counting at 0
    tuple.v = Number.parseInt(readToken(data, pos, TOKEN_NUMBER)) - 1;
    if (tuple.v < 0)
    {
        tuple.v = vAmount + tuple.v + 1;
    }
    if (next(data, pos, "/"))
    {
        expect(data, pos, "/");
        if (nextIsToken(data, pos, TOKEN_NUMBER))
        {
            tuple.vt = Number.parseInt(readToken(data, pos, TOKEN_NUMBER)) - 1;
            if (tuple.vt < 0)
            {
                tuple.vt = vtAmount + tuple.vt + 1;
            }
        }
        if (next(data, pos, "/"))
        {
            expect(data, pos, "/");
            if (nextIsToken(data, pos, TOKEN_NUMBER))
            {
                tuple.vn = Number.parseInt(readToken(data, pos, TOKEN_NUMBER)) - 1;
                if (tuple.vn < 0)
                {
                    tuple.vn = vnAmount + tuple.vn + 1;
                }
            }
        }
    }

    return tuple;
}

function splitFace(f)
{
    const fs = [];
    const tuple1 = f[0];
    for (let i = 1; i < f.length; ++i)
    {
        const tuple2 = f[(i) % f.length];
        const tuple3 = f[(i + 1) % f.length];
        fs.push([tuple1, tuple2, tuple3]);
    }
    return fs;
}

exports.parseObj = function (data)
{
    const obj = {
        v: [],
        vt: [],
        vn: [],
        surfaces: [],
        material: {
            libraries: [],
            ranges: [{ name: "", from: 0, to: -1 }]
        }
    };

    const pos = { value: 0 };
    while (pos.value < data.length)
    {
        parseEntry(data, pos, obj);
        skipWhitespace(data, pos, true, true);
    }

    //console.log(obj);
    return obj;
};

function parseMtlColor(data, pos)
{
    if (nextIsToken(data, pos, TOKEN_NUMBER))
    {
        let r = Number.parseFloat(readToken(data, pos, TOKEN_NUMBER));
        let g = r;
        let b = r;

        skipWhitespace(data, pos, false, true);
        if (nextIsToken(data, pos, TOKEN_NUMBER))
        {
            g = Number.parseFloat(readToken(data, pos, TOKEN_NUMBER));
            skipWhitespace(data, pos, false, true);
            b = Number.parseFloat(readToken(data, pos, TOKEN_NUMBER));
        }

        return [r, g, b];
    }
    else
    {
        // unsupported
        return [0, 0, 0];
    }
}

function parseMtlMap(data, pos)
{
    if (next(data, pos, "-"))
    {
        // texture map options unsupported by now
        readUntilNewline(data, pos);
        return "";
    }
    return readToken(data, pos, TOKEN_NAME_WITH_SPACES);
}

function parseMtlEntry(data, pos, mtl)
{
    const cmd = readToken(data, pos, /^[a-z_]+/i);
    skipWhitespace(data, pos, false, true);
    switch (cmd)
    {
    case "newmtl":
        const mtlName = readToken(data, pos, TOKEN_NAME);
        mtl.materials.push({
            name: mtlName,
            ka: [0, 0, 0],
            kd: [1, 1, 1],
            ks: [0, 0, 0],
            ns: 1,
            d: 1.0,
            kdMap: "",
            bumpMap: ""
        });
        break;

    case "d":
        mtl.materials[mtl.materials.length - 1].d = readToken(data, pos, TOKEN_NUMBER);
        break;

    case "Ka":
        mtl.materials[mtl.materials.length - 1].ka = parseMtlColor(data, pos);
        break;

    case "Kd":
        mtl.materials[mtl.materials.length - 1].kd = parseMtlColor(data, pos);
        break;

    case "map_Kd":
        mtl.materials[mtl.materials.length - 1].kdMap = parseMtlMap(data, pos);
        console.log("parsed mapKd: " + mtl.materials[mtl.materials.length - 1].kdMap);
        break;

    case "map_Bump":
        mtl.materials[mtl.materials.length - 1].bumpMap = parseMtlMap(data, pos);
        console.log("parsed bump map: " + mtl.materials[mtl.materials.length - 1].bumpMap);
        break;

    case "Ks":
        mtl.materials[mtl.materials.length - 1].ks = parseMtlColor(data, pos);
        break;

    case "Ns":
        mtl.materials[mtl.materials.length - 1].ns = Number.parseFloat(readToken(data, pos, TOKEN_NUMBER));
        break;

    default:
        readUntilNewline(data, pos);
        //console.error("Unsupported entry in mtl file: " + cmd);
    }
}


exports.parseMtl = function (data)
{
    const mtl = {
        materials: []
    };

    const pos = { value: 0 };
    while (pos.value < data.length)
    {
        parseMtlEntry(data, pos, mtl);
        skipWhitespace(data, pos, true, true);
    }

    //console.log(mtl);
    return mtl;
};
