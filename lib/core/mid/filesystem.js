/*******************************************************************************
This file is part of the Shellfish UI toolkit.
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

shRequire([__dirname + "/object.js"], obj =>
{
    /**
     * Base class for filesystem implementations.
     * 
     * @extends mid.Object
     * @memberof mid
     */
    class Filesystem extends obj.Object
    {
        constructor()
        {
            super();

            /**
             * Is triggered when something on the filesystem changed.
             * @event fsChange
             * @memberof mid.Filesystem
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
         * Retusn the file part of the given path.
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