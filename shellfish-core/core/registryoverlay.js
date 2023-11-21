const [ obj ] = await shRequire([__dirname + "/object.js"]);

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
 * Class representing a registry overlay. The overlay stores overlaid modifications
 * without applying them immediately. This makes it easy to support configuration
 * editing with Apply and Cancel functionality.
 * 
 * @extends core.Object
 * @memberof core
 * 
 * @property {bool} modified - [readonly] `true` while the overlay has un-applied modifications.
 * @property {object} registry - (default: `null`) The registry to work on. The object must implement the registry interface.
 */
class RegistryOverlay extends obj.Object
{
    constructor()
    {
        super();
        d.set(this, {
            registry: null,
            overlay: { },
            removals: new Set(),
            modified: false
        });

        this.notifyable("modified");
        this.notifyable("registry");

        /**
         * Is triggered when the value of a key has changed.
         * @event changeValue
         * @param {string} key - The key that was changed.
         * @memberof core.RegistryOverlay
         */
        this.registerEvent("changeValue");
    }

    get registry() { return d.get(this).registry; }
    set registry(r)
    {
        d.get(this).registry = r;
        this.registryChanged();
    }

    get modified() { return d.get(this).modified; }


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
        const overlay = priv.overlay[key];
        if (overlay)
        {
            return overlay;
        }
        else
        {
            return await priv.registry.info(key);
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

        for (let remKey of priv.removals)
        {
            if (folderKey.startsWith(remKey))
            {
                return [];
            }
        }

        const contents = await priv.registry.list(folderKey);
        for (let key in priv.overlay)
        {
            if (dirname(key) === folderKey)
            {
                const name = filename(key);
                if (contents.indexOf(name) === -1)
                {
                    contents.push(name);
                }
            }
        }

        return contents;
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

        for (let remKey of priv.removals)
        {
            if (key.startsWith(remKey))
            {
                return defaultValue;
            }
        }

        const overlay = priv.overlay[key];
        if (overlay)
        {
            return overlay.value;
        }
        else
        {
            return await priv.registry.read(key, defaultValue);
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
        priv.overlay[key] = {
            type: typeof value,
            description,
            value
        };
        this.changeValue(key);

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
        priv.removals.add(key);

        for (let ovKey in priv.overlay)
        {
            if (ovKey.startsWith(key))
            {
                priv.overlay.delete(ovKey);
            }
        }

        if (! priv.modified)
        {
            priv.modified = true;
            this.modifiedChanged();
        }
    }

    /**
     * Applies all overlaid modifications to the underlying registry.
     */
    async apply()
    {
        const priv = d.get(this);

        for (let key in priv.overlay)
        {
            const item = priv.overlay[key];
            await priv.registry.write(key, item.value, item.description);
        }

        for (let key of priv.removals)
        {
            await priv.registry.remove(key);
        }

        if (priv.modified)
        {
            priv.modified = false;
            this.modifiedChanged();
        }
    }

    /**
     * Cancels and forgets about all overlaid modifications.
     */
    async cancel()
    {
        const priv = d.get(this);

        priv.overlay = { };
        priv.removals.clear();

        if (priv.modified)
        {
            priv.modified = false;
            this.modifiedChanged();
        }
    }
}
exports.RegistryOverlay = RegistryOverlay;