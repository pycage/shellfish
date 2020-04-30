"use strict";
            shRequire(["/mnt/c/Users/marti/OneDrive/Projekte/shellfish/lib/preload.js", "/mnt/c/Users/marti/OneDrive/Projekte/shellfish/lib/fengshui.js"], (preload_Internal, fengshui_Internal) =>
            {
                shRequire(["shellfish/ui", "shellfish/mid", "shellfish/high"],
                        (mod1293, mid, high) =>
                {
                    const modules = { mod1293: mod1293, mid: mid, high: high };

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

                        console.error("Element '" + elementName + "' is not defined in " + __filename + ".");
                        return null;
                    }

                    function __dv__(a)
                    {
                        return (a !== undefined && a._sh_dynamic_value === true) ? a : { val: a };
                    }

                    exports.TextEntry = {
                        create: (__pRslv__) =>
                        {
                            
                const root = elementLookup("Box", __pRslv__);
                const self = root;
                
                
            const __rslvCache__ = new Map();

            function __rslv__(name)
            {
                if (name === "self") return self;
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, __filename) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        

                self.objectLocation(__filename + ":" + 25)
.use(self).id("box", __filename)
.use(self).property("text",  "" )
.use(self).property("password",  false )
.use(self).property("pattern",  ".*" )
.use(self).width(high.binding([high.chainRef(root, ["theme","itemWidthLarge"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).height(high.binding([high.chainRef(root, ["theme","itemHeightSmall"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).color(high.binding([high.chainRef(root, ["theme","contentBackgroundColor"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).borderColor(high.binding([high.chainRef(root, ["theme","borderColor"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).borderWidth( 1 )
.use(self).borderRadius(high.binding([high.chainRef(root, ["theme","borderRadius"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).layout( "center-row" )
.use(self).add(
                ((__pRslv__) =>
                {
                    const self = elementLookup("Box", __pRslv__);

                    
            const __rslvCache__ = new Map();

            function __rslv__(name)
            {
                if (name === "self") return self;
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, __filename) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        

                    self.objectLocation(__filename + ":" + 40)
.use(self).id("flashBox", __filename)
.use(self).position( "free" )
.use(self).fillWidth( true )
.use(self).fillHeight( true )
.use(self).color( "red" )
.use(self).opacity( 0 );
                    return self;
                })(__rslv__)
            
)
.use(self).add(
                ((__pRslv__) =>
                {
                    const self = elementLookup("TextInput", __pRslv__);

                    
            const __rslvCache__ = new Map();

            function __rslv__(name)
            {
                if (name === "self") return self;
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, __filename) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        

                    self.objectLocation(__filename + ":" + 49)
.use(self).id("input", __filename)
.use(self).fillWidth( true )
.use(self).marginLeft(high.binding([high.chainRef(root, ["theme","paddingSmall"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).marginRight(high.binding([high.chainRef(root, ["theme","paddingSmall"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).fontSize(high.binding([high.chainRef(root, ["theme","fontSizeNormal"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).color(high.binding([high.chainRef(root, ["theme","primaryColor"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).text(high.binding([high.chainRef(root, ["box","text"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).password(high.binding([high.chainRef(root, ["box","password"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).pattern(high.binding([high.chainRef(root, ["box","pattern"], __rslv__)], (alias0) => { return  alias0.val ; }))
.use(self).canFocus( true )
.use(self).onTextChanged(function () { {  ((__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text !== undefined && (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text !== null && (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text._sh_dynamic_value === true ? (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text :
            (new (class Wrap
            {
                get val() { return (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text; }
                set val(v) { if ((__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text !== undefined && (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text !== null) (__rslv__("box") !== undefined && __rslv__("box") !== null && __rslv__("box")._sh_dynamic_value === true ? __rslv__("box") :
            (new (class Wrap
            {
                get val() { return __rslv__("box"); }
                set val(v) { if (__rslv__("box") !== undefined && __rslv__("box") !== null) __rslv__("box") = v; }
            })()).val.text = v; }
            })()).val = (__rslv__("text") !== undefined && __rslv__("text") !== null && __rslv__("text")._sh_dynamic_value === true ? __rslv__("text") :
            (new (class Wrap
            {
                get val() { return __rslv__("text"); }
                set val(v) { if (__rslv__("text") !== undefined && __rslv__("text") !== null) __rslv__("text") = v; }
            })()).val ; } })
.use(self).onReject(function () { {  (((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) !== undefined && ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) !== null && ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( )._sh_dynamic_value === true ? ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) :
            (new (class Wrap
            {
                get val() { return ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ); }
                set val(v) { if (((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) !== undefined && ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) !== null) ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start._sh_dynamic_value === true ? (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start; }
                set val(v) { if ((__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== undefined && (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start !== null) (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null && __rslv__("flashAnimation")._sh_dynamic_value === true ? __rslv__("flashAnimation") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashAnimation"); }
                set val(v) { if (__rslv__("flashAnimation") !== undefined && __rslv__("flashAnimation") !== null) __rslv__("flashAnimation") = v; }
            })()).val.start = v; }
            })()).val( ) = v; }
            })()).val ; } });
                    return self;
                })(__rslv__)
            
)
.use(self).add(
                ((__pRslv__) =>
                {
                    const self = elementLookup("NumberAnimation", __pRslv__);

                    
            const __rslvCache__ = new Map();

            function __rslv__(name)
            {
                if (name === "self") return self;
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, __filename) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        

                    self.objectLocation(__filename + ":" + 67)
.use(self).id("flashAnimation", __filename)
.use(self).from( 1 )
.use(self).to( 0 )
.use(self).duration( 300 )
.use(self).easing( "InOutQuad" )
.use(self).onNext(function () { {  ((__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity !== undefined && (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity !== null && (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity._sh_dynamic_value === true ? (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity :
            (new (class Wrap
            {
                get val() { return (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity; }
                set val(v) { if ((__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity !== undefined && (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity !== null) (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null && __rslv__("flashBox")._sh_dynamic_value === true ? __rslv__("flashBox") :
            (new (class Wrap
            {
                get val() { return __rslv__("flashBox"); }
                set val(v) { if (__rslv__("flashBox") !== undefined && __rslv__("flashBox") !== null) __rslv__("flashBox") = v; }
            })()).val.opacity = v; }
            })()).val = arguments[ 0 ] ; } });
                    return self;
                })(__rslv__)
            
)
.use(self).add(
                ((__pRslv__) =>
                {
                    const self = elementLookup("FocusIndicator", __pRslv__);

                    
            const __rslvCache__ = new Map();

            function __rslv__(name)
            {
                if (name === "self") return self;
                else if (name === "parent") return __pRslv__("self");

                if (! __rslvCache__.has(name) || __rslvCache__.get(name) === undefined)
                {
                    let result = self[name] ||
                                 self.find(name, __filename) ||
                                 __pRslv__(name) ||
                                 modules[name];
                    __rslvCache__.set(name, result);
                }

                return __rslvCache__.get(name);
            }
        

                    self.objectLocation(__filename + ":" + 79)
.use(self).visible(high.binding([high.chainRef(root, ["input","focus"], __rslv__)], (alias0) => { return  alias0.val ; }));
                    return self;
                })(__rslv__)
            
);
                self.get();
            

                            root.get().init();
                            return high.routedElement(
                                root,
                                root.find(root.defaultContainer(), __filename)
                            );
                        }
                    };
                }, fengshui_Internal.compile);
            });
        