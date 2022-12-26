/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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
 * Loads the given modules asynchronously and invokes a callback afterwards.
 * 
 * This function takes a number of Shellfish module paths and loads them in the
 * background. When all modules have been loaded, a callback function is invoked
 * with all module objects.
 * 
 * #### Example:
 * 
 *     shRequire(["a.js", "b.js", "c.js"], (a, b, c) =>
 *     {
 *         // do something with the modules
 *         a.foo();
 *     });
 * 
 * Modules cannot pollute the global namespace and the modules are only visible
 * inside the callback function.
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
 *     shRequire(["shellfish/ui"], (ui) =>
 *     {
 * 
 *     });
 * 
 * than it is to write something like
 * 
 *     shRequire(["../../shellfish-ui/ui.js"], (ui) =>
 *     {
 * 
 *     });
 * 
 * The special constant `__dirname` is available inside a module and points to
 * the path of the directory where the module is located. This can,
 * for instance, be used to load modules relative to the current module.
 * 
 *     shRequire([__dirname + "/otherModule.js"], (other) =>
 *     {
 * 
 *     });
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
 * @param {function} callback - The callback to invoke after loading.
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

    // stack of task queues
    const stackOfQueues = [];

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

    let nextScheduled = false;

    function logError(message)
    {
        if (hasDom)
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
            const json = localStorage.getItem("shellfish-require:" + url);
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
                localStorage.setItem("shellfish-require:" + url, JSON.stringify(data));
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
     * cached there.
     * 
     * @param {string} url - The URL to fetch from.
     * @param {function} callback - The callback function to invoke with the resource data.
     */
    function storeFetch(url, callback)
    {
        let lastModified = Date.now();
        fetch(url, { cache: "no-cache", method: "HEAD" })
        .then(response =>
        {
            if (response.headers.has("Last-Modified"))
            {
                lastModified = Date.parse(response.headers.get("Last-Modified"));
            }

            const obj = storeGet(url);
            //console.log("shellfish-require " + url + " " + obj?.lastModified + " vs " + lastModified);
            if (! obj || obj.lastModified < lastModified)
            {
                fetch(url, { cache: "no-cache" })
                .then(response =>
                {
                    if (! response.ok)
                    {
                        throw `${response.status} ${response.statusText}`;
                    }

                    if (response.headers.has("Last-Modified"))
                    {
                        lastModified = Date.parse(response.headers.get("Last-Modified"));
                    }
                    return response.text()
                })
                .then(data =>
                {
                    storePut(url, {
                        lastModified: lastModified,
                        data: data
                    });
                    console.log("Fetched from remote: " + url);
                    callback(data);
                })
                .catch(err =>
                {
                    callback(null);
                });
            }
            else
            {
                console.log("Fetched from cache: " + url);
                callback(obj.data);
            }
        })
        .catch(err =>
        {
            callback(null);
        });
    }

    /**
     * Imports the given code into a script tag.
     * @private
     * 
     * @param {string} url - The source URL of the script.
     * @param {string} code - The script code to import.
     * @param {bool} loadAsync - Whether to load the script asynchronously.
     * @param {function} callback - The callback to invoke after importing.
     */
    function importScript(url, code, loadAsync, callback)
    {
        if (hasDom)
        {
            const scriptNode = document.createElement("script");
            scriptNode.type = "application/javascript";
            scriptNode.charset = "utf-8";
            scriptNode.async = loadAsync;
            const codeUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
    
            scriptNode.addEventListener("load", function ()
            {
                //URL.revokeObjectURL(codeUrl);
                callback(true);
            }, false);
    
            scriptNode.addEventListener("error", function ()
            {
                URL.revokeObjectURL(codeUrl);
                logError(`Failed to import script.`);
                callback(false);
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
                callback(true);
            }
            catch (err)
            {
                console.log(code.substring(0, 1000));
                logError(`Failed to import script: ${err}`);
                callback(false);
            }
            
        }
        else if (isNode)
        {
            const inlineModule = new module.constructor();
            inlineModule.paths = module.paths;
            inlineModule.shRequire = __require;
            inlineModule._compile("const shRequire = module.shRequire; " + code, url);
            callback(true);
        }
        else if (typeof Blob !== "undefined")
        {
            const codeUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
            try
            {
                importScripts(codeUrl);
                //URL.revokeObjectURL(codeUrl);
                callback(true);
            }
            catch (err)
            {
                URL.revokeObjectURL(codeUrl);
                logError(`Failed to import script: ${err}`);
                callback(false);
            }
        }

    }

    /**
     * Loads the given bundle from an address.
     * @private
     * 
     * @param {string} url - The URL to load from.
     * @param {function} callback - The callback to be invoked after loading successfully.
     */
    function loadBundle(url, callback)
    {
        const now = Date.now();

        if (isDeno)
        {
            Deno.readTextFile(url)
            .then(data =>
            {
                try
                {
                    console.log(`Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                    const bundleName = url;
                    processBundle(bundleName, JSON.parse(data), () =>
                    {
                        callback();
                    });
                }
                catch (err)
                {
                    logError(`Failed to process JS bundle '${url}': ${err}`);
                }  
            })
            .catch (err =>
            {
                logError(`Failed to load bundle from '${url}': ${err}`);
            });
        }
        else if (isNode)
        {
            const modFs = require("fs");
            modFs.readFile(url, (err, buf) =>
            {
                if (err)
                {
                    logError(`Failed to load bundle from '${url}': ${err}`);
                    return;
                }

                const data = buf.toString();

                try
                {
                    console.log(`Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                    const bundleName = url;
                    processBundle(bundleName, JSON.parse(data), () =>
                    {
                        callback();
                    });
                }
                catch (err)
                {
                    logError(`Failed to process JS bundle '${url}': ${err}`);
                }                

            });
        }
        else
        {
            storeFetch(url, data =>
            {
                if (! data)
                {
                    logError(`Failed to load bundle from '${url}'`);
                }

                try
                {
                    console.log(`Loaded JS bundle '${url}' from server in ${Date.now() - now} ms.`);
                    const bundleName = url;
                    processBundle(bundleName, JSON.parse(data), () =>
                    {
                        callback();
                    });
                }
                catch (err)
                {
                    logError(`Failed to process JS bundle '${url}': ${err}`);
                }
            });

        }
    }

    /**
     * Processes the given bundle object.
     * @private
     * 
     * @param {string} name - The name of the bundle.
     * @param {object} bundle - The bundle object.
     * @param {function} callback - The callback to invoke after processing successfully.
     */
    function processBundle(name, bundle, callback)
    {
        if (! bundle.version /* bundle version 1 */)
        {
            for (let moduleUrl in bundle)
            {
                bundleCache[moduleUrl] = bundle[moduleUrl];
            }
            callback();
        }
        else if (bundle.version === 2)
        {
            let js = "";

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
                        throw new Error(`Resource URL '${resUrl}' is already taken.`)
                    }
                    
                    if (resUrl.toLowerCase().endsWith(".js"))
                    {
                        // collect all JavaScript files wrapped in loader functions in a single module
                        js += `
                            shRequire.registerLoader("${resUrl}", (exports, __dirname, __filename) =>
                            {
                                const currentDependencyCounter = shRequire.dependencyCounter;
                                ${bundle.resources[resUrl]}
                                const mod = typeof Module !== "undefined" ? Module : exports;
                                mod.hasDependencies = currentDependencyCounter !== shRequire.dependencyCounter;
                                shRequire.registerModule("${resUrl}", mod);
                            });
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
                importScript(name, js, false, (ok) =>
                {
                    if (! ok)
                    {
                        logError(`Failed to load bundle '${name}'.`);
                    }
                    else
                    {
                        callback();
                    }
                });
            }
            else
            {
                callback();
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
     * @param {function} callback - The callback to be invoked with the code string.
     */
    function loadCode(url, callback)
    {
        if (bundleCache[url])
        {
            callback(bundleCache[url]);
            return;
        }

        if (isDeno)
        {
            Deno.readTextFile(url)
            .then(data =>
            {
                callback(data);
            })
            .catch(err =>
            {
                logError(`Failed to load module: '${url}': ${err}`);
                callback("");
            });
        }
        else if (isNode)
        {
            const modFs = require("fs");
            modFs.readFile(url, (err, data) =>
            {
                if (err)
                {
                    logError(`Failed to load module: '${url}': ${err}`);
                    callback("");
                }
                else
                {
                    callback(data.toString());
                }
            });
        }
        else
        {
            storeFetch(url, data =>
            {
                if (! data)
                {
                    logError(`Failed to load module '${url}'`);
                }
                callback(data);
            });

        }
    }

    /**
     * Loads a CSS style sheet from an address.
     * @private
     * 
     * @param {string} url - The URL to load the style sheet from.
     * @param {function} callback - The callback to be invoked after loading successfully.
     */
    function loadStyle(url, callback)
    {
        if (bundleCache[url])
        {
            url = "data:text/css;base64," + btoa(bundleCache[url]);
        }

        if (! hasDom)
        {
            throw "CSS style sheets require a DOM to load.";
        }

        let link = document.createElement("link");
        link.setAttribute("type", "text/css");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", url);
        link.onload = function ()
        {
            callback();
        }
        document.head.appendChild(link);
    }

    /**
     * Loads a module from an address.
     * @private
     * 
     * @param {string} url - The URL where to load from.
     * @param {function} processor - An optional processor function for preprocessing the code.
     * @param {function} callback - The callback to be invoked with the module object.
     */
    function loadModule(url, processor, callback)
    {
        if (cache[url])
        {
            // if the module was already loaded, look up in cache
            callback(cache[url]);
            return;
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
        stackOfQueues.push([]);

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
            loadersMap[url](exports, dirname, url);

            const jsmodule = cache[url];
            if (jsmodule.__id)
            {
                console.log(`Registered module '${url}' as '${jsmodule.__id}'.`);
                idsMap[jsmodule.__id] = url;
            }
    
            if (statusNode)
            {
                statusNode.innerHTML = "Completed";
            }
    
            callback(jsmodule);
            return;
        }
        else
        {
            loadCode(url, (code) =>
            {
                if (code === "")
                {
                    if (statusNode)
                    {
                        statusNode.innerHTML = "Failed";
                    }
                    stackOfQueues.pop();
                    callback(null);
                    return;
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
                        console.error("Failed to process '" + url + "': " + err);
                    }
                }
    
                const js = `/* Module ${url} */
                    (function (Module)
                    {
                        const __dirname = "${dirname}";
                        const __filename = "${url}";
    
                        const haveShellfish = typeof shRequire !== "undefined";
                        const currentDependencyCounter = haveShellfish ? shRequire.dependencyCounter : 0;

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
                        const module = { };
                        ${code}
                        if (haveShellfish)
                        {
                            const mod = typeof Module !== "undefined" ? Module : module.exports ? module.exports : exports;
                            mod.hasDependencies = currentDependencyCounter !== shRequire.dependencyCounter;
                            shRequire.registerModule("${url}", mod);
                        }
                    })(typeof Module !== "undefined" ? Module : undefined);
                `;
    
                if (statusNode)
                {
                    statusNode.innerHTML = "Importing";
                }
    
                importScript(url, js, true, (ok) =>
                {
                    if (ok)
                    {
                        const jsmodule = cache[url];
    
                        if (jsmodule && jsmodule.__id)
                        {
                            console.log(`Registered module '${url}' as '${jsmodule.__id}'.`);
                            idsMap[jsmodule.__id] = url;
                        }
                
                        if (statusNode)
                        {
                            statusNode.innerHTML = "Completed";
                        }
                
                        callback(jsmodule);
                    }
                    else
                    {
                        logError(`Failed to initialize module '${url}': ${this}`);
    
                        if (statusNode)
                        {
                            statusNode.innerHTML = "Failed";
                        }
        
                        callback(null);
                    }
                });
            });
        }
    }

    /**
     * Loads a WASM module.
     * @private
     * 
     * @param {string} url - The URL where to load from.
     * @param {function} callback - The callback to be invoked with the WASM instance object.
     */
    function loadWasm(url, callback)
    {
        function fail(err)
        {
            logError(`Failed to load WASM module '${url}': ${err}`);
            callback("");
        }

        if (cache[url])
        {
            // if the module was already loaded, look up in cache
            callback(cache[url]);
            return;
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
        stackOfQueues.push([]);

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
            WebAssembly.instantiate(bundleCache[url], importObj)
            .then(module =>
            {
                callback(module.instance.exports);
            })
            .catch(err =>
            {
                fail(err);
            });
        }
        else if (isNode)
        {
            const modFs = require("fs");
            modFs.readFile(url, (err, data) =>
            {
                if (err)
                {
                    fail(err);
                }
                else
                {
                    WebAssembly.instantiate(data, importObj)
                    .then(module =>
                    {
                        callback(module.instance.exports);
                    })
                    .catch(err =>
                    {
                        fail(err);
                    });
                }
            });
        }
        else
        {
            fetch(url, { cache: "no-cache" })
            .then(response =>
            {
                return WebAssembly.instantiateStreaming(response, importObj)
            })
            .then(module =>
            {
                callback(module.instance.exports);
            })
            .catch (err =>
            {
                fail(err);
            });
        }
    }

    function next()
    {
        if (nextScheduled)
        {
            return;
        }

        if (stackOfQueues.length === 0)
        {
            return;
        }

        let queue = stackOfQueues[stackOfQueues.length - 1];
        if (queue.length === 0)
        {
            stackOfQueues.pop();
            next();
            return;
        }

        let ctx = queue[0];
        if (ctx.urls.length === 0)
        {
            queue.shift();
            if (ctx.callback)
            {
                ctx.callback.apply(null, ctx.modules);
            }
            next();
            return;
        }

        let url = normalizeUrl(ctx.urls[0]);
        ctx.urls.shift();

        function tryImmediateCallback()
        {
            // if the loaded modules have no further dependencies, we may
            // invoke the callback immediately
            if (! ctx.dependencies && ctx.urls.length === 0)
            {
                //console.log("Invoking immediate callback on " + JSON.stringify(ctx.allUrls));
                ctx.callback.apply(null, ctx.modules);
                ctx.callback = null;
            }
        }

        if (idsMap[url])
        {
            url = idsMap[url];
        }

        nextScheduled = true;

        const ext = url.toLowerCase().substring(url.lastIndexOf(".") + 1);

        if (ext === "css")
        {
            loadStyle(url, () =>
            {
                nextScheduled = false;
                ctx.modules.push(null);
                tryImmediateCallback();
                next();
            });
        }
        else if (ext === "js" || ext === "shui")
        {
            loadModule(url, ctx.processor, module =>
            {
                nextScheduled = false;
                ctx.modules.push(module);
                ctx.dependencies |= module.hasDependencies;
                tryImmediateCallback();
                next();
            });
        }
        else if (ext === "wasm")
        {
            loadWasm(url, module =>
            {
                nextScheduled = false;
                ctx.modules.push(module);
                tryImmediateCallback();
                next();
            });
        }
        else if (url.startsWith("blob:"))
        {
            loadModule(url, ctx.processor, module =>
            {
                nextScheduled = false;
                ctx.modules.push(module);
                ctx.dependencies |= module.hasDependencies;
                tryImmediateCallback();
                next();
            });
        }
        else
        {
            logError(`Cannot load invalid module '${url}'.`);
            nextScheduled = false;
            ctx.modules.push(null);
            tryImmediateCallback();
            next();
        }
    }

    function addTask(urls, callback, processor)
    {
        if (stackOfQueues.length === 0)
        {
            stackOfQueues.push([]);
        }
        let queue = stackOfQueues[stackOfQueues.length - 1];
        let ctx = {
            urls: urls,
            allUrls: urls.slice(),
            modules: [],
            dependencies: false,
            callback: callback,
            processor: processor
        };

        queue.push(ctx);
    }

    /**
     * Imports a module.
     * 
     * @param {string} urls 
     * @param {function} callback - A callback with the imported modules as parameters.
     * @param {function} [processor = null] - An optional code processor.
     */
    function __require(urls, callback, processor)
    {
        function f(urls, callback, processor)
        {
            if (typeof urls === "string" && urls.length > 200)
            {
                const blob = new Blob([urls], { type: "application/javascript" });
                const objUrl = URL.createObjectURL(blob);
                ++__require.dependencyCounter;
                addTask([objUrl], (...args) =>
                {
                    URL.revokeObjectURL(objUrl);
                    callback(...args);
                }, processor);
            }
            else if (typeof urls === "string")
            {
                ++__require.dependencyCounter;
                addTask([urls], callback, processor);
            }
            else
            {
                __require.dependencyCounter += urls.length;
                addTask(urls, callback, processor);
            }
            next();
        }

        f(urls, callback, processor);
    }

    __require.dependencyCounter = 0;

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


    if (hasDom)
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
                let count = bundles.length;
                bundles.forEach((bundle) =>
                {
                    nextScheduled = true;
                    loadBundle(bundle.trim(), () =>
                    {
                        --count;
                        if (count === 0)
                        {
                            nextScheduled = false;
                            next();
                        }
                    });
                });
            }
    
            // load main entry point
            const main = script.getAttribute("data-main");
            if (main && main !== "")
            {
                __require([main], function (module) { });
            }
        }
    }// if (hasDom)

    console.log("Initialized Shellfish module manager. Detected environment: " + __require.environment);

    // In order to support both module systems, ESM and CJS, exports are not used.
    // Instead, we assign the Shellfish environment to a certain variable in scope,
    // if it was defined.
    if (typeof shellfishRun !== "undefined")
    {
        shellfishRun = (bundles, runner) =>
        {
            let count = bundles.length;
            bundles.forEach((bundle) =>
            {
                nextScheduled = true;
                loadBundle(bundle.trim(), () =>
                {
                    --count;
                    if (count === 0)
                    {
                        nextScheduled = false;
                        next();
                    }
                });
            });
    
            runner(__require);
        };
    }

    return __require;
})();

