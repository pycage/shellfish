/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/object.js"], obj =>
{
    const modFs = shRequire.environment === "node" ? require("node:fs") : null;
    const modStream = shRequire.environment === "node" ? require("node:stream") : null;

    /**
     * Class representing file data for reading or writing.
     * 
     * @memberof core.Filesystem
     * 
     * @property {number} size - The data size in bytes.
     * @property {string} mimetype - The MIME type of the data.
     */
    class FileData
    {
        /**
         * Creates a new `FileData` object from the given data source.
         * 
         * @param {string|ArrayBuffer|ReadableStream|Blob|FileInfo} dataSource - The data source.
         */
        constructor(dataSource)
        {
            this.sourceType = "unknown";
            this.from = 0;
            this.to = -1;

            if (! dataSource)
            {
                this.sourceType = "string";
                this.dataSource = "";
            }
            else if (dataSource.constructor.name === "ArrayBuffer")
            {
                this.sourceType = "buffer";
                this.dataSource = dataSource;
            }
            else if (dataSource.constructor.name === "Blob")
            {
                this.sourceType = "blob";
                this.dataSource = dataSource;
            }
            else if (dataSource.constructor.name === "File")
            {
                this.sourceType = "blob";
                this.dataSource = dataSource;
            }
            else if (typeof dataSource === "string")
            {
                this.sourceType = "buffer";
                this.dataSource = new TextEncoder().encode(dataSource);
            }
            else if (typeof dataSource.read === "function" || dataSource.rawHeaders)
            {
                this.sourceType = "stream";
                this.dataSource = dataSource;
            }
            else if (dataSource.path)
            {
                this.sourceType = "finfo";
                this.dataSource = dataSource;
            }
            //console.log("Create FileData of type " + this.sourceType);
        }

        get size()
        {
            if (this.sourceType === "finfo" || this.sourceType === "blob")
            {
                return this.dataSource.size;
            }
            else if (this.sourceType === "buffer" || this.sourceType === "string")
            {
                return this.dataSource.length;
            }
            else
            {
                return 0;
            }
        }

        get mimetype()
        {
            if (this.sourceType === "finfo")
            {
                return this.dataSource.mimetype;
            }
            else if (this.sourceType === "blob")
            {
                return this.dataSource.type;
            }
            else
            {
                return "application/octet-stream";
            }
        }

        /**
         * Returns a sliced version of this `FileData` object.
         * 
         * @param {number} from - The start position in bytes of the slice.
         * @param {number} to - The (non-inclusive) end position in bytes of the slice.
         * @returns {core.Filesystem.FileData} A new `FileData` object.
         */
        slice(from, to)
        {
            const f = new FileData(this.dataSource);
            f.from = from;
            f.to = to;
            return f;
        }

        /**
         * Returns a promise that resolves to the data as ArrayBuffer.
         * 
         * @returns {Promise<ArrayBuffer>} A promise that resolves to an ArrayBuffer.
         */
        async arrayBuffer()
        {
            if (this.sourceType === "blob")
            {
                if (this.to > this.from)
                {
                    return (await this.dataSource.arrayBuffer()).slice(this.from, this.to);
                }
                else
                {
                    return await this.dataSource.arrayBuffer();
                }
            }
            else if (this.sourceType === "buffer")
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
            else if (this.sourceType === "finfo" && modFs)
            {
                const streamReader = new Promise((resolve, reject) =>
                {
                    const chunks = [];
                    const stream = modFs.createReadStream(this.dataSource.path, { encoding: "binary" });
                    stream.on("data", chunk =>
                    {
                        chunks.push(Buffer.from(chunk, "binary"));
                    });
                    stream.on("end", () =>
                    {
                        let buffer = null;
                        if (this.to > this.from)
                        {
                            buffer = Buffer.concat(chunks).slice(this.from, this.to);
                        }
                        else
                        {
                            buffer = Buffer.concat(chunks);
                        }
                        resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
                    });
                    stream.on("error", err =>
                    {
                        reject(err);
                    });
                });

                return await streamReader;
            }
            else if (this.sourceType === "stream" && modStream)
            {
                const chunks = [];
                const stream = this.dataSource;
                stream.on("data", chunk =>
                {
                    chunks.push(Buffer.from(chunk, "binary"));
                });
                stream.on("end", () =>
                {
                    if (this.to > this.from)
                    {
                        return Buffer.concat(chunks).slice(this.from, this.to);
                    }
                    else
                    {
                        return Buffer.concat(chunks);
                    }
                });
                stream.on("error", err =>
                {
                    throw err;
                });
            }
            else
            {
                console.error("Unsupported FileData source type: " + this.sourceType);
                return null;
            }
        }

        /**
         * Returns a Blob with the data.
         * 
         * @returns {Blob} A Blob with the data.
         */
        blob()
        {
            if (this.sourceType === "blob")
            {
                return this.dataSource;
            }
            else if (this.sourceType === "buffer")
            {
                return new Blob([this.dataSource]);
            }
            else
            {
                return null;
            }
        }

        /**
         * Returns a readable stream for reading from the data.
         * 
         * @returns {ReadStream} A readable stream.
         */
        stream()
        {
            if (! modStream)
            {
                return null;
            }

            if (this.sourceType === "stream")
            {
                return this.dataSource;
            }
            else if (this.sourceType === "buffer")
            {
                if (this.to > this.from)
                {
                    async function * generate(buffer) { yield buffer; }
                    const s = modStream.Readable.from(generate(new Uint8Array(this.dataSource.slice(this.from, this.to))));
                    return s;
                }
                else
                {
                    async function * generate(buffer) { yield buffer; }
                    const s = modStream.Readable.from(generate(new Uint8Array(this.dataSource)));
                    return s;
                }
            }
            else if (this.sourceType === "finfo")
            {
                if (this.to > this.from)
                {
                    return modFs.createReadStream(this.dataSource.path, { start: this.from, end: this.to });
                }
                else
                {
                    return modFs.createReadStream(this.dataSource.path);
                }
            }
            else
            {
                console.error("Unsupported FileData source type: " + this.sourceType);
                return null;
            }
        }

        /**
         * Returns a Promise that resolves to a string with the data.
         * 
         * @returns {Promise<string>} A Promise that resolves to a string.
         */
        async text()
        {
            return new TextDecoder().decode(await this.arrayBuffer());
        }
    }
    exports.FileData = FileData;


    /**
     * Base class for filesystem implementations.
     * 
     * @extends core.Object
     * @memberof core
     */
    class Filesystem extends obj.Object
    {
        constructor()
        {
            super();

            /**
             * Is triggered when something on the filesystem changed.
             * @event fsChange
             * @memberof html.Filesystem
             */
             this.registerEvent("fsChange");
        }

        /**
         * Normalizes the given path.
         * 
         * @param {string} path - The path to normalize.
         * @returns {string} The normalized path.
         */
        normalizePath(path)
        {
            return path.replace(/\/\/+/g, "/").replace(/\/$/, "") || "/";
        }
        
        /**
         * Joins a list of path components.
         * 
         * All path components must be encoded (@see {@link core.Filesystem#encodeName}).
         * 
         * @param  {string[]} args - The path components.
         * @returns {string} - The resulting path.
         */
        pathJoin(...args)
        {
            return this.normalizePath(args.join("/"));
        }
    
        /**
         * Returns the directory part of the given path.
         * 
         * @param {string} path - The path.
         * @returns {string} The directory part of the path.
         */
        dirname(path)
        {
            const pos = path.lastIndexOf("/");
            if (pos !== -1)
            {
                return this.normalizePath(path.substring(0, pos));
            }
            else
            {
                return "/";
            }
        }
    
        /**
         * Returns the file part of the given path.
         * 
         * @param {string} path - The path.
         * @returns {string} The file part of the path.
         */
        filename(path)
        {
            const pos = path.lastIndexOf("/");
            if (pos !== -1)
            {
                return path.substring(pos + 1);
            }
            else
            {
                return path;
            }
        }

        /**
         * Encodes the given file name to be used within paths.
         * 
         * Some file systems require file names to be encoded and you must
         * encode file names when composing file system paths. On file systems
         * that do not require encoding, this method simply returns the name
         * unchanged.
         * 
         * @param {string} name - The name to encode.
         * @returns {string} The encoded name. 
         */
        encodeName(name)
        {
            return name;
        }

        /**
         * Checks if the given path exists and returns a boolean Promise object.
         * 
         * @param {string} path - The path to check for.
         * @returns {Promise} The boolean Promise object.
         */
        exists(path)
        {
            const f = async () =>
            {
                const dir = this.dirname(path);
                const filename = this.filename(path);

                const files = await this.list(dir);
                return files.findIndex(item => item.name === filename) !== -1;
            };
            return f();
        }

        /**
         * Retrieves a file info object for the given path.
         * 
         * A file info object is a plain dictionary object with several
         * entries describing a file or directory.
         * 
         * For example:
         * ```
         * {
         *     path: "/etc/fstab",       // the full path
         *     dir: "/etc",              // the path to the parent directory
         *     name: "fstab",            // the filename
         *     type: "f",                // either "f" for files or "d" for directories
         *     size: 120,                // the file size in bytes
         *     mimetype: "text/plain",   // the MIME type of the file
         *     ctime: 1690621908,        // the creation time as a Unix timestamp
         *     mtime: 1690621908         // the modification time as a Unix timestamp
         * }
         * ```
         * 
         * @param {string} path - The path.
         * @returns {Promise} The Promise object.
         */
        fileInfo(path)
        {
            return new Promise(async (resolve, reject) =>
            {
                if (path === "/")
                {
                    resolve({
                        path: "/",
                        dir: "/",
                        name: "",
                        type: "d",
                        size: 0,
                        mimetype: "application/x-folder",
                        ctime: 0,
                        mtime: 0
                    });
                }
                else
                {
                    if (path.endsWith("/"))
                    {
                        path = path.substring(0, path.length - 1);
                    }
                    try
                    {
                        const files = await this.list(this.dirname(path));
                        const info = files.find(f => f.path === path);
                        if (info)
                        {
                            resolve(info);
                        }
                        else
                        {
                            reject("'" + path + "' not found");
                        }
                        //resolve(info || null);
                    }
                    catch (err)
                    {
                        //resolve(null);
                        reject(err);
                    }
                }
            });
        }

        /**
         * Lists the files at the given path and returns a Promise object with the file items.
         * 
         * @param {string} path - The path to list.
         * @returns {Promise} The Promise object.
         */
        list(path)
        {
            throw "Not implemented";
        }

        /**
         * Searches for files matching a query and returns a Promise object with the file items.
         * The format of the query string is defined by the particular implementation.
         * 
         * @param {string} path - The path to search.
         * @param {string} query - The search query.
         * @returns {Promise} The Promise object.
         */
        search(path, query)
        {
            return new Promise((resolve, reject) =>
            {
                resolve([]);
            });
        }

        /**
         * Creates a new directory at the given path.
         * 
         * @param {string} path - The path where to create a new directory.
         * @param {string} name - The name of the new directory.
         * @returns {Promise} The Promise object.
         */
        mkdir(path, name)
        {
            throw "Not implemented";
        }

        /**
         * Creates a hierarchy of directories.
         * 
         * @param {string} path - The hierarchy of directories to create.
         * @returns {Promise} The Promise object.
         */
        mkdirs(path)
        {
            const mkdirRecursive = async path =>
            {
                if (! await this.exists(path))
                {
                    const parentPath = this.dirname(path);
                    const name = this.filename(path);
                    if (! await this.exists(parentPath))
                    {
                        await mkdirRecursive(parentPath);
                    }
                    await this.mkdir(parentPath, name);
                }
            };

            return mkdirRecursive(path);
        }

        /**
         * Moves a file.
         * 
         * @param {string} sourcePath - The source path.
         * @param {string} destPath - The destination path.
         * @returns {Promise} The Promise object.
         */
        move(sourcePath, destPath)
        {
            throw "Not implemented";
        }

        /**
         * Copies a file. Implementations should override this for remote filesystems.
         * 
         * @param {string} sourcePath - The source path.
         * @param {string} destPath - The destination path.
         * @returns {Promise} The Promise object.
         */
        copy(sourcePath, destPath)
        {
            const f = async () =>
            {
                const fileData = await this.read(sourcePath);
                await this.write(destPath, fileData);
            };
            return f();
        }

        /**
         * Removes the given path.
         * 
         * @param {string} path - The path to remove.
         * @returns {Promise} The Promise object.
         */
        remove(path)
        {
            throw "Not implemented";
        }

        /**
         * Reads the file at the given path and returns a Promise object with the
         * Blob.
         * 
         * @param {string} path - The path of the file to read.
         * @param {function} progressCallback - An optional progress callback, if supported by the implementation.
         * @returns {Promise} - The Promise object with the file's contents as {@link core.Filesystem.FileData}.
         */
        read(path, progressCallback)
        {
            throw "Not implemented";
        }

        /**
         * Writes the given Blob to the given path.
         * 
         * @param {string} path - The path of the file to write.
         * @param {core.Filesystem.FileData} fileData - The data to write.
         * @param {function} progressCallback - An optional progress callback, if supported by the implementation.
         * @returns {Promise} The Promise object.
         */
        write(path, fileData, progressCallback)
        {
            throw "Not implemented";
        }
    }
    exports.Filesystem = Filesystem;
});