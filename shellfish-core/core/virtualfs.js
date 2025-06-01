/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2025 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/filesystem.js", __dirname + "/util/mime.js"], (fs, mime) =>
{
    const d = new WeakMap();

    /**
     * Class for combining multiple filesystem implementations into one.
     * This allows, e.g., to handle archive files just like (read-only) directories.
     * 
     * The virtual filesystem uses a base filesystem as its entry and a number
     * of child filesystems for handling selected MIME types.
     * 
     * Attach the property `vfsMimeTypes` to the child filesystems to assign
     * filesystems to MIME types.
     * 
     * @extends core.Filesystem
     * 
     * @property {core.Filesystem} filesystem - The base file system.
     */
    class VirtualFS extends fs.Filesystem
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null
            });

            this.notifyable("filesystem");
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(f)
        {
            d.get(this).filesystem = f;
            this.filesystemChanged();
        }

        /**
         * Analyzes the given path to find the innermost virtual filesystem, if
         * any, and splits the path into the external and internal components.
         * 
         * @private
         * 
         * @param {string} path - The path to analyze.
         * @returns {object} - The info object `{fs, path1, path2 }`
         */
        analyzePath(path)
        {
            const parts = path.split("/");
            //console.log("VFS ANALYZE " + JSON.stringify(parts));
            let idx = -1;
            let mimeType = "";
            let fs = null;

            for (let i = parts.length - 2; i >= 0; --i)
            {
                mimeType = mime.mimeType(parts[i]);
                fs = this.filesystemFor(mimeType);
                if (fs)
                {
                    idx = i;
                    break;
                }
            }

            if (idx != -1)
            {
                const outerPath = parts.slice(0, idx + 1).join("/");
                const innerPath = parts.slice(idx + 1).join("/");

                return {
                    fs: fs,
                    path1: outerPath,
                    path2: innerPath[0] !== "/" ? "/" + innerPath : innerPath
                };
            }
            else
            {
                return {
                    fs: null,
                    path1: path,
                    path2: ""
                };
            }
        }

        /**
         * Returns the child filesystem to be used for the given MIME type, or
         * `null` if no child filesystem handles that type.
         * 
         * @private
         * 
         * @param {string} mimeType - The MIME type.
         * @returns {core.Filesystem} The filesystem handling the given MIME type.
         */
        filesystemFor(mimeType)
        {
            return this.children.find(c => c.vfsMimeTypes.includes(mimeType));
        }

        /**
         * Reads data from the given path by recursively resolving the stacked
         * filesystems.
         * 
         * @private
         * 
         * @param {string} dataPath - The path to read.
         * @returns {ArrayBuffer} - The data.
         */
        async readVfsData(dataPath)
        {
            const priv = d.get(this);

            const pathInfo = this.analyzePath(dataPath);
            let data = null;
            if (! pathInfo.fs)
            {
                data = await priv.filesystem.read(dataPath);
            }
            else
            {
                const vfsData = await this.readVfsData(pathInfo.path1);
                const fileData = await pathInfo.fs.vfsRead(vfsData, pathInfo.path2);
                data = fileData;
            }

            data.explicitPath = dataPath;
            return data;
        }

        async fileInfo(path)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.fileInfo(path);
            }
            else
            {
                const vfsData = await this.readVfsData(pathInfo.path1);
                return await pathInfo.fs.vfsFileInfo(vfsData, pathInfo.path2);
            }
        }

        async list(path)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const mimeType = mime.mimeType(path);
            if (this.filesystemFor(mimeType))
            {
                path += "/";
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.list(path);
            }
            else
            {
                const vfsData = await this.readVfsData(pathInfo.path1);
                const items = await pathInfo.fs.vfsList(vfsData, pathInfo.path2);
                items.forEach(item =>
                {
                    item.path = this.pathJoin(pathInfo.path1, item.path);
                    item.dir = this.pathJoin(pathInfo.path1, item.dir);
                });
                return items;
            }
        }

        async mkdir(path, name)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.mkdir(path, name);
            }
            else
            {
                throw "Not supported";
            }
        }

        async move(sourcePath, destPath)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(sourcePath);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.move(sourcePath, destPath);
            }
            else
            {
                throw "Not supported";
            }
        }

        async copy(sourcePath, destPath)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(sourcePath);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.copy(sourcePath, destPath);
            }
            else
            {
                throw "Not supported";
            }
        }

        async remove(path)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.remove(path);
            }
            else
            {
                throw "Not supported";
            }
        }

        async read(path)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return [];
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.read(path);
            }
            else
            {
                const vfsData = await this.readVfsData(pathInfo.path1);
                return await pathInfo.fs.vfsRead(vfsData, pathInfo.path2);
            }
        }

        async write(path, fileData)
        {
            const priv = d.get(this);

            if (! priv.filesystem)
            {
                return;
            }

            const pathInfo = this.analyzePath(path);
            if (! pathInfo.fs)
            {
                return await priv.filesystem.write(path, fileData);
            }
            else
            {
                throw "Not supported";
            }
        }
    }
    exports.VirtualFS = VirtualFS;
});
    