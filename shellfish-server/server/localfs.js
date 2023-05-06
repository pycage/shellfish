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
    const modPath = require("path");
    const modStream = require("stream");

    class File
    {
        constructor(finfo, buffer)
        {
            this.path = finfo.path;
            this.buffer = buffer;
            this.from = 0;
            this.to = -1;
            this.finfo = finfo;
        }

        get size() { return this.finfo.size; }
        get mimetype() { return this.finfo.mimetype; }

        slice(from, to)
        {
            const f = new File(this.finfo, this.buffer);
            f.from = from;
            f.to = to;
            return f;
        }

        arrayBuffer()
        {
            return new Promise((resolve, reject) =>
            {
                if (this.buffer)
                {
                    if (this.to > this.from)
                    {
                        return this.buffer.slice(this.from, this.to);
                    }
                    else
                    {
                        return this.buffer;
                    }
                }

                const chunks = [];
                const stream = modFs.createReadStream(this.path, { encoding: "binary" });
                stream.on("data", chunk =>
                {
                    chunks.push(Buffer.from(chunk, "binary"));
                });
                stream.on("end", () =>
                {
                    if (this.to > this.from)
                    {
                        resolve(Buffer.concat(chunks).slice(this.from, this.to));
                    }
                    else
                    {
                        resolve(Buffer.concat(chunks));
                    }
                });
                stream.on("error", err =>
                {
                    reject(err);
                });
            });
        }

        stream()
        {
            if (this.buffer)
            {
                if (this.to > this.from)
                {
                    async function * generate(buffer) { yield buffer; }
                    const s = modStream.Readable.from(generate(this.buffer.slice(this.from, this.to)));
                    return s;
                }
                else
                {
                    async function * generate(buffer) { yield buffer; }
                    const s = modStream.Readable.from(generate(this.buffer));
                    return s;
                }
            }
            else
            {
                if (this.to > this.from)
                {
                    return modFs.createReadStream(this.path, { start: this.from, end: this.to });
                }
                else
                {
                    return modFs.createReadStream(this.path);
                }
            }

        }

        text()
        {
            return this.arrayBuffer();
        }
    }
    exports.File = File;

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

    function fsCopy(sourcePath, destPath)
    {
        return new Promise(async (resolve, reject) =>
        {
            const stats = await fsStat(sourcePath);
            if (stats.isDirectory())
            {
                await fsMkdir(destPath);

                const files = await fsList(sourcePath);
                for (let i = 0; i < files.length; ++i)
                {
                    try
                    {
                        await fsCopy(modPath.join(sourcePath, files[i]),
                                     modPath.join(destPath, files[i]));
                    }
                    catch (err)
                    {

                    }
                }

                resolve();
            }
            else
            {
                modFs.copyFile(sourcePath, destPath, err =>
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
            }
        });
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

    function fsRename(sourcePath, destPath)
    {
        return new Promise((resolve, reject) =>
        {
            console.log("MOVE " + sourcePath + " -> " + destPath);
            modFs.rename(sourcePath, destPath, err =>
            {
                if (err)
                {
                    console.error(err);
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

    function fsRemove(path)
    {
        path = modPath.normalize(path);

        return new Promise(async (resolve, reject) =>
        {
            const stats = await fsStat(path);
            if (stats.isDirectory())
            {
                const files = await fsList(path);
                for (let i = 0; i < files.length; ++i)
                {
                    await fsRemove(modPath.join(path, files[i]));
                }

                modFs.rmdir(path, err =>
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
            }
            else
            {
                modFs.unlink(path, err =>
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
            }
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

    /**
     * Class for accessing the local filesystem on the server side.
     * 
     * @extends core.Filesystem
     * @memberof server
     */
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

        mkdir(path, name)
        {
            return fsMkdir(this.pathJoin(path, name));
        }

        move(sourcePath, destPath)
        {
            return fsRename(modPath.normalize(sourcePath),
                            modPath.normalize(destPath));
        }

        copy(sourcePath, destPath)
        {
            return fsCopy(modPath.normalize(sourcePath),
                          modPath.normalize(destPath));
        }

        remove(path)
        {
            return fsRemove(path);
        }

        read(path)
        {
            const f = async () =>
            {
                const finfo = await this.fileInfo(path);
                return new File(finfo);
            };

            return f();
        }

        write(path, stream)
        {
            return new Promise((resolve, reject) =>
            {
                modFs.open(path, "w", (err, fd) =>
                {
                    if (err)
                    {
                        reject(err);
                        return;
                    }

                    const writeStream = modFs.createWriteStream("", { fd });

                    writeStream.on("finish", () =>
                    {
                        resolve();
                    });

                    if (typeof stream === "string")
                    {
                        writeStream.write(stream);
                        writeStream.end();
                    }
                    else
                    {
                        stream.on("data", data =>
                        {
                            writeStream.write(data);
                        });
    
                        stream.on("end", () =>
                        {
                            writeStream.end();
                        });
                    }
                });
            });
        }
    }
    exports.LocalFS = LocalFS;

});