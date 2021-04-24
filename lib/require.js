/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2021 Martin Grimme <martin.grimme@gmail.com>

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
 * This function takes a number of Shellfish modules and loads them in the
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
 * accessible from outside is assigned to the `exports` object.
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
 *     shRequire(["shellfish/mid"], (mid) =>
 *     {
 * 
 *     });
 * 
 * than it is to write something like
 * 
 *     shRequire(["../../shellfish/core/mid.js"], (mid) =>
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
 * If a transformer function is specified, the module URL and the module data is
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
 * # Accessing resources in bundles
 * 
 * The function `shRequire.resource` takes a file URL and returns the
 * corresponding resource URL for loading the resource from a bundle.
 * If the file URL is not found in one of the loaded bundles, the URL is
 * returned as is.
 * 
 * @name shRequire
 * @function
 * @param {string[]} modules - The modules to load.
 * @param {function} callback - The callback to invoke after loading.
 * @param {function} [transformer = null] - An optional function for transforming module data.
 */
const shRequire = (function ()
{
    const UUID = "e206484a-d6ee-4d3c-ac0e-eaed2fe350b5";

    const MIMETYPES = {
        "jpg": "image/jpeg",
        "png": "image/png",
        "wasm": "application/wasm"
    };

    const hasDom = (typeof document !== "undefined");

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
        
        parts.forEach(function (p)
        {
            if (p === ".." && outParts.length > 0 && outParts[outParts.length - 1] !== "..")
            {
                outParts.pop();
            }
            else if (p === "." || p === "")
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
     * Imports the given code into a script tag.
     * @private
     * 
     * @param {string} code - The script code to import.
     * @param {bool} loadAsync - Whether to load the script asynchronously.
     * @param {function} callback - The callback to invoke after importing.
     */
    function importScript(code, loadAsync, callback)
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
                URL.revokeObjectURL(codeUrl);
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
        else
        {
            const codeUrl = URL.createObjectURL(new Blob([code], { type: "application/javascript" }));
            try
            {
                importScripts(codeUrl);
                URL.revokeObjectURL(codeUrl);
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

        fetch(url, { cache: "no-cache" })
        .then(response =>
        {
            if (! response.ok)
            {
                throw `${response.status} ${response.statusText}`;
            }
            return response.text();
        })
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
        .catch(err =>
        {
            logError(`Failed to load bundle from '${url}': ${err}`);
        });
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
                                ${bundle.resources[resUrl]}
                                shRequire.registerModule("${resUrl}", typeof Module !== "undefined" ? Module : exports);
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
                importScript(js, false, (ok) =>
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

        fetch(url, { cache: "no-cache" })
        .then(response =>
        {
            if (! response.ok)
            {
                throw `${response.status} ${response.statusText}`;
            }
            return response.text();
        })
        .then(data =>
        {
            callback(data);
        })
        .catch(err =>
        {
            logError(`Failed to load module '${url}': ${err}`);
            callback("");
        });
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
            progressNode.innerHTML = pos !== -1 ? url.substr(pos + 1) : url;
        }
        if (statusNode)
        {
            statusNode.innerHTML = "Loading";
        }
        stackOfQueues.push([]);

        const pos = url.lastIndexOf("/");
        let dirname = url.substr(0, pos);
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
                    code = processor(url, code);
                }
    
                const js = `/* Module ${url} */
                    (function ()
                    {
                        const __dirname = "${dirname}";
                        const __filename = "${url}";
    
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
                        ${code}
                        shRequire.registerModule("${url}", typeof Module !== "undefined" ? Module : exports);
                    })();
                `;
    
                if (statusNode)
                {
                    statusNode.innerHTML = "Importing";
                }
    
                importScript(js, true, (ok) =>
                {
                    if (ok)
                    {
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
            ctx.callback.apply(null, ctx.modules);
            next();
            return;
        }

        let url = normalizeUrl(ctx.urls[0]);
        ctx.urls.shift();

        if (idsMap[url])
        {
            url = idsMap[url];
        }

        nextScheduled = true;

        const ext = url.toLowerCase().substr(url.lastIndexOf(".") + 1);

        if (ext === "css")
        {
            loadStyle(url, function ()
            {
                nextScheduled = false;
                ctx.modules.push(null);
                next();
            });
        }
        else if (ext === "js" || ext === "shui")
        {
            loadModule(url, ctx.processor, function (module)
            {
                nextScheduled = false;
                ctx.modules.push(module);
                next();
            });
        }
        else if (url.startsWith("blob:"))
        {
            loadModule(url, ctx.processor, function (module)
            {
                nextScheduled = false;
                ctx.modules.push(module);
                next();
            });
        }
        else
        {
            logError(`Cannot load invalid module '${url}'.`);
            nextScheduled = false;
            ctx.modules.push(null);
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
            modules: [],
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
    function require(urls, callback, processor)
    {
        function f(urls, callback, processor)
        {
            if (typeof urls === "string" && urls.length > 200)
            {
                const blob = new Blob([urls], { type: "application/javascript" });
                const objUrl = URL.createObjectURL(blob);
                addTask([objUrl], (...args) =>
                {
                    URL.revokeObjectURL(objUrl);
                    callback(...args);
                }, processor);
            }
            else if (typeof urls === "string")
            {
                addTask([urls], callback, processor);
            }
            else
            {
                addTask(urls, callback, processor);
            }
            next();
        }

        f(urls, callback, processor);
    }

    /**
     * Registers a module for the given URL.
     * 
     * @private
     * @param {string} url - The URL.
     * @param {object} module - The module to register.
     */
    require.registerModule = function (url, module)
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
    require.registerLoader = function (url, loader)
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
    require.resource = function (url)
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
            const ext = url.toLowerCase().substr(url.lastIndexOf(".") + 1);
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
    require.selfUrl = async function ()
    {
        if (! hasDom)
        {
            return "";
        }

        const tags = document.scripts;
        for (let i = 0; i < tags.length; ++i)
        {
            const tag = tags[i];
            const response = await fetch(tag.src);
            if (! response.ok)
            {
                continue;
            }
            const code = await response.text();
            if (code.indexOf(UUID) !== -1)
            {
                return tag.src;
            }
        }
        return "";
    };

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
                require([main], function (module) { });
            }
        }
    }// if (hasDom)

    console.log("Initialized Shellfish module manager.");
    return require;
})();
