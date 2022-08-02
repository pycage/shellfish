/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
         * All path components must be encoded (@see {html.Filesystem#encodeName}).
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
            throw "Not implemented";
        }

        /**
         * Retrieves a file info object for the given path.
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
                const blob = await this.read(sourcePath);
                await this.write(destPath, blob);
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
         * @returns {Promise} - The Promise object with the file's contents as Blob.
         */
        read(path)
        {
            throw "Not implemented";
        }

        /**
         * Writes the given Blob to the given path.
         * 
         * @param {string} path - The path of the file to write.
         * @param {Blob} blob - The Blob of data to write.
         * @returns {Promise} The Promise object.
         */
        write(path, blob)
        {
            throw "Not implemented";
        }
    }
    exports.Filesystem = Filesystem;
});