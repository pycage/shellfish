/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

/**
 * Loads the given modules asynchronously and returns a Promise.
 * 
 * This function takes a number of Shellfish module paths and loads them in the
 * background. When all modules have been loaded, the Promise will resolve
 * with all module objects.
 * 
 * #### Example:
 * 
 *     const [ a, b, c ] = await shRequire(["a.js", "b.js", "c.js"]);
 * 
 *     // do something with the modules
 *     a.foo();
 * 
 * Modules cannot pollute the global namespace and the modules are only visible
 * inside the calling scope.
 * 
 * A module file looks like a normal JavaScript file, but everything that shall
 * be accessible from outside is assigned to the `exports` object.
 * 
 * #### Example:
 * 
 *     exports.foo = function ()
 *     {
 *         console.log("foo");
 *     };
 * 
 * Modules in turn may load other modules with `shRequire`.
 * 
 * The special member `exports.__id` may be used to register a module ID for
 * later reference.
 * 
 *     exports.__id = "mymodule";
 * 
 * For instance, it is easier to write
 * 
 *     const ui = await shRequire(["shellfish/ui"]);
 * 
 * than it is to write something like
 * 
 *     const ui = await shRequire(["../../shellfish-ui/ui.js"]);
 * 
 * The special constant `__dirname` is available inside a module and points to
 * the path of the directory where the module is located. This can,
 * for instance, be used to load modules relative to the current module.
 * 
 *     const other = await shRequire([__dirname + "/otherModule.js"]);
 * 
 * If a transformer function is specified, the module URL and the module data are
 * passed to this function and the returned code will be executed.
 * This mechanism is used by the Feng Shui processor to directly load Shui files
 * as modules.
 * 
 * The following constants are defined inside modules:
 * 
 * #### `__dirname`
 * 
 * The name of the directory where the module file is located.
 * 
 * #### `__filename`
 * 
 * The path of the module file.
 * 
 * @name shRequire
 * @function
 * @param {string[]} modules - The paths of the modules to load.
 * @param {function} callback - [**deprecated**] The callback to invoke after loading. This parameter is only provided for backwards compatibility.
 * @param {function} [transformer = null] - An optional function for transforming module data. See {@link fengshui.compile} for the signature.
 */
