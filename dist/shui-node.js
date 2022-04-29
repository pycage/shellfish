/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2022 Martin Grimme <martin.grimme@gmail.com>

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

const modPath = require("path");

console.log("[Shui Node]");

const js = process.argv.filter((item, idx) =>
{
    return idx > 1 && item.toLowerCase().endsWith(".js");
});

const shuis = process.argv.filter((item, idx) =>
{
    return idx > 1 && item.toLowerCase().endsWith(".shui");
})
.map(p => modPath.resolve(p).split(modPath.sep).join(modPath.posix.sep));

const bundles = process.argv.filter((item, idx) =>
{
    return idx > 1 && item.toLowerCase().endsWith(".pkg");
});

if (js.length === 0)
{
    console.log("Runs Shui code on node.");
    console.log("");
    console.log("Usage: node shui-node.js <shui-file> <require.js> [<bundle file>...]");
    process.exit(1);
}

let haveError = false;

global.shellfishRun = true;
js.forEach(f =>
{
    try
    {
        require(modPath.resolve(f));
    }
    catch (err)
    {
        console.error("Failed to import: " + f);
        console.error(err);
        haveError = true;
    }
});

if (typeof shellfishRun !== "function")
{
    console.error("Shellfish runtime not found.");
    haveError = true;
}

if (haveError)
{
    console.log("Aborting on fatal error.");
    process.exit(1);
}

shellfishRun(bundles, shRequire =>
{
    shRequire(["shui-loader.js"], loader =>
    {
        shuis.forEach(shui => loader.load(shui));
    });
});
