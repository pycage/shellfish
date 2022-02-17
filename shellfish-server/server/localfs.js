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

"use strict";

shRequire(["shellfish/core", "shellfish/core/mime"], function (core, mime)
{
    const modFs = require("fs");
    const modOs = require("os");

    class File
    {
        constructor(path)
        {
            this.path = path;
        }

        arrayBuffer()
        {
            return new Promise((resolve, reject) =>
            {
                let data = "";
                const stream = modFs.createReadStream(this.path);
                stream.on("data", chunk =>
                {
                    data += chunk;
                });
                stream.on("end", () =>
                {
                    resolve(data);
                });
                stream.on("error", err =>
                {
                    reject(err);
                });
            });
        }

        stream(from, to)
        {
            if (to !== undefined)
            {
                return modFs.createReadStream(this.path, { start: from, end: to });
            }
            else
            {
                return modFs.createReadStream(this.path);
            }
        }
    }

    function makeFileItem(path, filePath, name, stats)
    {
        const item = {
            path: filePath,
            dir: path,
            name: name,
            type: stats.isDirectory() ? "d" : "f",
            size: stats.size,
            mimetype: stats.isDirectory() ? "application/x-folder" : mime.mimeType(name),
            ctime: stats.ctime,
            mtime: stats.mtime
        };
        return item;
    }

    function fsExist(path)
    {
        return new Promise((resolve, reject) =>
        {
            modFs.access(path, modFs.constants.F_OK, err =>
            {
                resolve(! err);
            });
        });
    }

    function fsList(path)
    {
        return new Promise((resolve, reject) =>
        {
            modFs.readdir(path, (err, files) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(files);
                }
            });
        });
    }

    function fsMkdir(path)
    {
        return new Promise((resolve, reject) =>
        {
            modFs.mkdir(path, err =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve();
                }
            });
        });
    }

    function fsStat(path)
    {
        return new Promise((resolve, reject) =>
        {
            modFs.stat(path, (err, stats) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(stats);
                }
            });
        });
    }

    function fsRead(path)
    {
        return new Promise((resolve, reject) =>
        {
            modFs.readFile(path, (err, data) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(data);
                }
            });
        });
    }

    const d = new WeakMap();

    class LocalFS extends core.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
            });
        }

        get homeDirectory()
        {
            return this.normalizePath(modOs.homedir());
        }

        get tempDir()
        {
            return this.normalizePath(modOs.tmpdir());
        }

        normalizePath(path)
        {
            if (modOs.platform() === "win32")
            {
                path = path.replace(/\\/g, "/");
            }
            return super.normalizePath(path);
        }

        exists(path)
        {
            return fsExist(path);
        }
    
        list(path)
        {
            const priv = d.get(this);

            const f = async () =>
            {
                const result = [];
                const files = await fsList(path);
                for (let i = 0; i < files.length; ++i)
                {
                    const filePath = this.pathJoin(path, files[i]);
                    try
                    {
                        result.push(makeFileItem(path, filePath, files[i], await fsStat(filePath)));
                    }
                    catch (err)
                    {

                    }
                }
                return result;
            };

            return f();
        }

        mkdir(path)
        {
            return fsMkdir(path);
        }

        read(path)
        {
            const f = async () =>
            {
                return new File(path);
            };

            return f();
        }
    }
    exports.LocalFS = LocalFS;

});