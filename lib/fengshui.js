/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

exports.__id = "shellfish/fengshui";

(function()
{
    /**
     * Feng Shui is the code processor for translating code written in Shui
     * to JavaScript code, either at runtime when loading the code, or at build
     * time. This module is compatible with Node.js for translating code on the
     * server-side and may either be imported as a module, or executed as a
     * stand-alone command line tool via node.
     * 
     * This module is usually not used directly by client-side code.
     * 
     * @namespace fengshui
     * 
     * @example <caption>Using Feng Shui with Node.js on the server</caption>
     * const fengshui = require("./shellfish/fengshui.js");
     * const js = fengshui.compile("internal.shui", 'Label { text: "Hello!" }');
     * 
     * @example <caption>Running as a command line tool with Node.js (this example writes MyFile.shui.js)</caption>
     * > node fengshui.js MyFile.shui
     * 
     * @example <caption>Importing in client-side JavaScript</caption>
     * shRequire("shellfish/fengshui")
     * .then(fengshui =>
     * {
     *     ...
     * });
     * 
     * @example <caption>Importing in Shui</caption>
     * require "shellfish/fengshui" as fengshui;
     * 
     * Object {
     *     ...
     * }
     */

    /**
     * A container element for holding other elements. Shui components may provide
     * several containers for putting child elements into. For instance, a dialog
     * window could provide a container for the main content, and another container
     * for holding the dialog buttons.
     * @memberof fengshui
     * @typedef Container
     */

    /**
     * A template function returning a tree of {@link high.Element elements}.
     * Templates are used in Shui code for declaring components that will be created
     * dynamically, such as list delegates.
     * @memberof fengshui
     * @typedef Template
     */

    const JS_KEYWORDS = [
        "async",
        "await",
        "break",
        "catch",
        "class",
        "const",
        "continue",
        "do",
        "false",
        "for",
        "function",
        "if",
        "let",
        "new",
        "return",
        "super",
        "switch",
        "throw",
        "true",
        "try",
        "until",
        "var",
        "while"
    ];

    const JS_GLOBALS = [
        "__dirname",
        "__filename",
        "__rslv__",
        "alert",
        "arguments",
        "Array",
        "ArrayBuffer",
        "Blob",
        "console",
        "Date",
        "decodeURI",
        "decodeURIComponent",
        "document",
        "encodeURI",
        "encodeURIComponent",
        "eval",
        "FileReader",
        "Float32Array",
        "Float64Array",
        "Function",
        "Image",
        "ImageData",
        "Infinity",
        "Int16Array",
        "Int32Array",
        "Int8Array",
        "isFinite",
        "isNaN",
        "JSON",
        "Map",
        "Math",
        "NaN",
        "navigator",
        "null",
        "Number",
        "Object",
        "parseFloat",
        "parseInt",
        "Promise",
        "Proxy",
        "Set",
        "SharedArrayBuffer",
        "Uint16Array",
        "Uint32Array",
        "Uint8Array",
        "Uint8ClampedArray",
        "undefined",
        "URL",
        "WebAssembly",
        "WeakMap",
        "WeakSet",
        "window"
    ];

    const TOKEN_ELEMENT = /^([a-z][a-z0-9_]*\.)?[A-Z_][a-zA-Z0-9_]* *{/;
    const TOKEN_NAME = /^[a-z_][a-z0-9_]*/i;
    const TOKEN_IDENTIFIER = /^[a-z_][a-z_0-9]*(\.[a-z_0-9]+)*/i;
    const TOKEN_NUMBER = /^[0-9]+(\.[0-9]+)?([eE]-?[0-9]+)?/;
    const TOKEN_HEXNUMBER = /^0x[0-9a-fA-F]+/;
    const TOKEN_OPERATOR = /^[+\-*/%&|~!=<>]+/;
    const TOKEN_ARROW_FUNCTION = /^\([a-z_0-9]* *(, *[a-z_0-9]*)* *\) *=>/i;
    const TOKEN_ARROW_FUNCTION_COMPACT = /^[a-z_0-9]+ *=>/i;

    let thePreviousLine = -1;

    /** 
     * Compiles a Shui document to JavaScript code.
     * 
     * @memberof fengshui
     * 
     * @param {string} url - The URL the module came from. The document is only
     * compiled if the URL ends with `.shui`. Otherwise, `data` will be returned
     * as is.
     * @param {string} data - The Shui document.
     * @returns {string} JavaScript code.
     */
    function compile(url, data)
    {
        if (url.toLowerCase().endsWith(".shui"))
        {
            const parts = url.split("/");
            const name = parts[parts.length - 1].replace(/\.shui$/, "");

            const now = Date.now();
            let pos = { value: 0 };
            thePreviousLine = -1;
            console.log(`Compiling Shui Document '${url}'.`);
            let obj = parseShui(url, name, data, pos);
            console.log(`Compiled Shui Document in ${Date.now() - now} ms.`);
            return obj;
        }
        else
        {
            return data;
        }
    }
    exports.compile = compile;
    
    /**
     * Loads a Shui module from URL and invokes a callback with the loaded
     * module. The module exports a `create()` function that will create the
     * element tree.
     * 
     * @example
     * fengshui.load("MyElement.shui", null, __rslv__, (module) =>
     * {
     *     const element = module.create();
     *     documentRoot.add(element);
     * });
     *
     * @memberof fengshui
     * 
     * @param {string} url - The URL of the document.
     * @param {object} parent - Unused. Simply pass `null` for now.
     * @param {function} rslv - A function for resolving element IDs.
     *                          If called inside a Shui document, the internal
     *                          function `__rslv__` is the right function to use.
     * @param {function} callback - The callback that will be invoked after the module was loaded.
     */
    function load(url, parent, rslv, callback)
    {
        shRequire(url, function (shui)
        {
            for (let key in shui)
            {
                if (shui[key].create)
                {
                    const now = Date.now();
                    let root = shui[key].create(rslv);
                    root.objectType(url);
                    console.log("Created Shui Document '" + url + "' in " + (Date.now() - now) + " ms.");
                    if (callback)
                    {
                        callback(root);
                    }
                    break;
                }
            }
        }, compile);
    }
    exports.load = load;


    function lineOfPos(data, pos)
    {
        const lines = data.split("\n");
        let sum = 0;
        for (let line = 0; line < lines.length; ++line)
        {
            sum += lines[line].length + 1 /* the '\n' we split at */;
            if (sum > pos.value)
            {
                return line + 1;
            }
        }
        return -1;
    }

    function skipWhitespace(data, pos, skipNewline, skipComments)
    {
        function skip(data, pos, what)
        {
            while (pos.value < data.length && what.indexOf(data[pos.value]) !== -1)
            {
                ++pos.value;
            }
        }

        while (pos.value < data.length)
        {
            skip(data, pos, skipNewline ? "\t\n\r\v " : "\t\r\v ");
            if (skipComments)
            {
                if (next(data, pos, "//"))
                {
                    readUntilNewline(data, pos);
                }
                else if (next(data, pos, "/*") &&
                         (! next(data, pos, "/**") || next(data, pos, "/***")))
                {
                    skipCommentBlock(data, pos);
                }
                else
                {
                    break;
                }
            }
            else
            {
                break;
            }
        }
    }

    function skipCommentBlock(data, pos)
    {
        let idx = data.indexOf("*/", pos.value);
        if (idx !== -1)
        {
            pos.value = idx + 2;
        }
        else
        {
            throw "Syntax error in line " + lineOfPos(data, pos) + ": end of comment block expected.";
        }
    }

    function next(data, pos, what)
    {
        return data.substr(pos.value, what.length) === what;
    }

    function nextIsUpperCase(data, pos)
    {
        let c = data[pos.value];
        return (c >= 'A' && c <= 'Z');
    }

    function nextIsToken(data, pos, regExp)
    {
        if (pos.value < data.length)
        {
            return regExp.test(data.substr(pos.value));
        }
        else
        {
            return false;
        }
    }
    
    function expect(data, pos, what)
    {
        if (data.substr(pos.value, what.length) === what)
        {
            pos.value += what.length;
            return what;
        }
        else
        {
            console.log(data.substr(pos.value, 80));
            throw "Syntax error in line " + lineOfPos(data, pos) + ": '" + what + "' expected, but '" + data[pos.value] + "' found.";
        }
    }

    function readUntil(data, pos, chars)
    {
        // read until, but not including the given characters
        let s = "";
        while (pos.value < data.length && chars.indexOf(data[pos.value]) === -1)
        {
            s += data[pos.value];
            ++pos.value;
        }
        return s;
    }

    function readUntilNewline(data, pos)
    {
        // read until, but not including, newline
        let s = readUntil(data, pos, "\r\n");
        return s;
    }

    function readToken(data, pos, regExp)
    {
        let s = "";
        if (pos.value < data.length)
        {
            let matches = regExp.exec(data.substr(pos.value));
            if (matches)
            {
                let result = matches[0];
                pos.value += result.length;
                return result;
            }
        }
        return "";
    }

    function readString(data, pos)
    {
        if (pos.value >= data.length)
        {
            return "";
        }

        let delimiter = "";
        if (data[pos.value] === "'")
        {
            delimiter = "'";
            ++pos.value;
        }
        else if (data[pos.value] === "\"")
        {
            delimiter = "\"";
            ++pos.value;
        }

        let result = "";
        while (pos.value < data.length)
        {
            if (delimiter !== "" && data[pos.value] === delimiter)
            {
                ++pos.value;
                break;
            }
            else if (delimiter === "" && "\t\n\r\v ".indexOf(data[pos.value]) !== -1)
            {
                break;
            }
            else if (next(data, pos, "\\n"))
            {
                result += "\\n";
                ++pos.value;
            }
            else if (data[pos.value] === "\\")
            {

            }
            else
            {
                result += data[pos.value];
            }
            ++pos.value;
        }

        //console.log("string: " + result);
        return result;
    }

    function readLiteralString(data, pos)
    {
        if (pos.value >= data.length)
        {
            return "";
        }

        const idx = data.indexOf("\"\"\"", pos.value + 1);
        if (idx === -1)
        {
            throw "Syntax error in line " + lineOfPos(data, pos) + ": Literal string is not terminated with \"\"\".";
        }
        const result = data.substring(pos.value + 3, idx);
        pos.value = idx + 3;
        return result.replace(/"/g, "\\\"").replace(/\n/g, "\\n");
    }

    function parseShui(moduleLocation, name, data, pos)
    {
        const requirements = [];
        const docBlocks = [];

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "/**"))
            {
                let idx = data.indexOf("*/", pos.value);
                if (idx !== -1)
                {
                    //console.log(data.substring(pos.value, idx + 2));
                    docBlocks.push(data.substring(pos.value, idx + 2));
                    pos.value = idx + 2;
                }
            }
            else if (next(data, pos, "require "))
            {
                const req = parseRequire(data, pos);
                requirements.push(req);
            }
            else
            {
                break;
            }            
        }

        requirements.push({ module: "shellfish/mid", alias: "mid" });
        requirements.push({ module: "shellfish/high", alias: "high" });

        let moduleDir = "/";
        if (moduleLocation.indexOf("/") !== -1)
        {
            moduleDir = moduleLocation.substr(0, moduleLocation.lastIndexOf("/"));
        }

        const code = `/* Compiled from Shui by Feng Shui Code Processor */
            "use strict";
            shRequire(["shellfish/preload", "shellfish/fengshui"], (preload_Internal, fengshui_Internal) =>
            {
                shRequire([${requirements.map(req => "\"" + req.module.replace(/^\.\//, moduleDir + "/") + "\"").join(", ")}],
                        (${requirements.map(req => req.alias).join(", ")}) =>
                {
                    const modules = { ${requirements.map(req => req.alias + ": " + req.alias).join(", ")} };

                    const __namespace = __filename;
                    function __rslv__(name) { return undefined; }

                    const elementLookupCache = new Map();
                    function elementLookup(fqElementName, rslv)
                    {
                        let explicitModule = "";
                        let elementName = fqElementName;
                        if (fqElementName.indexOf(".") !== -1)
                        {
                            const parts = fqElementName.split(".");
                            explicitModule = parts[0];
                            elementName = parts[1];
                        }

                        const cacheItem = elementLookupCache.get(fqElementName);
                        if (cacheItem)
                        {
                            if (cacheItem.create)
                            {
                                return cacheItem.create(rslv);
                            }
                            else
                            {
                                const el = high.element(cacheItem, null)
                                            .property("defaultContainer", "")
                                            .property("modelData", { });
                                const proto = Object.getPrototypeOf(el);

                                ["add", "property", "get", "find", "children", "call", "crossConnect", "flushPending", "addPendingCallback"]
                                .forEach(f => { el[f] = (...args) => proto[f].apply(el, args); });

                                return el;
                            }
                        }

                        for (let key in modules)
                        {
                            if (explicitModule !== "" && key !== explicitModule)
                            {
                                continue;
                            }

                            if (modules[key][elementName])
                            {
                                elementLookupCache.set(fqElementName, modules[key][elementName]);

                                if (modules[key][elementName].create)
                                {
                                    return modules[key][elementName].create(rslv);
                                }
                                else
                                {
                                    const el = high.element(modules[key][elementName], null)
                                               .property("defaultContainer", "")
                                               .property("modelData", { });
                                    const proto = Object.getPrototypeOf(el);

                                    ["add", "property", "get", "find", "children", "call", "crossConnect", "flushPending", "addPendingCallback"]
                                    .forEach(f => { el[f] = (...args) => proto[f].apply(el, args); });

                                    return el;
                                }
                            }
                        }

                        console.error("Element '" + fqElementName + "' is not defined in " + __filename + ".");
                        return null;
                    }

                    function __fakeDv__(a, setter)
                    {
                        const obj = { };
                        Object.defineProperty(obj, "val", {
                            get: () => a,
                            set: setter
                        });
                        return obj;
                    }

                    function __xsdv__(a, setter, functor)
                    {
                        return high.isDynamicValue(a) ? a : typeof a === "function" && functor ? { val: functor } : __fakeDv__(a, setter);
                    }

                    exports.${name} = {
                        ${docBlocks.join("\n")}
                        create: (__pRslv__) =>
                        {
                            //console.log(__filename + " __pRslv__ " + __pRslv__);
                            ${parseElement(data, pos, true, requirements)}
                            return high.routedElement(
                                root,
                                root.find(root.defaultContainer(), __namespace)
                            );
                        }
                    };
                }, fengshui_Internal.compile);
            });
        `;
        
        //console.log(code);
        return code;
    }

    function parseRequire(data, pos)
    {
        const result = {
            module: "",
            alias: "mod" + pos.value
        };

        expect(data, pos, "require");
        skipWhitespace(data, pos, true, true);
        const moduleName = readString(data, pos);
        result.module = moduleName;
        skipWhitespace(data, pos, true, true);
        if (next(data, pos, ";"))
        {
            ++pos.value;
        }
        else
        {
            expect(data, pos, "as");
            skipWhitespace(data, pos, true, true);
            result.alias = readUntil(data, pos, ";\t\n\r\v ");
            skipWhitespace(data, pos, true, true);
            expect(data, pos, ";");
        }

        return result;
    }

    function parseElement(data, pos, isRoot, modules)
    {
        let elementName = readToken(data, pos, TOKEN_IDENTIFIER);
        skipWhitespace(data, pos, true, true);
        
        expect(data, pos, "{");
        
        let code = "";
        
        const rslv = `
            const __rslvCache__ = new Map();
            function __rslv__(name)
            {
                if (name === "self") return self;

                let result = __rslvCache__.get(name);
                if (result)
                {
                    return result;
                }

                result = self[name] ||
                         self.find(name, __namespace) ||
                         __pRslv__(name) || 
                         modules[name];

                if (result)
                {
                    __rslvCache__.set(name, result);
                }
                
                return result;
            }
        `;

        if (isRoot)
        {
            code += `
                const root = elementLookup("${elementName}", __pRslv__);
                const self = root;
                
                ${rslv}

                self.objectType("${elementName}")${parseElementBlock(data, pos, modules)}
                .flushPending()
            `;
        }
        else
        {
            code += `
                ((__pRslv__) =>
                {
                    const self = elementLookup("${elementName}", __pRslv__);

                    ${rslv}

                    self.objectType("${elementName}")${parseElementBlock(data, pos, modules)}
                    .flushPending();
                    return self;
                })(__rslv__)
            `;
        }

        expect(data, pos, "}");
        code += "\n";

        // remove unused placeholders
        return code.replace(/\/\*__new__\*\//g, "");
    }

    function parseElementBlock(data, pos, modules)
    {
        let code = `.objectLocation(__filename + ":" + ${lineOfPos(data, pos)})`;
        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "}"))
            {
                break;
            }
            else if (next(data, pos, ";"))
            {
                expect(data, pos, ";");
            }
            else if (next(data, pos, "/**"))
            {
                let idx = data.indexOf("*/", pos.value);
                if (idx !== -1)
                {
                    //console.log(data.substring(pos.value, idx + 2));
                    code += data.substring(pos.value, idx + 2);
                    pos.value = idx + 2;
                }
            }
            else if (false && next(data, pos, "/*"))
            {
                skipCommentBlock(data, pos);
            }
            else if (nextIsUpperCase(data, pos) ||
                     nextIsToken(data, pos, TOKEN_ELEMENT))
            {
                let childCode = parseElement(data, pos, false, modules);
                code += "\n.use(self).add(" + childCode +")";
            }
            else if (next(data, pos, "into "))
            {
                expect(data, pos, "into");
                skipWhitespace(data, pos, true, true);
                let container = readToken(data, pos, TOKEN_NAME);
                skipWhitespace(data, pos, true, true);
                let childCode = parseElement(data, pos, false, modules);
                code += "\n.use(self).call(\"" + container + "Add\", " + childCode + ")";
            }
            else if (next(data, pos, "property "))
            {
                code += "\n" + parseCustomProperty(data, pos, modules);
            }
            else if (next(data, pos, "event "))
            {
                expect(data, pos, "event");
                skipWhitespace(data, pos, true, true);
                const evName = readToken(data, pos, TOKEN_NAME);
                code += "\n.use(self).event(\"" + evName + "\")";
            }
            else if (next(data, pos, "template "))
            {
                code += "\n" + parseTemplate(data, pos, modules);
            }
            else if (next(data, pos, "container "))
            {
                code += "\n" + parseContainer(data, pos);
            }
            else if (next(data, pos, "function "))
            {
                code += "\n" + parseFunctionProperty(data, pos, modules);
            }
            else
            {
                code += "\n" + parseProperty(data, pos, modules);
            }
        }

        return code;
    }

    function parseElementTemplate(data, pos, modules)
    {
        expect(data, pos, "template");
        skipWhitespace(data, pos, true, true);

        let code = "";
        if (nextIsToken(data, pos, TOKEN_ELEMENT))
        {
            code += "{ create: function (__pRslv__) { const __namespace = \"tmp." + pos.value + "\"; return function () { " + parseElement(data, pos, true, modules) + " return self; }; }(__rslv__) }";
        }
        else
        {
            throw "Syntax error in line " + lineOfPos(data, pos) + ": element expected.";
        }

        return code;
    }

    function parseCustomProperty(data, pos, modules)
    {
        //console.log("parseCustomProperty at " + pos.value + " " + data.substr(pos.value, 80));
        
        const scopes = [modules.map(m => m.alias), ["self"]];

        expect(data, pos, "property");
        skipWhitespace(data, pos, true, true);
        let propName = readUntil(data, pos, ":\t\n\r\v ");
        skipWhitespace(data, pos, true, true);
        expect(data, pos, ":");
        skipWhitespace(data, pos, true, true);
        
        let code = ".use(self).property(\"" + propName + "\", ";

        if (next(data, pos, "{"))
        {
            code += "function () " + parseJsBlock(data, pos, modules, scopes, chainResolver);
        }
        else if (nextIsToken(data, pos, TOKEN_ARROW_FUNCTION) ||
                 nextIsToken(data, pos, TOKEN_ARROW_FUNCTION_COMPACT))
        {
            code += parseJsArrowFunction(data, pos, modules, scopes, chainResolver);
        }
        else if (next(data, pos, "template"))
        {
            code += parseElementTemplate(data, pos, modules);
        }
        else if (nextIsToken(data, pos, TOKEN_ELEMENT))
        {
            code += parseElement(data, pos, false, modules);
        }
        else
        {
            code += parseBindingExpression(data, pos, modules);
        }

        code += ")";

        //const debugCode = btoa(code);
        //code += `.property("__code__${propName}", "${debugCode}")`;

        return code;
    }

    function parseFunctionProperty(data, pos, modules)
    {
        //console.log("parseFunctionProperty at " + pos.value + " " + data.substr(pos.value, 80));
        
        expect(data, pos, "function");
        skipWhitespace(data, pos, true, true);
        let propName = readUntil(data, pos, "(\t\n\r\v ");
        skipWhitespace(data, pos, true, true);
        
        let code = ".use(self).property(\"" + propName + "\", ";

        let params = [];
        const scopes = [modules.map(m => m.alias), ["self"]];
        code += parseJsParameters(data, pos, (p) => { params.push(p); });
        skipWhitespace(data, pos, true, true);
        code += " => ";
        code += parseJsBlock(data, pos, modules, scopes.concat([params]), chainResolver);

        code += ")";

        //const debugCode = btoa(code);
        //code += `.property("__code__${propName}", "${debugCode}")`;

        //console.log("function code: " + code);
        return code;
    }

    function parseContainer(data, pos)
    {
        expect(data, pos, "container");
        skipWhitespace(data, pos, true, true);
        let name = readToken(data, pos, TOKEN_NAME);
        skipWhitespace(data, pos, true, true);
        expect(data, pos, ":");
        skipWhitespace(data, pos, true, true);
        let targetName = readToken(data, pos, TOKEN_NAME);

        let code = ".use(self)";
        if (name === "default")
        {
            code += ".defaultContainer(\"" + targetName + "\")";
        }
        else
        {
            code += ".property(\"" + name + "Add\", " +
                    "function (child)" +
                    "{" +
                    //"  console.log('Add to container: " + targetName + "');" +
                    "  self.find(\"" + targetName + "\", __namespace).add(child);" +
                    "  return self;" +
                    "})";
        }
        //console.log("Container Code: " + code);
        return code;
    }

    function parseTemplate(data, pos, modules)
    {
        expect(data, pos, "template");
        skipWhitespace(data, pos, true, true);
        let propName = readUntil(data, pos, ":\t\n\r\v ");
        skipWhitespace(data, pos, true, true);
        expect(data, pos, ":");
        skipWhitespace(data, pos, true, true);
        
        let code = ".use(self).property(\"" + propName + "\", ";

        if (nextIsToken(data, pos, TOKEN_ELEMENT))
        {
            code += `{
                create: (__pRslv__) =>
                {
                    return () =>
                    {
                        ${parseElement(data, pos, true, modules)} return root;
                    }
                }(__rslv__)
            }`;
        }
        else
        {
            throw "Syntax error in line " + lineOfPos(data, pos) + ": element expected.";
        }

        code += ")";

        return code;
    }

    function parseProperty(data, pos, modules)
    {
        //console.log("parseProperty at " + pos.value + " " + data.substr(pos.value, 80));

        let propName = readUntil(data, pos, ":\t\n\r\v ");
        skipWhitespace(data, pos, true, true);
        expect(data, pos, ":");
        skipWhitespace(data, pos, true, true);

        let code = "";
        if (propName.indexOf(".") !== -1)
        {
            // binding to another element's event
            const parts = propName.split(".");
            const elName = parts[0];
            const slotName = parts[1];
            if (! slotName.startsWith("on"))
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": '" + slotName + "' is not a valid event slot";
            }
            const eventName = slotName[2].toLowerCase() + slotName.substr(3);
            //console.log(JSON.stringify(parts));
            code = `.use(self).crossConnect(() => { return __rslv__("${elName}"); }, "${eventName}")(`;
        }
        else
        {
            code = `.use(self).${propName}(`;
        }

        if (next(data, pos, "{"))
        {
            // simple function
            const codeBlock = parseJsBlock(data, pos, modules, [["self"]], chainResolver);
            //console.log("Code: " + codeBlock);
            // use function to have "arguments" available
            code += "function () " + codeBlock;
        }
        else if (nextIsToken(data, pos, TOKEN_ARROW_FUNCTION) ||
                 nextIsToken(data, pos, TOKEN_ARROW_FUNCTION_COMPACT))
        {
            const scopes = [modules.map(m => m.alias), ["self"]];
            code += parseJsArrowFunction(data, pos, modules, scopes, chainResolver);
        }
        else if (next(data, pos, "template"))
        {
            if (propName === "delegate")
            {
                code += "function (modelData)" +
                        "{" +
                        "  let item = " + parseElementTemplate(data, pos, modules) + ".create(__rslv__);" +
                        "  item.modelData(modelData);" +
                        "  item.onDataChange((data) => { item.modelData(data); });" +
                        "  return item;" +
                        "}";
            }
            else
            {
                code += parseElementTemplate(data, pos, modules);
            }
        }
        else if (nextIsToken(data, pos, TOKEN_ELEMENT))
        {
            code += parseElement(data, pos, false, modules);
        }
        else
        {
            if (propName === "id")
            {
                code += "\"" + readToken(data, pos, TOKEN_IDENTIFIER) + "\"";
            }
            else
            {
                code += parseBindingExpression(data, pos, modules);
            }
        }

        if (propName === "id")
        {
            code += ", __namespace";
        }

        code += ")";

        //console.log("Property: " + code);
        return code;
    }

    function parseBindingExpression(data, pos, modules)
    {
        // it's all in the closure
        let aliasMap = new Map();
        let aliasCounter = 0;
        const aliasCache = new Map();
        
        function bindingResolver(parts, scopes, line)
        {
            //console.log("Resolving chain in binding expression: " + JSON.stringify(parts));
            let firstInChain = parts[0];
            if (JS_GLOBALS.indexOf(firstInChain) !== -1 ||
                inScope(scopes, firstInChain))
            {
                return chainResolver(parts, scopes, line);
            }
            else
            {
                const splitResult = splitChain(parts);

                let alias = "";
                if (aliasCache.has(parts.join(".")))
                {
                    alias = aliasCache.get(parts.join("."));
                }
                else
                {
                    alias = "alias" + aliasCounter;
                    ++aliasCounter;
                    aliasMap.set(alias, makeChainRef(splitResult[0]));
                    aliasCache.set(parts.join("."), alias);
                }
                scopes[scopes.length - 1].push(alias);
                
                return chainResolver([alias].concat(splitResult[1]), scopes, line);
            }   
        }

        //console.log("parseBindingExpression at " + pos.value + " " + data.substr(pos.value, 80));
        const beginAt = pos.value;
        const line = lineOfPos(data, pos);
        // put the imported modules into the initial scopes
        const scopes = [modules.map(m => m.alias), ["self"]];
        let code = parseJsExpression(data, pos, modules, scopes, bindingResolver);
        const originalCode = data.substring(beginAt, pos.value);
        const debugAnnotation = `[l. ${line}] ${originalCode}`;
        if (next(data, pos, ";"))
        {
            expect(data, pos, ";");
        }

        if (aliasMap.size > 0)
        {
            let depsList = [];
            let argsList = [];
            for (let entry of aliasMap)
            {
                let alias = entry[0];
                let ref = entry[1];
                depsList.push(ref);
                argsList.push(alias);
            }
            //console.log("Binding: high.binding([" + depsList.join(",") + "], (" + argsList.join(",") + ") => { return " + code + "; })");
            return "high.binding([" + depsList.join(",") + "], (" + argsList.join(",") + ") => { return " + code + "; }, __filename + " + JSON.stringify(debugAnnotation) + ")";
        }
        else
        {
            //console.log("Literal: " + code);
            return code;
        }
    }

    function inScope(scopes, varName)
    {
        // there's no need to traverse the scopes in reverse order since we
        // are only interested whether the variable name is in scope, but not
        // where exactly
        return scopes.reduce((a, b) =>
        {
            return a || (b.indexOf(varName) !== -1);
        }, false);
    }

    function parseJsStatement(data, pos, modules, scopes, resolver)
    {
        //console.log("parseJsStatement at " + pos.value + " " + data.substr(pos.value, 80));
        let code = "";

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, false, true);

            if (next(data, pos, "\n"))
            {
                // end of statement
                code += expect(data, pos, "\n");
                break;
            }
            else if (next(data, pos, ";"))
            {
                // end of statement
                code += expect(data, pos, ";");
                break;
            }
            else if (next(data, pos, ":"))
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": invalid character '" + data[pos.value] + "'.";
            }
            else if (next(data, pos, "}"))
            {
                // end of block
                break;
            }
            else if (next(data, pos, "{"))
            {
                // block
                code += parseJsBlock(data, pos, modules, scopes.concat([[]]), resolver);
                break;
            }
            else if (nextIsToken(data, pos, TOKEN_NAME))
            {
                let prevPos = pos.value;
                const identifier = readToken(data, pos, TOKEN_NAME);
                if (identifier === "var")
                {
                    code += identifier + " ";
                    skipWhitespace(data, pos, true, true);
                    const varName = readToken(data, pos, TOKEN_NAME);
                    code += varName;
                    skipWhitespace(data, pos, true, true);

                    // function scope
                    scopes[0].push(varName);

                    if (next(data, pos, "="))
                    {
                        code += parseJsExpression(data, pos, modules, scopes, resolver);
                    }
                    else
                    {
                        // end of statement
                        break;
                    }
                }
                else if (identifier === "const" || identifier === "let")
                {
                    code += identifier + " ";
                    skipWhitespace(data, pos, true, true);
                    const varName = readToken(data, pos, TOKEN_NAME);
                    code += varName;
                    skipWhitespace(data, pos, true, true);

                    // block scope
                    scopes[scopes.length - 1].push(varName);

                    if (next(data, pos, "="))
                    {
                        code += expect(data, pos, "=");
                        code += parseJsExpression(data, pos, modules, scopes, resolver);
                    }
                    else
                    {
                        // end of statement
                        break;
                    }
                }
                else if (identifier === "if" || identifier === "while")
                {
                    code += identifier + " ";
                    skipWhitespace(data, pos, true, true);
                    code += parseJsExpression(data, pos, modules, scopes, resolver);
                    skipWhitespace(data, pos, true, true);
                    code += parseJsStatement(data, pos, modules, scopes, resolver);
                    
                    skipWhitespace(data, pos, true, true);
                    if (next(data, pos, "else"))
                    {
                        code += expect(data, pos, "else");
                    }
                    break;
                }
                else if (identifier === "do")
                {
                    code += identifier + " ";
                    code += parseJsStatement(data, pos, modules, scopes, resolver);
                    skipWhitespace(data, pos, true, true);
                    code += expect(data, pos, "while");
                    skipWhitespace(data, pos, true, true);
                    code += expect(data, pos, "(");
                    code += parseJsExpression(data, pos, modules, scopes, resolver);
                    code += expect(data, pos, ")");
                    break;
                }
                else if (identifier === "for")
                {
                    pos.value = prevPos;
                    code += parseJsForLoop(data, pos, modules, scopes.concat([[]]), resolver);
                    break;
                }
                else if (identifier === "switch")
                {
                    pos.value = prevPos;
                    code += parseJsSwitch(data, pos, modules, scopes, resolver);
                    break;
                }
                else if (identifier === "break" || identifier === "continue")
                {
                    // TODO: support labels
                    code += identifier;
                    break;
                }
                else if (identifier === "throw")
                {
                    code += identifier + " ";
                    skipWhitespace(data, pos, true, true);
                    code += parseJsExpression(data, pos, modules, scopes, resolver);
                    break;
                }
                else if (identifier === "try")
                {
                    // TODO: support multiple catches and finally
                    code += identifier;
                    skipWhitespace(data, pos, true, true);
                    code += parseJsBlock(data, pos, modules, scopes.concat([[]]), resolver);
                    skipWhitespace(data, pos, true, true);
                    code += expect(data, pos, "catch");
                    skipWhitespace(data, pos, true, true);
                    code += expect(data, pos, "(");
                    const errVar = readToken(data, pos, TOKEN_NAME);
                    code += errVar;
                    code += expect(data, pos, ")");
                    skipWhitespace(data, pos, true, true);
                    code += parseJsBlock(data, pos, modules, scopes.concat([[errVar]]), resolver);
                    break;
                }
                else if (identifier === "return")
                {
                    code += identifier;
                    skipWhitespace(data, pos, true, true);
                    code += parseJsExpression(data, pos, modules, scopes, resolver);
                    break;
                }
                else if (JS_KEYWORDS.indexOf(identifier) !== -1)
                {
                    code += identifier + " ";
                    break;
                }
                else
                {
                    if (next(data, pos, ":"))
                    {
                        // label
                        code += identifier + expect(data, pos, ":");
                    }
                    else
                    {
                        pos.value = prevPos;
                        code += parseJsExpression(data, pos, modules, scopes, resolver);
                    }
                }
            }
            else if (nextIsToken(data, pos, TOKEN_OPERATOR))
            {
                code += parseJsExpression(data, pos, modules, scopes, resolver);
                break;
            }
            else
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": invalid character '" + data[pos.value] + "'.";
            }
        }

        //console.log("Statement: " + code);
        return code;
    }

    function parseJsExpression(data, pos, modules, scopes, resolver)
    {
        //console.log("parseJsExpression at " + pos.value + " " + data.substr(pos.value, 80));

        let code = "";
        let mayTerminate = false;

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, false, true);
            code += " ";

            //console.log("next: " + data.substr(pos.value, 80));
            //console.log("mayTerminate: " + mayTerminate);

            if (next(data, pos, ";"))
            {
                // end of statement
                break;
            }
            else if (next(data, pos, ",") || next(data, pos, ":") || next(data, pos, ")") || next(data, pos, "]") || next(data, pos, "}"))
            {
                // end of expression
                break;
            }
            else if (next(data, pos, "\n"))
            {
                // possible end of statement (semicolon-insertion applies)
                //console.log("new line end of expression and statement " + mayTerminate);
                if (mayTerminate)
                {
                    break;
                }
                else
                {
                    code += expect(data, pos, "\n");
                }
            }
            else if (next(data, pos, "\"\"\""))
            {
                code += "\"" + readLiteralString(data, pos) + "\"";
                console.log(code);
                mayTerminate = true;
            }
            else if (next(data, pos, "\""))
            {
                // string
                code += "\"" + readString(data, pos) + "\"";
                mayTerminate = true;
            }
            else if (next(data, pos, "'"))
            {
                // string
                code += "'" + readString(data, pos) + "'";
                mayTerminate = true;
            }
            else if (next(data, pos, "["))
            {
                // array
                code += expect(data, pos, "[");
                code += parseJsList(data, pos, modules, scopes, resolver);
                code += expect(data, pos, "]");
                mayTerminate = true;
            }
            else if (nextIsToken(data, pos, TOKEN_ARROW_FUNCTION) ||
                     nextIsToken(data, pos, TOKEN_ARROW_FUNCTION_COMPACT))
            {
                code += parseJsArrowFunction(data, pos, modules, scopes, resolver);
                mayTerminate = true;
            }
            else if (next(data, pos, "..."))
            {
                code += expect(data, pos, "...");
                mayTerminate = false;
            }
            else if (next(data, pos, "("))
            {
                // parens
                code += expect(data, pos, "(");
                code += parseJsExpression(data, pos, modules, scopes, resolver);
                code += expect(data, pos, ")");
                mayTerminate = true;
            }
            else if (next(data, pos, "{"))
            {
                if (mayTerminate)
                {
                    // this is already another expression
                    break;
                }
                else
                {
                    // object
                    code += parseJsObject(data, pos, modules, scopes, resolver);
                    mayTerminate = true;
                }
            }
            else if (next(data, pos, "?"))
            {
                // ternary operator
                code += expect(data, pos, "?");
                code += parseJsExpression(data, pos, modules, scopes, resolver);
                skipWhitespace(data, pos, true, true);
                code += expect(data, pos, ":");
                code += parseJsExpression(data, pos, modules, scopes, resolver);
                mayTerminate = true;
            }
            else if (next(data, pos, "true") || next(data, pos, "false"))
            {
                // boolean value
                code += readToken(data, pos, TOKEN_NAME);
                mayTerminate = true;
            }
            else if (next(data, pos, "instanceof"))
            {
                code += expect(data, pos, "instanceof");
                mayTerminate = false;
            }
            else if (next(data, pos, "typeof"))
            {
                code += expect(data, pos, "typeof");
                mayTerminate = false;
            }
            else if (nextIsToken(data, pos, TOKEN_HEXNUMBER))
            {
                // hex number
                code += readToken(data, pos, TOKEN_HEXNUMBER);
                mayTerminate = true;
            }
            else if (nextIsToken(data, pos, TOKEN_NUMBER))
            {
                // number
                code += readToken(data, pos, TOKEN_NUMBER);
                mayTerminate = true;
            }
            else if (nextIsToken(data, pos, TOKEN_OPERATOR))
            {
                // operator
                const s = readToken(data, pos, TOKEN_OPERATOR);
                code += s;
                mayTerminate = (s === "++" || s === "--");
            }
            else if (nextIsToken(data, pos, TOKEN_NAME))
            {
                const prevPos = pos.value;
                const identifier = readToken(data, pos, TOKEN_NAME);
                if (identifier === "new")
                {
                    skipWhitespace(data, pos, true, true);

                    if (next(data, pos, "direct "))
                    {
                        expect(data, pos, "direct");
                        console.warn(`The "direct" keyword is not required anymore and is deprecated. Used in line ${lineOfPos(data, pos)}.`);
                    }

                    const c = parseJsExpression(data, pos, modules, scopes, resolver);

                    // insert "new" into expression where appropriate
                    if (c.trimLeft()[0] === "(")
                    {
                        // fill in the last "__new__" placeholder in the
                        // expression as that ought to be the right one
                        const idx = c.lastIndexOf("/*__new__*/");
                        if (idx !== -1)
                        {
                            code += c.substr(0, idx) + "new" + c.substr(idx + 11);
                        }
                        else
                        {
                            throw "Syntax error in line " + lineOfPos(data, pos) + ": 'new' requires a constructor function.";
                        }
                    }
                    else
                    {
                        code += "new " + c;
                    }
                }
                else if (identifier === "async")
                {
                    code += identifier;
                }
                else if (identifier === "function")
                {
                    let params = [];
                    code += identifier;
                    skipWhitespace(data, pos, true, true);
                    code += parseJsParameters(data, pos, (p) => { params.push(p); });
                    skipWhitespace(data, pos, true, true);
                    code += parseJsBlock(data, pos, modules, scopes.concat([params]), resolver);
                }
                else if (identifier === "class")
                {
                    throw "Keyword 'class' at " + lineOfPos(data, pos) + " is currently not supported.";
                }
                else if (identifier === "direct")
                {
                    // FIXME: is still required for Emscripten embind enums...
                    //console.warn(`The "direct" keyword is not required anymore and is deprecated. Used in line ${lineOfPos(data, pos)}.`);
                    skipWhitespace(data, pos, true, true);
                    code += parseJsChain(data, pos, modules, scopes, (parts, scopes) =>
                    {
                        // do not attempt to resolve anything
                        let code = parts[0];
                        parts.shift();
                        parts.forEach((p) =>
                        {               
                            code += (p[0] !== "(" && p[0] !== "[") ? "." + p
                                                                   : p; 
                        });
                        return code;
                    });
                }
                else
                {
                    pos.value = prevPos;
                    code += parseJsChain(data, pos, modules, scopes, resolver);
                }
                mayTerminate = true;
            }
            else
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": invalid character '" + data[pos.value] + "'.";
            }
        }// while

        //console.log("Expression: " + code);
        return code;
    }

    function parseJsBlock(data, pos, modules, scopes, resolver)
    {
        //console.log("parseJsBlock at " + pos.value  + " " + data.substr(pos.value, 80));
        let code = "";

        code += expect(data, pos, "{");
        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            code += " ";

            if (next(data, pos, "}"))
            {
                // end of block
                code += expect(data, pos, "}");
                break;
            }
            else if (next(data, pos, ":"))
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": invalid character '" + data[pos.value] + "'.";
            }
            else
            {
                code += parseJsStatement(data, pos, modules, scopes, resolver);
            }
        }

        //console.log("Code block: {\n" + code + "\n}");
        return code;
    }

    function parseJsObject(data, pos, modules, scopes, resolver)
    {
        //console.log("parseJsObject at " + pos.value + " " + data.substr(pos.value, 80));

        let code = "";
        code += expect(data, pos, "{");

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            
            if (next(data, pos, "}"))
            {
                break;
            }

            // parse key

            else if (next(data, pos, "\""))
            {
                // key string
                code += "\"" + readString(data, pos) + "\"";
            }
            else if (next(data, pos, "'"))
            {
                // key string
                code += "'" + readString(data, pos) + "'";
            }
            else
            {
                // unquoted key
                code += readToken(data, pos, TOKEN_NAME);
            }

            skipWhitespace(data, pos, true, true);
            code += expect(data, pos, ":");

            // parse value

            code += parseJsExpression(data, pos, modules, scopes, resolver);

            skipWhitespace(data, pos, true, true);
            if (! next(data, pos, ","))
            {
                break;
            }
            else
            {
                code += expect(data, pos, ",");
            }
        }

        code += expect(data, pos, "}");
        return code;
    }

    function parseJsParameters(data, pos, parameterCallback)
    {
        let code = "";

        code += expect(data, pos, "(");

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            if (nextIsToken(data, pos, TOKEN_NAME))
            {
                const name = readToken(data, pos, TOKEN_NAME);
                parameterCallback(name);
                code += name;
            }

            skipWhitespace(data, pos, true, true);
            if (next(data, pos, ")"))
            {
                // end of parameters
                break;
            }
            else
            {
                code += expect(data, pos, ",");
            }
        }

        code += expect(data, pos, ")");
        //console.log("Parameters: " + code);
        return code;
    }

    function parseJsList(data, pos, modules, scopes, resolver)
    {
        let code = "";

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            code += parseJsExpression(data, pos, modules, scopes, resolver);

            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "]") || next(data, pos, ")"))
            {
                // end of list
                break;
            }
            else
            {
                code += expect(data, pos, ",");
            }
        }

        return code;
    }

    function parseJsChain(data, pos, modules, scopes, resolver)
    {
        //console.log("parseJsChain at " + pos.value + " with scope " + JSON.stringify(scopes) + " " + data.substr(pos.value, 80));

        let parts = [];
        let isFirst = true;

        while (pos.value < data.length)
        {
            let part = "";

            if (! isFirst && next(data, pos, "("))
            {
                part += expect(data, pos, "(");
                part += parseJsList(data, pos, modules, scopes, resolver);
                part += expect(data, pos, ")");
            }
            else if (! isFirst && next(data, pos, "["))
            {
                part += expect(data, pos, "[");
                part += parseJsList(data, pos, modules, scopes, resolver);
                part += expect(data, pos, "]");
            }
            else
            {
                const identifier = readToken(data, pos, TOKEN_NAME);
                part += identifier;
            }
            isFirst = false;
            parts.push(part);
            
            const prevPos = pos.value;
            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "."))
            {
                expect(data, pos, ".");
                continue;
            }
            else if (next(data, pos, "(") || next(data, pos, "["))
            {
                continue;
            }
            else
            {
                // end of chain
                pos.value = prevPos;
                break;
            }
        }

        return resolver(parts, scopes, lineOfPos(data, pos));
    }

    function parseJsForLoop(data, pos, modules, scopes, resolver)
    {
        let code = "";

        code += expect(data, pos, "for");
        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, "(");
        code += parseJsStatement(data, pos, modules, scopes, resolver);
        skipWhitespace(data, pos, true, true);
        if (next(data, pos, "in"))
        {
            code += " " + expect(data, pos, "in") + " ";
            skipWhitespace(data, pos, true, true);
            code += parseJsExpression(data, pos, modules, scopes, resolver);
        }
        else if (next(data, pos, "of"))
        {
            code += " " + expect(data, pos, "of") + " ";
            skipWhitespace(data, pos, true, true);
            code += parseJsExpression(data, pos, modules, scopes, resolver);
        }
        else if (! next(data, pos, ")"))
        {
            skipWhitespace(data, pos, true, true);
            code += parseJsExpression(data, pos, modules, scopes, resolver);
            skipWhitespace(data, pos, true, true);
            code += expect(data, pos, ";");
            skipWhitespace(data, pos, true, true);
            code += parseJsExpression(data, pos, modules, scopes, resolver);
            skipWhitespace(data, pos, true, true);
        }
        code += expect(data, pos, ")");
        skipWhitespace(data, pos, true, true);
        code += parseJsStatement(data, pos, modules, scopes, resolver);

        return code;
    }

    function parseJsSwitch(data, pos, modules, scopes, resolver)
    {
        let code = "";

        code += expect(data, pos, "switch");
        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, "(");
        code += parseJsExpression(data, pos, modules, scopes, resolver);
        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, ")");

        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, "{");

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            
            code += "\n";

            const token = readToken(data, pos, TOKEN_NAME);
            if (token === "case")
            {
                code += token;
                skipWhitespace(data, pos, true, true);
                code += parseJsExpression(data, pos, modules, scopes, resolver);
            }
            else if (token === "default")
            {
                code += token;
            }
            else
            {
                throw "Syntax error in line " + lineOfPos(data, pos) + ": 'case' or 'default' expected.";
            }
            
            skipWhitespace(data, pos, false, true);
            code += expect(data, pos, ":");
            
            while (pos.value < data.length)
            {
                skipWhitespace(data, pos, false, true);
                code += parseJsStatement(data, pos, modules, scopes, resolver);

                skipWhitespace(data, pos, false, true);
                if (next(data, pos, "}") || next(data, pos, "case") || next(data, pos, "default"))
                {
                    // end of case
                    break;
                }
            }

            if (next(data, pos, "}"))
            {
                // end of switch
                break;
            }
        }

        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, "}");

        return code;
    }

    function parseJsArrowFunction(data, pos, modules, scopes, resolver)
    {
        let code = "";

        // arrow function
        let params = [];
        if (next(data, pos, "("))
        {
            code += parseJsParameters(data, pos, (p) => { params.push(p); });
        }
        else
        {
            const p = readToken(data, pos, TOKEN_NAME);
            params.push(p);
            code += p;
        }
        skipWhitespace(data, pos, true, true);
        code += expect(data, pos, "=>");
        skipWhitespace(data, pos, true, true);
        if (next(data, pos, "{"))
        {
            code += parseJsBlock(data, pos, modules, scopes.concat([params]), resolver);
        }
        else
        {
            code += parseJsExpression(data, pos, modules, scopes.concat([params]), chainResolver);
        }
        return code;
    }

    function chainResolver(parts, scopes, line)
    {
        const names = parts
        .map((p, i) => p.startsWith("(") ? "CALL_" + i
                                         : p.startsWith("[") ? "ACCESS_" + i
                                                             : p + "_" + i);
        //console.log("names in chain: " + JSON.stringify(names));

        let counter = 0;

        let accessed = "";
        let code = "(() => {";

        if (line !== thePreviousLine)
        {
            code += `mid.dbgctx = __filename + ":${line}";`;
            thePreviousLine = line;
        }

        let firstInChain = parts[0];

        if (JS_GLOBALS.indexOf(firstInChain) !== -1)
        {
            // do not attempt to resolve anything
            let code = firstInChain;
            parts.shift();
            parts.forEach((p) =>
            {               
                code += (p[0] !== "(" && p[0] !== "[") ? "." + p
                                                       : p; 
            });
            //console.log("Resolving to: " + code + " (global)");
            return code;
        }
        else if (inScope(scopes, firstInChain))
        {
            // the first in chain is in scope and doesn't need to be resolved
            accessed = accessDv(firstInChain);
            code += `const ${names[counter]} = ${accessed};`;
        }
        else
        {
            // resolve first in chain
            accessed = accessDv("__rslv__(\"" + firstInChain + "\")");
            code += `const ${names[counter]} = ${accessed};`;
            
        }

        parts.shift();
        parts.forEach((p) =>
        {
            ++counter;
            if (p[0] !== "(" && p[0] !== "[")
            {
                // attach part with .
                accessed = accessDv(`${names[counter - 1]}.val.${p}`);
            }
            else
            {
                // attach part without .
                accessed = accessDv(`${names[counter - 1]}.val${p}`);
            }
            code += `const ${names[counter]} = ${accessed};`;
        });
        
        code += `return ${names[counter]};`;
        code += "})().val";
        //console.log("Resolving to: " + code);

        return code;
    }

    /* Splits the given chain into two parts. The aliasable one and the rest.
     */
    function splitChain(parts)
    {
        let head = [];
        let tail = [];

        let onHead = true;
        parts.forEach(function (p)
        {
            if (p[0] === "[" || p[0] === "(")
            {
                onHead = false;
            }

            if (onHead)
            {
                head.push(p);
            }
            else
            {
                tail.push(p);
            }
        });

        return [head, tail];
    }

    function makeChainRef(chain)
    {
        return "high.chainRef(root, " + JSON.stringify(chain) + ", __rslv__)";
    }

    /* Creates an IIFE for transparently accessing a (dynamic) value.
     * The IIFE is used to replace the variable.
     * Non-dynamic values may thus be accessed as if they were dynamic values.
     */
    function accessDv(item)
    {
        // this function does pure magic and is the essence of Shui,
        // in other words, it allows transparent use of dynamic values

        /*
        function makeFakeDv(item)
        {
            if (item)
            {
                return `__fakeDv__(a, v => { ${item} = v; })`;
            }
            else
            {
                return `__fakeDv__(a, v => { })`;
            }
        }
        
        function makeFunctor(item)
        {
            // "__new__" is the placeholder where a "new" operator may be
            // inserted, if needed
            return item ? `{ val: (...args) => { return / *__new__* / (${item})(...args); } }` : "undefined";
        }
        */

        // if "item" is a DV, just return it, otherwise, construct a wrapper
        // simulating a DV
        if (item.endsWith(")"))
        {
            // not a valid left-hand-side; the expression may be optimized
            //return `((a) => { return high.isDynamicValue(a) ? a : ${makeFakeDv()}; })(${item})`;
            return `__xsdv__(${item}, () => { })`;
        }
        else
        {
            const setter = item ? `v => { ${item} = v; }` : `v => { }`;

            // "__new__" is the placeholder where a "new" operator may be
            // inserted, if needed
            //const functor = item ? `{ val: (...args) => { return /*__new__*/ (${item})(...args); } }` : "undefined";
            const functor = item ? `(...args) => { return /*__new__*/ (${item})(...args); }` : "undefined";

            //return `((a) => { return high.isDynamicValue(a) ? a : typeof a === "function" ? ${makeFunctor(item)} : ${makeFakeDv(item)}; })(${item})`;
            return `__xsdv__(${item}, ${setter}, ${functor})`;
        }
    }


    // check if we're running from command line in a Node.js environment
    if (typeof process !== "undefined" &&
        process.versions && process.versions.node &&
        typeof require !== "undefined" &&
        typeof module !== "undefined" &&
        require.main === module)
    {
        const modFs = require("fs");

        function help()
        {
            console.log("Compiles a Shui document and produces JavaScript code.");
            console.log("");
            console.log("Usage: node fengshui.js <shui-file>");
            console.log("");
        }

        if (process.argv.length !== 3 || process.argv[2] === "-h")
        {
            help();
            process.exit(1);
        }

        const shuiFile = process.argv[2];
        const outFile = shuiFile + ".js";
        const js = compile(shuiFile, modFs.readFileSync(shuiFile).toString());
        modFs.writeFileSync(outFile, js);
    }

})();
