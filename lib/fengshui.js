/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

/* Feng Shui is a code processor for transpiling Shui (Shellfish-UI) code into
 * Shellfish high-level API JavaScript code.
 */
(function()
{
    const JS_KEYWORDS = [
        "break",
        "catch",
        "class",
        "const",
        "continue",
        "do",
        "for",
        "function",
        "if",
        "let",
        "new",
        "return",
        "super",
        "switch",
        "throw",
        "try",
        "until",
        "var",
        "while"
    ];

    const JS_GLOBALS = [
        "__dirname",
        "__rslv__",
        "alert",
        "arguments",
        "Array",
        "console",
        "Date",
        "Function",
        "JSON",
        "Map",
        "Math",
        "moduleLocation",
        "null",
        "Object",
        "Promise",
        "Proxy",
        "undefined",
        "URL",
        "WeakMap",
        "window"
    ];

    const TOKEN_ELEMENT = /^([a-z][a-z0-9_]*\.)?[A-Z_][a-zA-Z0-9_]* *{/;
    const TOKEN_NAME = /^[a-z_][a-z0-9_]*/i;
    const TOKEN_IDENTIFIER = /^[a-z_][a-z_0-9]*(\.[a-z_0-9]+)*/i;
    const TOKEN_NUMBER = /^[0-9]+(\.[0-9]+)?([eE]-?[0-9]+)?/;
    const TOKEN_OPERATOR = /^[+\-*/%&|~!=<>]+/;
    const TOKEN_ARROW_FUNCTION = /^\([a-z_][a-z_0-9]* *(, *[a-z_][a-z_0-9]*)* *\) *=>/i;

    /** 
     * Compiles a Shui module to JavaScript code.
     * 
     * @param {string} url - The URL the module came from.
     * @param {string} data - The Shui document.
     */
    function compile(url, data)
    {
        if (url.toLowerCase().endsWith(".shui"))
        {
            const parts = url.split("/");
            const name = parts[parts.length - 1].replace(/\.shui$/, "");

            const now = new Date().getTime();
            let pos = { value: 0 };
            let obj = parseShui(url, name, data, pos);
            console.log("Compiled Shui Document '" + url + "' in " + (new Date().getTime() - now) + " ms.");
            return obj;
        }
        else
        {
            return data;
        }
    }
    exports.compile = compile;
    
    /**
     * Loads a Shui module from URL.
     * 
     * @param {string} url - The URL of the document.
     * @param {object} parent - Unused.
     * @param {function} rslv - A function resolving element IDs.
     * @param {function} callback - The callback that is invoked after the module was loaded.
     */
    function load(url, parent, rslv, callback)
    {
        shRequire(url, function (shui)
        {
            for (let key in shui)
            {
                if (shui[key].create)
                {
                    const now = new Date().getTime();
                    let root = shui[key].create(rslv);
                    console.log("Created Shui Document '" + url + "' in " + (new Date().getTime() - now) + " ms.");
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

    /**
     * Loads the main Shui document as entry point. The location is either
     * taken from the data-shui script tag property, or from the location
     * URL.
     */
    exports.loadMain = function ()
    {
        let haveShui = false;
        const resolver = (name) =>
        {
            //console.error("Failed to resolve " + name);
            return undefined;
        };

        // load from data-shui, if specified
        const scripts = document.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; ++i)
        {
            const script = scripts[i];

            const shui = script.getAttribute("data-shui");
            if (shui && shui !== "")
            {
                load(shui, null, resolver);
                haveShui = true;
                break;
            }
        }

        if (! haveShui)
        {
            const s = window.location.search.substr(1);
            const parts = s.split("&");
            parts.forEach((p) =>
            {
                if (! haveShui)
                {
                    const item = p.split("=");
                    if (item[0] === "shui")
                    {
                        load(item[1], null, resolver);
                        haveShui = true;
                    }
                }
            });
        }

        if (! haveShui)
        {
            document.write(`
                <h1>Failed to Load Shui Document</h1>
                <p>
                Please specify an entry point Shui document in the URL parameters, e.g.
                <p>
                <tt>https://example.com/index.html?shui=main.shui</tt>
                <hr>
                <i>Shellfish UI toolkit &copy; 2019 - 2020 Martin Grimme</i>
            `);
        }
    };


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
                else if (next(data, pos, "/*"))
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
            throw "Syntax error in line " + lineOfPos(data, pos) + ": '" + what + "' expected.";
        }
    }

    function readUntil(data, pos, chars)
    {
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
        let s = readUntil(data, pos, "\r\n");
        if (pos.value < data.length && data[pos.value] === "\r")
        {
            expect(data, pos, "\r");
            expect(data, pos, "\n");
        }
        else if (pos.value < data.length && data[pos.value] === "\n")
        {
            expect(data, pos, "\n");
        }
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

    function parseShui(moduleLocation, name, data, pos)
    {
        const requirements = [];

        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "require "))
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

        const code = `"use strict";
            shRequire(["${__dirname}/preload.js", "${__dirname}/fengshui.js"], (preload_Internal, fengshui_Internal) =>
            {
                shRequire([${requirements.map(req => "\"" + req.module.replace(/^\.\//, moduleDir + "/") + "\"").join(", ")}],
                        (${requirements.map(req => req.alias).join(", ")}) =>
                {
                    const moduleLocation = "${moduleLocation}";
                    const modules = { ${requirements.map(req => req.alias + ": " + req.alias).join(", ")} };

                    function __rslv__(name) { return undefined; }

                    const elementLookupCache = new Map();
                    function elementLookup(elementName, rslv)
                    {
                        if (elementLookupCache.has(elementName))
                        {
                            const cacheItem = elementLookupCache.get(elementName);
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

                                ["add", "onInit", "property", "get", "find", "children", "call"]
                                .forEach(f => { el[f] = (...args) => proto[f].apply(el, args); });

                                return el;
                            }
                        }

                        let explicitModule = "";
                        if (elementName.indexOf(".") !== -1)
                        {
                            const parts = elementName.split(".");
                            explicitModule = parts[0];
                            elementName = parts[1];
                        }

                        for (let key in modules)
                        {
                            if (explicitModule !== "" && key !== explicitModule)
                            {
                                continue;
                            }

                            if (modules[key][elementName])
                            {
                                elementLookupCache.set(elementName, modules[key][elementName]);

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

                                    ["add", "onInit", "property", "get", "find", "children", "call"]
                                    .forEach(f => { el[f] = (...args) => proto[f].apply(el, args); });

                                    return el;
                                }
                            }
                        }

                        console.error("Element '" + elementName + "' is not defined in " + moduleLocation + ".");
                        return null;
                    }

                    function __dv__(a)
                    {
                        return (a !== undefined && a._sh_dynamic_value === true) ? a : { val: a };
                    }

                    exports.${name} = {
                        create: (__pRslv__) =>
                        {
                            ${parseElement(data, pos, true, requirements)}
                            root.get().init();
                            return high.routedElement(
                                root,
                                root.find(root.defaultContainer(), moduleLocation)
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
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, moduleLocation) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        `;

        if (isRoot)
        {
            code += `
                const root = elementLookup("${elementName}", __pRslv__);
                const self = root;
                
                ${rslv}

                self${parseElementBlock(data, pos, modules)};
                self.get();
            `;
        }
        else
        {
            code += `
                ((__pRslv__) =>
                {
                    const self = elementLookup("${elementName}", __pRslv__);

                    ${rslv}

                    self${parseElementBlock(data, pos, modules)};
                    return self;
                })(__rslv__)
            `;
        }

        expect(data, pos, "}");
        code += "\n";

        return code;
    }

    function parseElementBlock(data, pos, modules)
    {
        let code = "";
        while (pos.value < data.length)
        {
            skipWhitespace(data, pos, true, true);
            if (next(data, pos, "}"))
            {
                break;
            }
            else if (next(data, pos, "/*"))
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
            else if (next(data, pos, "template "))
            {
                code += "\n" + parseTemplate(data, pos, modules);
            }
            else if (next(data, pos, "container "))
            {
                code += "\n" + parseContainer(data, pos);
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
            code += "{ create: function (__pRslv__) { return function () { " + parseElement(data, pos, true, modules) + " return self; }; }(__rslv__) }";
        }
        else
        {
            throw "Syntax error in line " + lineOfPos(data, pos) + ": element expected.";
        }

        return code;
    }

    function parseCustomProperty(data, pos, modules)
    {
        expect(data, pos, "property");
        skipWhitespace(data, pos, true, true);
        let propName = readUntil(data, pos, ":\t\n\r\v ");
        skipWhitespace(data, pos, true, true);
        expect(data, pos, ":");
        skipWhitespace(data, pos, true, true);
        
        let code = ".use(self).property(\"" + propName + "\", ";

        if (next(data, pos, "{"))
        {
            code += "function () { " + parseJsBlock(data, pos, modules, [["self"]], chainResolver) + "}";
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
                    "  self.find(\"" + targetName + "\", moduleLocation).add(child);" +
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
            code += "{ create: function (__pRslv__) { return function () { " + parseElement(data, pos, true, modules) + " return root; }; }(__rslv__) }";
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

        let code = ".use(self)." + propName + "(";

        if (next(data, pos, "{"))
        {
            const codeBlock = parseJsBlock(data, pos, modules, [["self"]], chainResolver);
            //console.log("Code: " + codeBlock);
            code += "function () { " + codeBlock + " }";
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
                        "  item.get().init();" +
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
                code += "\"" + readString(data, pos) + "\"";
            }
            else
            {
                code += parseBindingExpression(data, pos, modules);
            }
        }

        if (propName === "id")
        {
            code += ", moduleLocation";
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
        
        function bindingResolver(parts, scopes)
        {
            //console.log("Resolving chain in binding expression: " + JSON.stringify(parts));
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
                // do not attempt to resolve first in chain
                let code = firstInChain;
                parts.shift();
                parts.forEach((p) =>
                {
                    const item = (p[0] !== "(" && p[0] !== "[") ? code + "." + p
                                                                : code + p;
    
                    code = "__dv__(" + item + ").val";                
                });
                //console.log("Resolving to: " + code + " (in scope)");
                return code;
            }
            else
            {
                let newAlias = "alias" + aliasCounter;
                ++aliasCounter;
                
                const splitResult = splitChain(parts);
                //aliasMap.set(newAlias, makeXRef(joinChain(splitResult[0], false)));
                aliasMap.set(newAlias, makeChainRef(splitResult[0]));

                let code = joinChain([newAlias + ".val"].concat(splitResult[1]), true);
                if (! code.endsWith(".val"))
                {
                    code += ".val";
                }

                return code;
            }   
        }

        //console.log("parseBindingExpression at " + pos.value + " " + data.substr(pos.value, 80));
        let code = parseJsExpression(data, pos, modules, [[]], bindingResolver);
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
            return "high.binding([" + depsList.join(",") + "], (" + argsList.join(",") + ") => { return " + code + "; })";

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
                    break;
                }
                else if (identifier === "else")
                {
                    code += identifier + " ";
                    skipWhitespace(data, pos, true, true);
                    code += parseJsStatement(data, pos, modules, scopes, resolver);
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
        let mayTerminate = true;

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
            else if (nextIsToken(data, pos, TOKEN_ARROW_FUNCTION))
            {
                // arrow function
                let params = [];
                code += parseJsParameters(data, pos, (p) => { params.push(p); });
                skipWhitespace(data, pos, true, true);
                code += expect(data, pos, "=>");
                skipWhitespace(data, pos, true, true);
                code += parseJsBlock(data, pos, modules, scopes.concat([params]), resolver);
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
                // object
                code += parseJsObject(data, pos, modules, scopes, resolver);
                mayTerminate = true;
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
                if (identifier === "async" || identifier === "new")
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
                /*
                if (identifier === "this" ||
                    modules.map(m => m.alias).indexOf(identifier) !== -1 ||
                    JS_GLOBALS.indexOf(identifier) !== -1 ||
                    inScope(scopes, identifier) ||
                    ! isFirst)
                {
                    // do not resolve
                    part += identifier;
                }
                else
                {
                    part += identifier;
                }
                */
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

        return resolver(parts, scopes);
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

    function chainResolver(parts, scopes)
    {
        //console.log("Resolving chain: " + JSON.stringify(parts));

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
            // do not attempt to resolve first in chain
            let code = firstInChain;
            parts.shift();
            parts.forEach((p) =>
            {
                const item = (p[0] !== "(" && p[0] !== "[") ? code + "." + p
                                                            : code + p;

                if (p !== "stopPropagation" && p !== "preventDefault")  // quite a hack
                {
                    code = "__dv__(" + item + ").val";
                }
                else
                {
                    code = item;
                }
            });
            //console.log("Resolving to: " + code + " (in scope)");
            return code;
        }
        else
        {
            // resolve
            let code = "__dv__(__rslv__(\"" + firstInChain + "\")).val";
    
            parts.shift();
            parts.forEach((p) =>
            {
                const item = (p[0] !== "(" && p[0] !== "[") ? code + "." + p
                                                            : code + p;
                
                code = "__dv__(" + item + ").val"; 
            });
            //console.log("Resolving to: " + code);
            return code;
        }
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

    /* Joins the elements of the given chain together with proper resolving.
     */
    function joinChain(parts, ignoreFirst)
    {
        let code = "";
        if (ignoreFirst)
        {
            code = parts[0];
        }
        else
        {
            code = parts[0] === "self" ? "self"
                                       : "__rslv__(\"" + parts[0] + "\")";
        }
        
        const escaped = parts.join(".").replace(/"/g, "'");
        parts.shift();
        parts.forEach((p, idx) =>
        {
            const item = (p[0] !== "(" && p[0] !== "[") ? code + "." + p
                                                        : code + p;

            /*
            if (idx === parts.length - 1)
            {
                code = "__dvLast__(" + item + ", \"binding ref " + escaped + "\")";    
            }
            else
            {
                code = "__dv__(" + item + ").val";
            }
            */
            code = "__dv__(" + item + ").val";
        });
        return code;
    }

    function makeChainRef(chain)
    {
        return "high.chainRef(root, " + JSON.stringify(chain) + ", __rslv__)";
    }

})();
