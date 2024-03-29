/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

const modChildProcess = require("child_process"),
      modFs = require("fs"),
      modPath = require("path"),
      modBabel = require("./babel.min.js"),
      modFengshui = require("../shellfish-core/fengshui.js");


const MODULE_ID_REGEXP = new RegExp("\n? *exports\.__id *= *\"([^\"]+)\";");

const TEXT_TYPES = ["css", "js", "shui"];

const DATE = new Date().toISOString();
const GIT_AUTHOR = modChildProcess.execSync("git log -n 1 --format=%an HEAD").toString("utf8").replace(/\n/, "");
const GIT_HASH = modChildProcess.execSync("git log -n 1 --format=%H HEAD").toString("utf8").replace(/\n/, "");
const GIT_SHORTHASH = modChildProcess.execSync("git log -n 1 --format=%h HEAD").toString("utf8").replace(/\n/, "");

function help()
{
    console.log("Usage: node make-bundle.js [OPTION]... <bundle-file> <path>");
    console.log("Create a Shellfish bundle file for easy distribution.");
    console.log("");
    console.log("  -h, --help           Show this help.");
    console.log("  -l, --legacy         Translate modern ECMAScript to ES2015 standard to run in");
    console.log("                       legacy environments.");
    console.log("");
    console.log("  <bundle-file>        The name of the bundle file to create.");
    console.log("  <path>               The path to pack into the bundle.");
    console.log("");
}

function fillPlaceholders(s)
{
    return s.replace(/%PKG_DATE%/g, DATE)
            .replace(/%PKG_GIT_AUTHOR%/g, GIT_AUTHOR)
            .replace(/%PKG_GIT_HASH%/g, GIT_HASH)
            .replace(/%PKG_GIT_SHORTHASH%/g, GIT_SHORTHASH)
    ;
}

function updateBundle(path, config)
{
    const babelConfig = {
        ast: false,
        code: true,
        comments: false,
        minified: true
    };
    if (config.legacy)
    {
        babelConfig.presets = ["env"];
    }

    function findFiles(prefix, location, path)
    {
        modFs.readdirSync(modPath.join(location, path)).forEach((name) =>
        {
            const filePath = modPath.join(path, name);
            const fullPath = modPath.join(location, filePath);
            const stats = modFs.statSync(fullPath);

            const ext = name.toLowerCase().substr(name.lastIndexOf(".") + 1);

            if (stats.isDirectory())
            {
                findFiles(prefix, location, filePath);
            }
            else
            {
                let sizeBefore = 0;
                let sizeAfter = 0;
                try
                {
                    let resourcePath = modPath.posix.join(prefix, filePath.replace(/\\/g, "/"));
                    let binary = modFs.readFileSync(fullPath);
                    let data = "";
                    sizeBefore = Math.ceil(binary.length / 1024);
                    let actionTaken = "minified";

                    if (ext === "js")
                    {
                        // JS files get minified
                        const code = fillPlaceholders(binary.toString("utf8"));
                        const match = MODULE_ID_REGEXP.exec(code);
                        if (match && match[1])
                        {
                            bundle.aliases[match[1]] = resourcePath;
                        }
                        const result = modBabel.transform(code, babelConfig);
                        data = result.code;
                        bundle.formats[resourcePath] = "utf-8";
                    }
                    else if (ext === "shui")
                    {
                        // pre-compile Shui code
                        const shuiPath = resourcePath;
                        resourcePath = resourcePath + ".js";
                        const code = modFengshui.compile(shuiPath, fillPlaceholders(binary.toString("utf8")));
                        sizeBefore = Math.ceil(code.length / 1024);
                        const result = modBabel.transform(code, babelConfig);
                        bundle.aliases[shuiPath] = resourcePath;
                        data = result.code;
                        bundle.formats[resourcePath] = "utf-8";
                    }
                    else if (TEXT_TYPES.indexOf(ext) !== -1)
                    {
                        // other textual files are stored unchanged
                        data = binary.toString("utf8");
                        bundle.formats[resourcePath] = "utf-8";
                        actionTaken = "stored";
                    }
                    else
                    {
                        // binary files are base64-encoded
                        data = binary.toString("base64");
                        bundle.formats[resourcePath] = "base64";
                        actionTaken = "base64-encoded";
                    }
                    sizeAfter = Math.ceil(data.length / 1024);
                    bundle.resources[resourcePath] = data;
                    console.log(` - ${fullPath} -> ${resourcePath} (${ sizeBefore !== sizeAfter ? actionTaken + ": " + sizeBefore + " K -> " + sizeAfter + " K" : sizeAfter + " K" })`);
                }
                catch (err)
                {
                    console.error(`Failed to read file: ${fullPath}`);
                    console.error(err);
                    process.exit(1);
                }
            }
        });
    }

    const bundle = {
        version: 2,
        resources: { },
        aliases: { },
        formats: { }
    };
    findFiles("", path, "");

    return JSON.stringify(bundle, null, 2);
}

const config = {
    legacy: false
};

const args = process.argv.slice(2);
const paths = [];
while (args.length > 0)
{
    const arg = args.shift();
    if (arg === "-h" || arg === "--help")
    {
        help();
        process.exit(0);
    }
    else if (arg === "-l" || arg === "--legacy")
    {
        config.legacy = true;
    }
    else if (! arg.startsWith("-"))
    {
        paths.push(arg);
    }
    else
    {
        help();
        process.exit(1);
    }
}

if (paths.length !== 2)
{
    help();
    process.exit(1);
}

const bundleFile = paths[0];
const path = paths[1];

if (! modFs.existsSync(path))
{
    console.error(`Path "${path}" does not exist. Aborting.`);
    process.exit(1);
}

console.log(`Bundling path: ${path}`);
const bundle = updateBundle(path, config);
modFs.writeFileSync(bundleFile, bundle);
const stats = modFs.statSync(bundleFile);
console.log(`Bundle written successfully: ${bundleFile} (${Math.ceil(stats.size / 1024)} K)`);
