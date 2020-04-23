/*******************************************************************************
This file is part of the Shellfish UI toolkit.
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

const modFs = require("fs"),
      modPath = require("path"),
      modProcess = require("process"),
      modBabel = require("@babel/core");

const BABEL_CONFIG = {
    ast: false,
    code: true,
    comments: false,
    minified: true
};

function help()
{
    console.log("Create a Shellfish bundle.");
    console.log("");
    console.log("Usage: node make-bundle.js <bundle-file> <path>");
    console.log("");
    console.log("with <bundle-file>   The name of the bundle file to create.");
    console.log("     <path>          The path to pack into the bundle.");
    console.log("");
}

function updateJsBundle(path)
{
    function findJs(prefix, location, path)
    {
        modFs.readdirSync(modPath.join(location, path)).forEach((name) =>
        {
            const filePath = modPath.join(path, name);
            const fullPath = modPath.join(location, filePath);
            const stats = modFs.statSync(fullPath);
            if (stats.isDirectory())
            {
                findJs(prefix, location, filePath);
            }
            else if (name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".shui"))
            {
                let sizeBefore = 0;
                let sizeAfter = 0;
                try
                {
                    let data = modFs.readFileSync(fullPath).toString("binary" /* as is */);
                    sizeBefore = Math.ceil(data.length / 1024);
                    if (name.endsWith("js"))
                    {
                        const result = modBabel.transform(data, BABEL_CONFIG);
                        data = result.code;
                    }
                    sizeAfter = Math.ceil(data.length / 1024);
                    const resourcePath = modPath.posix.join(prefix, filePath.replace(/\\/g, "/"));
                    jsBundle[resourcePath] = data;
                    console.log(` - ${fullPath} -> ${resourcePath} (${ sizeBefore !== sizeAfter ? "minified: " + sizeBefore + " K -> " + sizeAfter + " K" : sizeAfter + " K" })`);
                }
                catch (err)
                {
                    console.error(`Failed to read file: ${fullPath}`);
                    return;
                }
            }
        });
    }

    const jsBundle = { };
    findJs("", path, "");

    return JSON.stringify(jsBundle);
}

if (modProcess.argv.length !== 4 || modProcess.argv[2] === "-h")
{
    help();
    modProcess.exit(1);
}

const bundleFile = modProcess.argv[2];
const path = modProcess.argv[3];

if (! modFs.existsSync(path))
{
    console.error(`Path "${path}" does not exist. Aborting.`);
    modProcess.exit(1);
}

console.log(`Bundling path: ${path}`);
const bundle = updateJsBundle(path);
modFs.writeFileSync(bundleFile, bundle);
const stats = modFs.statSync(bundleFile);
console.log(`Bundle written successfully: ${bundleFile} (${Math.ceil(stats.size / 1024)} K)`);
