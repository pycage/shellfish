const [ obj, fs ] = await shRequire([__dirname + "/object.js", __dirname + "/filesystem.js"]);

/**
 * Returns the directory part of the given path.
 * 
 * @param {string} path - The path.
 * @returns {string} The directory part of the path.
 */
function dirname(path)
{
    const pos = path.lastIndexOf("/");
    if (pos !== -1)
    {
        return path.substring(0, pos) || "/"
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
function filename(path)
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

const d = new WeakMap();

/**
 * Class representing a file-backed registry database. The registry is held in memory
 * and synchronized with its file when modified.
 * 
 * The registry database is a hierarchical key-value store with the keys being paths
 * with `/` as delimiter, e.g.
  *
 * * `/server/address`
 * * `/server/port`
 * * `/server/rpc/endpoint`
 * * `/users/userA/password`
 * * `/users/userB/password`
 * 
 * The values may be any JSON-serializable data (string, number, object, array).
 * 
 * Please note that all access methods are asynchronous and return a `Promise` object
 * that does not resolve before the registry is ready.
 * 
 * @extends core.Object
 * @memberof core
 * 
 * @property {core.Filesystem} filesystem - (default: `null`) The filesystem to write to.
 * @property {bool} modified - [readonly] `true` while the registry has unsaved modifications.
 * @property {string} path - (default: `""`) The path of the registry file on the filesystem.
 * @property {bool} ready - [readonly] `true` when the registry is ready to use, i.e. it has synchronized with the file.
 */
class RegistryFile extends obj.Object
{
    constructor()
    {
        super();
        d.set(this, {
            fs: null,
            path: "",
            ready: false,
            modified: false,
            resolvers: [],
            registry: {
                "version": 1,
                "/": { "type": "folder", "items": [] }
            }
        });

        this.notifyable("filesystem");
        this.notifyable("modified");
        this.notifyable("path");
        this.notifyable("ready");

        /**
         * Is triggered when the value of a key has changed.
         * @event changeValue
         * @param {string} key - The key that was changed.
         * @memberof core.RegistryFile
         */
        this.registerEvent("changeValue");

        this.onModifiedChanged = () =>
        {
            if (d.get(this).modified)
            {
                this.defer(() => { this.writeRegistry(); }, "writeRegistry");
            }
        };

        this.onDestruction = () =>
        {
            if (d.get(this).modified)
            {
                this.writeRegistry();
            }
        };
    }

    get filesystem() { return d.get(this).filesystem; }
    set filesystem(fs)
    {
        d.get(this).fs = fs;
        this.filesystemChanged();
        this.defer(() => { this.readRegistry(); }, "readRegistry");
    }

    get path() { return d.get(this).path; }
    set path(p)
    {
        d.get(this).path = p;
        this.pathChanged();
        this.defer(() => { this.readRegistry(); }, "readRegistry");
    }

    get ready() { return d.get(this).ready; }

    get modified() { return d.get(this).modified; }

    readRegistry()
    {
        const priv = d.get(this);
        if (priv.fs !== null && priv.path !== "")
        {
            priv.fs.read(priv.path)
            .then(async fileData =>
            {
                const data = await fileData.text();
                console.log("READ " + fileData.sourceType + " " + priv.path);
                console.log(data);
                const reg = JSON.parse(data);
                if (reg.version === 1)
                {
                    priv.registry = reg;
                }
                priv.ready = true;
                this.readyChanged();

                priv.resolvers.forEach(resolver => resolver());
                priv.resolvers = [];
            })
            .catch(err =>
            {
                priv.ready = true;
                this.readyChanged();
            });
        }
    }

    writeRegistry()
    {
        const priv = d.get(this);

        if (! priv.ready)
        {
            return;
        }

        if (priv.fs !== null && priv.path !== "")
        {
            let blob = null;
            console.log("Saving Registry File: " + priv.path);
            console.log(JSON.stringify(priv.registry));
            if (shRequire.environment === "web")
            {
                blob = new Blob([JSON.stringify(priv.registry, null, 2)], { type: "application/json" });
            }
            else
            {
                blob = JSON.stringify(priv.registry, null, 2);
            }

            priv.fs.write(priv.path, new fs.FileData(blob))
            .then(() =>
            {
                priv.modified = false;
                this.modifiedChanged();
            })
            .catch(err =>
            {
                console.error(this.objectType + "@" + this.objectLocation +
                                ": Failed to save file '" + priv.path + "'");
            });
        }
    }

    /**
     * Reads the given key. Returns the `defaultValue` if the key was not found.
     * 
     * @param {string} key - The key to read.
     * @param {any} defaultValue - The default value to return if the key was not found.
     * @returns {any} The key's value.
     */
    async read(key, defaultValue)
    {
        const priv = d.get(this);

        if (! priv.ready)
        {

            const p = new Promise(resolve => {priv.resolvers.push(resolve); });
            await p;
            return await this.read(key, defaultValue);
        }

        const reg = priv.registry;
        
        const obj = reg[key];
        if (obj)
        {
            if (obj.type === "folder")
            {
                return obj.items;
            }
            else
            {
                return obj.value;
            }
        }
        else
        {
            return defaultValue;
        }
    }

    /**
     * Writes the given key. If the key does not yet exist, it will be created.
     * 
     * @param {string} key - The key.
     * @param {any} value - The value to write.
     * @param {string} [description] - An optional description text.
     */
    async write(key, value, description)
    {
        const priv = d.get(this);

        if (! priv.ready)
        {

            const p = new Promise(resolve => {priv.resolvers.push(resolve); });
            await p;
            return await this.write(key, value, description);
        }

        const reg = priv.registry;

        if (! reg[key])
        {
            this.create(key, value, description);
        }
        else
        {
            const obj = reg[key];
            if (obj && obj.type !== "folder")
            {
                obj.value = value;
                if (description)
                {
                    obj.description = description;
                }
                this.changeValue(key);
            }
        }

        if (! priv.modified)
        {
            priv.modified = true;
            this.modifiedChanged();
        }
    }

    /**
     * Removes the given key.
     * 
     * @param {string} key - The key to remove.
     */
    async remove(key)
    {
        const priv = d.get(this);

        if (! priv.ready)
        {

            const p = new Promise(resolve => {priv.resolvers.push(resolve); });
            await p;
            return await this.remove(key);
        }

        const reg = priv.registry;

        if (reg[key])
        {
            const obj = reg[key];
            if (obj.type === "folder")
            {
                obj.items.forEach(childKey =>
                {
                    this.remove(key + "/" + childKey);
                });
            }

            delete reg[key];

            const parentKey = dirname(key);
            const name = filename(key);
            reg[parentKey].items = reg[parentKey].items.filter(n => n !== name);

            this.changeValue(key);

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    create(key, value, description)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        const folderKey = dirname(key);
        const name = filename(key);

        if (! reg[folderKey])
        {
            this.mkdir(folderKey);
        }
        
        const obj = reg[folderKey];
        if (obj.type === "folder")
        {
            obj.items.push(name);

            const newObj = {
                "type": typeof value,
                "description": description || "",
                "value": value
            };
            if (folderKey !== "/")
            {
                reg[folderKey + "/" + name] = newObj;
            }
            else
            {
                reg["/" + name] = newObj;
            }

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    mkdir(key)
    {
        const priv = d.get(this);
        const reg = priv.registry;

        const folderKey = dirname(key);
        const name = filename(key);

        if (! reg[folderKey])
        {
            this.mkdir(folderKey);
        }

        const obj = reg[folderKey];
        if (obj.type === "folder")
        {
            obj.items.push(name);

            const newObj = {
                "type": "folder",
                "description": "",
                "items": []
            };
            if (folderKey !== "/")
            {
                reg[folderKey + "/" + name] = newObj;
            }
            else
            {
                reg["/" + name] = newObj;
            }

            if (! priv.modified)
            {
                priv.modified = true;
                this.modifiedChanged();
            }
        }
    }

    /**
     * Returns information about the given key, or `null` if the key does
     * not exist.
     * 
     * @param {string} key - The key to retrieve the information from.
     * @returns {object} The information object `{ type, description }`.
     */
    async info(key)
    {
        const priv = d.get(this);

        if (! priv.ready)
        {

            const p = new Promise(resolve => {priv.resolvers.push(resolve); });
            await p;
            return await this.info(key);
        }

        const reg = priv.registry;

        const obj = reg[key];
        if (! obj)
        {
            return null;
        }
        else
        {
            return {
                type: obj.type,
                description: obj.description || ""
            };
        }
    }

    /**
     * Lists the contents of the given folder key.
     * 
     * @param {string} folderKey - The key to list the contents of.
     * @returns {string[]} The names of the content items.
     */
    async list(folderKey)
    {
        const priv = d.get(this);

        if (! priv.ready)
        {

            const p = new Promise(resolve => {priv.resolvers.push(resolve); });
            await p;
            return await this.list(folderKey);
        }

        const reg = priv.registry;

        const obj = reg[folderKey];
        if (obj && obj.type === "folder")
        {
            return obj.items.slice();
        }
        else
        {
            return [];
        }
    }

}
exports.RegistryFile = RegistryFile;