const shRequire = (function ()
{
    // this UUID helps to find the require.js module in the set of loaded JS resources
    const UUID = "e206484a-d6ee-4d3c-ac0e-eaed2fe350b5";

    const MIMETYPES = {
        "jpg": "image/jpeg",
        "png": "image/png",
        "wasm": "application/wasm"
    };

    const hasDom = (typeof document !== "undefined");
    const isWeb = hasDom &&
                  typeof navigator !== "undefined" &&
                  typeof window !== "undefined";
    const isNode = typeof process !== "undefined" &&
                   typeof process.versions === "object" &&
                   typeof process.versions.node !== "undefined";
    const isDeno = typeof window !== "undefined" && window.Deno;
    const isElectronRenderer = hasDom &&
                               typeof window !== "undefined" &&
                               typeof window.process === "object" &&
                               window.process.type === "renderer";
    const isElectronMain = typeof process !== "undefined" &&
                           typeof process.versions === "object" &&
                           typeof process.versions.electron !== "undefined";

    // modules cache
    const cache = { };

    // bundle cache
    const bundleCache = { };

    // resource blob cache
    const blobCache = { };

    // ID to URL map
    let idsMap = { };

    // URL to format map
    let formatsMap = { };

    // URL to loader map
    let loadersMap = { };

    // map of one-shot callbacks
    const callbackMap = new Map();

    let idCounter = 0;


    function log(domain, level, message)
    {
        if (isWeb || level === "error")
        {
            if (level === "error")
            {
                logError(message);
            }
            else
            {
                console.log(message);
            }
        }
    }

    function logError(message)
    {
        /*
        if (isWeb)
        {
            // remember the good old days..?
            const node = document.createElement("pre");
            node.style.width = "100%";
            node.style.position = "fixed";
            node.style.top = "0px";
            node.style.left = "0px";
            node.style.whiteSpace = "pre-wrap";
            node.style.color = "red";
            node.style.backgroundColor = "black";
            node.style.borderWidth = "0.5em";
            node.style.borderStyle = "solid";
            node.style.padding = "1em";
            node.style.borderColor = "red";
            node.style.textAlign = "center";
            node.style.fontWeight = "bold";
            node.style.zIndex = 9999;
            node.appendChild(document.createTextNode("Software Failure. Click here to continue.\n" + message));
            node.onclick = () => { node.remove(); }
            document.body.appendChild(node);
        }
        */
        console.error(message);
    }

    /**
     * Normalizes the given URL by resolving "." and ".." and "//".
     * @private
     * 
     * @param {string} url - The URL to normalize.
     * @returns {string} The normalized URL.
     */
    function normalizeUrl(url)
    {
        const parts = url.split("/");
        let outParts = [];
        
        parts.forEach((p, idx) =>
        {
            if (p === ".." && outParts.length > 0 && outParts[outParts.length - 1] !== "..")
            {
                outParts.pop();
            }
            else if (p === "." || (p === "" && idx > 0) /* don't drop leading / */)
            {
                // ignore "." and ""
            }
            else
            {
                outParts.push(p);
            }
        });

        //console.log("normalized URL " + url + " -> " + outParts.join("/"));
        return outParts.join("/");
    }

    /**
     * Retrieves a resource object from the local storage, if available.
     * 
     * @param {string} url - The URL for addressing the resource object.
     * 
     * @returns {object} - The resource object, or `null` if it was not found, or if there is no local storage available.
     */
    function storeGet(url)
    {
        if (typeof localStorage === "undefined")
        {
            return null;
        }
        else
        {
            const json = localStorage.getItem("shellfish-cache:" + url);
            if (json)
            {
                return JSON.parse(json);
            }
            else
            {
                return null;
            }
        }
    }

    /**
     * Puts an object of resource data into the local storage, if available.
     * 
     * @param {string} url - The URL for addressing the resource object.
     * @param {object} data - The resource object. It must be JSON-serializable.
     * 
     * @returns {bool} Whether the data was put in the local storage successfully.
     */
    function storePut(url, data)
    {
        if (typeof localStorage === "undefined")
        {
            return false;
        }
        else
        {
            try
            {
                localStorage.setItem("shellfish-cache:" + url, JSON.stringify(data));
                return true;
            }
            catch (err)
            {
            }
            return false;
        }
    }

    /**
     * Fetches a resource from the given URL, or from the local storage, if
     * cached there, and the caching is enabled via `shellfish-use-cache = "true"`
     * set in the local storage.
     * 
     * @param {string} url - The URL to fetch from.
     */
    async function storeFetch(url)
    {
        if (typeof localStorage === "undefined" ||
            localStorage.getItem("shellfish-use-cache") !== "true")
        {
            try
            {
                const response = await fetch(url, { cache: "no-cache" });
                if (! response.ok)
                {
                    return null;
                }
                const data = await response.text();
                return data;
            }
            catch (err)
            {
                return null;
            }
        }

        try
        {
            let lastModified = Date.now();
            const headResponse = await fetch(url, { cache: "no-cache", method: "HEAD" });
            if (headResponse.headers.has("Last-Modified"))
            {
                lastModified = Date.parse(headResponse.headers.get("Last-Modified"));
            }
    
            const obj = storeGet(url);
            if (! obj || obj.lastModified < lastModified)
            {
                const getResponse = await fetch(url, { cache: "no-cache" });
                if (! getResponse.ok)
                {
                    return null;
                }

                if (getResponse.headers.has("Last-Modified"))
                {
                    lastModified = Date.parse(getResponse.headers.get("Last-Modified"));
                }
                const data = await getResponse.text();
                storePut(url, {
                    lastModified: lastModified,
                    data: data
                });
                log("", "debug", "Fetched from remote: " + url);
                return data;
            }
            else
            {
                log("", "debug", "Fetched from cache: " + url);
                return obj.data;
            }
        }
        catch (err)
        {
            return null;
        }
    }

    /**
     * Imports the given code into a script tag.
     * @private
     * 
     * @param {number} scriptId - A unique ID.
     * @param {string} url - The source URL of the script.
     * @param {string} code - The script code to import.
     * @param {bool} loadAsync - Whether to load the script asynchronously.
     */
    function importScript(scriptId, url, code, loadAsync)
    {
        return new Promise((resolve, reject) =>
        {
            shRequire.registerCallback(scriptId, () => { resolve(true); });

            if (hasDom)
            {
                const scriptNode = document.createElement("script");
                scriptNode.type = "application/javascript";
                scriptNode.charset = "utf-8";
                scriptNode.async = loadAsync;
                const codeUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
              
                scriptNode.addEventListener("error", function ()
                {
                    URL.revokeObjectURL(codeUrl);
                    log("", "error", `Failed to import script.`);
                    shRequire.registerCallback(scriptId, null);
                    resolve(false);
                }, false);
        
                scriptNode.src = codeUrl;
                document.head.appendChild(scriptNode);
            }
            else if (isDeno)
            {
                try
                {
                    const shRequire = __require;
                    // using eval for the time being, until some better solution comes around
                    eval(code);
                }
                catch (err)
                {
                    log("", "error", `Failed to import script: ${err}`);
                    resolve(false);
                } 
            }
            else if (isNode)
            {
                const inlineModule = new module.constructor();
                inlineModule.paths = module.paths;
                inlineModule.shRequire = __require;
                inlineModule._compile("const shRequire = module.shRequire; " + code, url);
            }
            else if (typeof Blob !== "undefined")
            {
                const codeUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
                try
                {
                    importScripts(codeUrl);
                    //URL.revokeObjectURL(codeUrl);
                    resolve(true);
                }
                catch (err)
                {
                    URL.revokeObjectURL(codeUrl);
                    log("", "error", `Failed to import script: ${err}`);
                    resolve(false);
                }
            }
            else
            {
                resolve(false);
            }
        });
    }

    /**
     * Loads the given bundle from an address.
     * @private
     * 
     * @param {string} url - The URL to load from.
     */
    async function loadBundle(url)
    {
        const now = Date.now();

        if (isDeno)
        {
            try
            {
                const data = await Deno.readTextFile(url);
                try
                {
                    log("", "debug", `Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                    const bundleName = url;
                    await processBundle(bundleName, JSON.parse(data));
                }
                catch (err)
                {
                    log("", "error", `Failed to process JS bundle '${url}': ${err}`);
                }  
            }
            catch (err)
            {
                log("", "error", `Failed to load bundle from '${url}': ${err}`);
            }
        }
        else if (isNode)
        {
            const modFs = require("node:fs/promises");
            let buf = null;
            try
            {
                buf = await modFs.readFile(url);
            }
            catch (err)
            {
                log("", "error", `Failed to load bundle from '${url}': ${err}`);
                return;
            }

            const data = buf.toString();
            try
            {
                log("", "debug", `Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                const bundleName = url;
                await processBundle(bundleName, JSON.parse(data));
            }
            catch (err)
            {
                log("", "error", `Failed to process JS bundle '${url}': ${err}`);
            }                
        }
        else
        {
            const data = await storeFetch(url);
            if (! data)
            {
                log("", "error", `Failed to load bundle from '${url}'`);
                return;
            }

            try
            {
                log("", "debug", `Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                const bundleName = url;
                await processBundle(bundleName, JSON.parse(data));
            }
            catch (err)
            {
                log("", "error", `Failed to process JS bundle '${url}': ${err}`);
            }    
        }
    }

    /**
     * Processes the given bundle object.
     * @private
     * 
     * @param {string} name - The name of the bundle.
     * @param {object} bundle - The bundle object.
     */
    async function processBundle(name, bundle)
    {
        if (! bundle.version /* bundle version 1 */)
        {
            for (let moduleUrl in bundle)
            {
                bundleCache[moduleUrl] = bundle[moduleUrl];
            }
        }
        else if (bundle.version === 2)
        {
            let js = "";
            const scriptId = idCounter;
            ++idCounter;

            if (bundle.aliases)
            {
                for (let alias in bundle.aliases)
                {
                    if (idsMap[alias])
                    {
                        throw new Error(`Alias '${alias}' is already taken.`);
                    }
                    idsMap[alias] = bundle.aliases[alias];
                }
            }
            if (bundle.resources)
            {
                for (let resUrl in bundle.resources)
                {
                    if (bundleCache[resUrl])
                    {
                        throw new Error(`Resource URL '${resUrl}' is already taken.`);
                    }
                    
                    if (resUrl.toLowerCase().endsWith(".js"))
                    {
                        // collect all JavaScript files wrapped in loader functions in a single module
                        js += `
                            origRequire = shRequire;
                            shRequire.registerLoader("${resUrl}", async (exports, __dirname, __filename) =>
                            {
                                let reqQueue = [];
                                const shRequire = origRequire.withQueue(reqQueue);

                                ${bundle.resources[resUrl]}
                                const mod = typeof Module !== "undefined" ? Module : exports;
                                shRequire.registerModule("${resUrl}", mod);

                                while (reqQueue.length > 0) await reqQueue.shift();
                            });
                            origRequire.invokeCallback(${scriptId});
                        `;
                    }
                    else
                    {
                        bundleCache[resUrl] = bundle.resources[resUrl];
                    }
                }
            }
            for (let resUrl in bundle.formats)
            {
                formatsMap[resUrl] = bundle.formats[resUrl];
            }

            if (js !== "")
            {
                js = "/* Bundle " + name + " */" + js;
                const ok = await importScript(scriptId, name, js, false);
                if (! ok)
                {
                    log("", "error", `Failed to load bundle '${name}'.`);
                    throw new Error(`Failed to load bundle '{name}'.`);
                }
            }
        }
        else
        {
            throw new Error(`Unsupported bundle version ${bundle.version}.`);
        }
    }

    /**
     * Loads code from an address.
     * @private
     * 
     * @param {string} url - The URL where to load the code from.
     */
    async function loadCode(url)
    {
        if (bundleCache[url])
        {
            return bundleCache[url];
        }

        if (isDeno)
        {
            try
            {
                const data = await Deno.readTextFile(url);
                return data;
            }
            catch (err)
            {
                log("", "error", `Failed to load module: '${url}': ${err}`);
                return "";
            }
        }
        else if (isNode)
        {
            try
            {
                const modFs = require("node:fs/promises");
                const data = await modFs.readFile(url);
                return data.toString();
            }
            catch (err)
            {
                log("", "error", `Failed to load module: '${url}': ${err}`);
                return "";
            }
        }
        else
        {
            const data = await storeFetch(url);
            if (! data)
            {
                log("", "error", `Failed to load module '${url}'`);
            }
            return data;
        }
    }

    /**
     * Loads a CSS style sheet from an address.
     * @private
     * 
     * @param {string} url - The URL to load the style sheet from.
     */
    function loadStyle(url)
    {
        return new Promise((resolve, reject) =>
        {
            if (bundleCache[url])
            {
                url = "data:text/css;base64," + btoa(bundleCache[url]);
            }
    
            if (! hasDom)
            {
                reject(new Error("CSS style sheets require a DOM to load."));
            }
    
            let link = document.createElement("link");
            link.setAttribute("type", "text/css");
            link.setAttribute("rel", "stylesheet");
            link.setAttribute("href", url);
            link.onload = () =>
            {
                resolve(null);
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Loads a module from an address.
     * @private
     * 
     * @param {string} url - The URL where to load from.
     * @param {function} processor - An optional processor function for preprocessing the code.
     */
    async function loadModule(url, processor)
    {
        if (cache[url])
        {
            // if the module was already loaded, look up in cache
            return cache[url];
        }
        
        const progressNode = hasDom ? document.getElementById("sh-require-progress") : null;
        const statusNode = hasDom ? document.getElementById("sh-require-status") : null;

        if (progressNode)
        {
            const pos = url.lastIndexOf("/");
            progressNode.innerHTML = pos !== -1 ? url.substring(pos + 1) : url;
        }
        if (statusNode)
        {
            statusNode.innerHTML = "Loading";
        }

        const pos = url.lastIndexOf("/");
        let dirname = url.substring(0, pos);
        if (dirname === "")
        {
            dirname = ".";
        }

        if (loadersMap[url])
        {
            // if the module has a loader function, use that
    
            const exports = {
                include: (mod) => {
                    for (let key in mod)
                    {
                        if (key !== "include" && key !== "__id")
                        {
                            exports[key] = mod[key];
                        }
                    }
                }
            };
            await loadersMap[url](exports, dirname, url);

            const jsmodule = cache[url];
            if (jsmodule.__id)
            {
                log("", "debug", `Registered module '${url}' as '${jsmodule.__id}'.`);
                idsMap[jsmodule.__id] = url;
            }
    
            if (statusNode)
            {
                statusNode.innerHTML = "Completed";
            }
    
            return jsmodule;
        }
        else
        {
            let code = await loadCode(url);
            if (code === "")
            {
                if (statusNode)
                {
                    statusNode.innerHTML = "Failed";
                }
                return null;
            }

            if (processor)
            {
                if (statusNode)
                {
                    statusNode.innerHTML = "Processing";
                }
                try
                {
                    code = processor(url, code);
                }
                catch (err)
                {
                    code = "";
                    log("", "error", "Failed to process '" + url + "': " + err);
                    return null;
                }
            }

            const scriptId = idCounter;
            ++idCounter;

            const js = `/* Module ${url} */
                (() =>
                {
                    const origRequire = typeof shRequire !== "undefined" ? shRequire : undefined;
                    (async function (Module)
                    {
                        const __dirname = "${dirname.replace(/\\/g, "\\\\")}";
                        const __filename = "${url.replace(/\\/g, "\\\\")}";

                        const exports = {
                            include: (mod) => {
                                for (let key in mod)
                                {
                                    if (key !== "include" && key !== "__id")
                                    {
                                        exports[key] = mod[key];
                                    }
                                }
                            }
                        };

                        let reqQueue = [];
                        const shRequire = origRequire ? origRequire.withQueue(reqQueue) : undefined;

                        const module = { };
                        ${code}
                        if (shRequire)
                        {
                            const mod = typeof Module !== "undefined" ? Module : module.exports ? module.exports : exports;
                            shRequire.registerModule("${url.replace(/\\/g, "\\\\")}", mod);
                        }

                        if (origRequire)
                        {
                            (async () =>
                            {
                                while (reqQueue.length > 0) await reqQueue.shift();
                                origRequire.invokeCallback(${scriptId});
                            })();
                        }
                    })(typeof Module !== "undefined" ? Module : undefined);
                })();
            `;

            if (statusNode)
            {
                statusNode.innerHTML = "Importing";
            }

            const ok = await importScript(scriptId, url, js, true);
            if (ok)
            {
                const jsmodule = cache[url];

                if (jsmodule && jsmodule.__id)
                {
                    log("", "debug", `Registered module '${url}' as '${jsmodule.__id}'.`);
                    idsMap[jsmodule.__id] = url;
                }
        
                if (statusNode)
                {
                    statusNode.innerHTML = "Completed";
                }
        
                return jsmodule;
            }
            else
            {
                log("", "error", `Failed to initialize module '${url}': ${this}`);

                if (statusNode)
                {
                    statusNode.innerHTML = "Failed";
                }

                return null;
            }
        }
    }

    /**
     * Loads a WASM module.
     * @private
     * 
     * @param {string} url - The URL where to load from.
     */
    async function loadWasm(url)
    {
        if (cache[url])
        {
            // if the module was already loaded, look up in cache
            return cache[url];
        }

        const progressNode = hasDom ? document.getElementById("sh-require-progress") : null;
        const statusNode = hasDom ? document.getElementById("sh-require-status") : null;
        if (progressNode)
        {
            const pos = url.lastIndexOf("/");
            progressNode.innerHTML = pos !== -1 ? url.substring(pos + 1) : url;
        }
        if (statusNode)
        {
            statusNode.innerHTML = "Loading";
        }

        const pos = url.lastIndexOf("/");
        let dirname = url.substring(0, pos);
        if (dirname === "")
        {
            dirname = ".";
        }

        const importObj = {
            imports: { }
        };

        if (bundleCache[url])
        {
            try
            {
                const module = await WebAssembly.instantiate(bundleCache[url], importObj);
                return module.instance.exports;
            }
            catch (err)
            {
                log("", "error", `Failed to load WASM module '${url}': ${err}`);
                return "";
            }
        }
        else if (isNode)
        {
            try
            {
                const modFs = require("node:fs/promises");
                const data = await modFs.readFile(url);
                const module = await WebAssembly.instantiate(data, importObj);
                return module.instance.exports;
            }
            catch (err)
            {
                log("", "error", `Failed to load WASM module '${url}': ${err}`);
                return "";
            }
        }
        else
        {
            try
            {
                const response = await fetch(url, { cache: "no-cache" });
                const module = await WebAssembly.instantiateStreaming(response, importObj)
                return module.instance.exports;
            }
            catch (err)
            {
                log("", "error", `Failed to load WASM module '${url}': ${err}`);
                return "";
            }
        }
    }

    async function load(url, processor)
    {
        url = normalizeUrl(url);
        if (idsMap[url])
        {
            url = idsMap[url];
        }

        const ext = url.toLowerCase().substring(url.lastIndexOf(".") + 1);

        if (ext === "css")
        {
            return await loadStyle(url);
        }
        else if (ext === "js" || ext === "shui")
        {
            return await loadModule(url, processor);
        }
        else if (ext === "wasm")
        {
            return await loadWasm(url);
        }
        else if (url.startsWith("blob:"))
        {
            return await loadModule(url, processor);
        }
        else
        {
            log("", "error", `Cannot load invalid module '${url}'.`);
            return null;
        }
    }

    /**
     * Imports a list of modules.
     * 
     * @param {string} urls - The URLs of the modules to import.
     * @param {function} callback - A callback with the imported modules as parameters.
     * @param {function} [processor = null] - An optional code processor.
     */
    async function __require(urls, callback, processor)
    {
        if (typeof urls === "string" && urls.length > 200)
        {
            const blob = new Blob([urls], { type: "application/javascript" });
            const objUrl = URL.createObjectURL(blob);
            const mod = await load(objUrl, processor);
            if (callback)
            {
                callback(mod);
            }
            return mod;
        }
        else if (typeof urls === "string")
        {
            const mod = await load(urls, processor);
            if (callback)
            {
                callback(mod);
            }
            return mod;
        }
        else
        {
            let modules = [];
            for (let i = 0; i < urls.length; ++i)
            {
                modules.push(await load(urls[i], processor));
            }
            if (callback)
            {
                try
                {
                    callback(...modules);
                }
                catch (err)
                {
                    console.log(err);
                }
            }
            return modules;
        }
    }

    /**
     * Creates a version of the require function with a promise queue that
     * can be waited for.
     * 
     * @private
     * @param {Promise[]} reqQueue - The queue to be used.
     * @returns {function} The queueing require function.
     */
    __require.withQueue = function (reqQueue)
    {
        const f = (...args) =>
        {
            const p = __require(...args);
            reqQueue.push(p);
            return p;
        };
        f.withQueue = __require.withQueue;
        f.registerModule = __require.registerModule;
        f.registerData = __require.registerData;
        f.registerLoader = __require.registerLoader;
        f.resource = __require.resource;
        f.selfUrl = __require.selfUrl;
        f.environment = __require.environment;

        return f;
    };

    /**
     * Holds the name of the detected environment this code is running in.
     * 
     * Supported types are:
     *
     * - deno
     * - node
     * - electron-renderer
     * - electron
     * - web
     */
    __require.environment = (() =>
    {
        if (isDeno)
        {
            return "deno";
        }
        else if (isNode)
        {
            return "node";
        }
        else if (isElectronRenderer)
        {
            return "electron-renderer";
        }
        else if (isElectronMain)
        {
            return "electron";
        }
        else
        {
            return "web";
        }
    })();

    /**
     * Registers data for the given URL.
     * 
     * @private
     * @param {string} url - The URL.
     * @param {string} data - The data to register.
     */
    __require.registerData = function (url, data)
    {
        delete cache[url];
        bundleCache[url] = data;
    };

    /**
     * Registers a module for the given URL.
     * 
     * @private
     * @param {string} url - The URL.
     * @param {object} module - The module to register.
     */
    __require.registerModule = function (url, module)
    {
        cache[url] = module;
    };

    /**
     * Registers a module loader function for the given URL.
     * 
     * @private
     * @param {string} url - The URL.
     * @param {function} loader - The module loader function.
     */
    __require.registerLoader = function (url, loader)
    {
        loadersMap[url] = loader;
    };

    /**
     * Returns a ressource URL for accessing a ressource.
     * The ressource URL enables to load data transparently from bundle files.
     * 
     * @private
     * @param {string} url - The URL.
     * @returns The ressource URL.
     */
    __require.resource = function (url)
    {
        if (idsMap[url])
        {
            url = idsMap[url];
        }

        if (bundleCache[url] === undefined)
        {
            return url;
        }

        if (! blobCache[url])
        {
            const ext = url.toLowerCase().substring(url.lastIndexOf(".") + 1);
            const mimeType = MIMETYPES[ext] || "application/octet-stream";

            const data = bundleCache[url];
            let blob = null;

            if (formatsMap[url] === "base64")
            {
                const bytes = atob(data);
                const buffer = new Uint8Array(bytes.length);
                for (let i = 0; i < bytes.length; ++i)
                {
                    buffer[i] = bytes.charCodeAt(i);
                }
                blob = new Blob([buffer], { type: mimeType });
            }
            else
            {
                blob = new Blob([data], { type: mimeType });
            }

            const blobUrl = URL.createObjectURL(blob);
            blobCache[url] = blobUrl;
            bundleCache[url] = "";
        }

        return blobCache[url];
    };

    /**
     * Returns a Promise object resolving to the URL of this require.js file.
     * 
     * @private
     * @returns {Promise} - The Promise object.
     */
    __require.selfUrl = function ()
    {
        const checkScript = function (url)
        {
            return new Promise((resolve, reject) =>
            {
                fetch(url)
                .then(response =>
                {
                    if (response.ok)
                    {
                        response.text()
                        .then(code =>
                        {
                            resolve(code.indexOf(UUID) !== -1 ? url : "");
                        })
                        .catch(err =>
                        {
                            resolve("");
                        });
                    }
                    else
                    {
                        resolve("");
                    }
                })
                .catch(err =>
                {
                    resolve("");
                });
            });
        }

        return new Promise((resolve, reject) =>
        {
            if (typeof __filename !== "undefined")
            {
                resolve(__filename);
                return;
            }

            const tags = document.scripts;
            const promises = [];
            for (let i = 0; i < tags.length; ++i)
            {
                promises.push(checkScript(tags[i].src));
            }
            Promise.all(promises)
            .then(urls =>
            {
                const self = urls.find(url => url !== "");
                resolve(self ? self : "");
            })
            .catch(err =>
            {
                resolve("");
            });
        });
    }

    /**
     * Registers a one-shot callback for an ID.
     * 
     * @private
     * @param {number} id - The ID.
     * @param {function} f - The callback function. Pass `null` to unregister an existing callback.
     */
    __require.registerCallback = function (id, f)
    {
        if (f)
        {
            callbackMap.set(id, f);
        }
        else
        {
            callbackMap.delete(id);
        }
    };

    /**
     * Invokes a registered callback.
     * 
     * @private
     * @param {number} id - The ID of the callback to invoke.
     */
    __require.invokeCallback = function (id)
    {
        const f = callbackMap.get(id);
        if (f)
        {
            callbackMap.delete(id);
            f();
        }
    };


    if (hasDom)
    {
        (async () =>
        {
            const scripts = document.getElementsByTagName("script");
            for (let i = 0; i < scripts.length; ++i)
            {
                let script = scripts[i];
        
                // load bundles
                const bundlesString = script.getAttribute("data-bundle");
                if (bundlesString && bundlesString !== "")
                {
                    const bundles = bundlesString.split(",");
                    for (let i = 0; i < bundles.length; ++i)
                    {
                        await loadBundle(bundles[i].trim());
                    }
                }
        
                // load main entry point
                const main = script.getAttribute("data-main");
                if (main && main !== "")
                {
                    await __require([main], function (module) { });
                }
            }
        })();
    }// if (hasDom)

    log("", "debug", "Initialized Shellfish module manager. Detected environment: " + __require.environment);

    // In order to support both module systems, ESM and CJS, exports are not used.
    // Instead, we assign the Shellfish environment to a certain variable in scope,
    // if it was defined.
    if (typeof shellfishRun !== "undefined")
    {
        shellfishRun = async (bundles, runner) =>
        {
            for (let i = 0; i < bundles.length; ++i)
            {
                await loadBundle(bundles[i].trim());
            }
            runner(__require);
        };
    }

    return __require;
})();

