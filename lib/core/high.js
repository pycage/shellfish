/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2020 Martin Grimme <martin.grimme@gmail.com>

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
 * **Module ID:** `shellfish/high`
 * 
 * This module provides the high-level Shellfish API.
 * 
 * The high-level API provides means for declarative programming.
 * 
 * @module high
 */

exports.__id = "shellfish/high";

shRequire(__dirname + "/mid.js", function (mid)
{
    let dvCounter = 0;
    let watchCount = 0;

    /**
     * Wraps the given object so that browser-internal interfaces remain
     * fulfilled and "this" is retained.
     * @private
     * 
     * @param {object} obj - The object to wrap.
     * @returns {object} The wrapped object.
     */
    function wrapObject(obj)
    {
        function allKeys(obj)
        {
            var keys = Object.getOwnPropertyNames(obj)
            .filter(n => n !== "constructor")
            var proto = Object.getPrototypeOf(obj);
            if (! proto.hasOwnProperty("hasOwnProperty"))
            {
                keys = keys.concat(allKeys(proto));
            }
            return keys;
        }

        // only wrap objects
        if (! obj || obj._sh_wrapped || typeof obj !== "object")
        {
            return obj;
        }

        var wrapped = { _sh_wrapped: true };
        
        allKeys(obj).forEach((prop) =>
        {
            if (wrapped[prop])
            {
                return;
            }

            if (typeof (obj[prop] === "function"))
            {
                Object.defineProperty(wrapped, prop, {
                    get: () => { return (...args) => obj[prop](...args); }
                });
            }
            else
            {
                Object.defineProperty(wrapped, prop, {
                    set: v => { obj[prop] = v; },
                    get: () => obj[prop]
                });
            }
        });

        /*
        allKeys(obj).forEach((prop) =>
        {
            if (wrapped[prop])
            {
                return;
            }

            let p = exports.dynamicValue();
            wrapped[prop] = p;
           
            if (typeof obj[prop] === "function")
            {
                p.getter = () => { return (...args) => obj[prop](...args); };
            }
            else
            {
                p.setter = (v) => { obj[prop] = v; };
                p.getter = () => obj[prop];
            }
        });
        */

        return wrapped;
    }

    exports.isDynamicValue = function (v)
    {
        return v !== null && v !== undefined && v._sh_dynamic_value === true;
    }


    let d = new WeakMap();

    const propertiesCache = new Map();

    function allKeys(obj)
    {
        var keys = Object.getOwnPropertyNames(obj)
        .filter(n => n !== "constructor")
        var proto = Object.getPrototypeOf(obj);
        if (! proto.hasOwnProperty("hasOwnProperty"))
        {
            keys = keys.concat(allKeys(proto));
        }
        return keys;
    }

    /**
     * Class representing a high-level element wrapping a mid-level element.
     * 
     * This class is not exported. Use the function {@link high.element} to
     * create an element.
     * 
     * The properties of the underlying mid-level element are exposed as
     * dynamic values.
     * 
     * @memberof high
     */
    class Element
    {
        /**
         * @constructor
         * @param {function} type - The mid-level object type to wrap.
         */
        constructor(type)
        {
            this._sh_element = true;

            d.set(this, {
                element: null,
                children: [],
                id: { },
                changeWatchers: [],
                propertyWatchers: [],
                inits: []
            });
    

            // setup properties
            d.get(this).element = new type();
            //console.log("Creating element " + d.get(this).element.constructor.name);

            if (! propertiesCache.has(type))
            {
                //console.log("allKeys: " + JSON.stringify(allKeys(d.get(this).element)));
                propertiesCache.set(type, allKeys(d.get(this).element));
            }
            propertiesCache.get(type)
            .forEach((prop) => { this.bindProperty(prop); });

    
            d.get(this).element.onInitialization = () =>
            {
                const priv = d.get(this);
                //console.log("initializing: " + priv.element.constructor.name);
                priv.children.forEach((c) => { c.get().init(); });
    
                let inits = priv.inits.slice();
                priv.inits = [];
                while (inits.length > 0)
                {
                    let cb = inits.shift();
                    cb(this);
                }
            };
    
            d.get(this).element.onDestruction = () =>
            {
                //console.log("Discarding element " + (d.get(this).element.constructor.name) + " with " + d.get(this).children.length + " children");
                d.get(this).children.slice().forEach((c) => { c.get().discard(); });
                d.get(this).children = [];
    
                for (let key in d.get(this).propertyWatchers)
                {
                    d.get(this).propertyWatchers[key].unwatch();
                }
                d.get(this).propertyWatchers = { };
    
                d.get(this).changeWatchers.forEach((handle) =>
                {
                    handle.unwatch();
                });
                d.get(this).changeWatchers = [];
    
                d.get(this).element = null;
            };
        }

        /**
         * Returns the underlying mid-level element.
         * 
         * @returns {object} The mid-level element.
         */
        get()
        {
            return d.get(this).element;
        }

        /**
         * Sets or returns the ID of this element in the given namespace.
         * 
         * An element may be present in multiple namespaces with different IDs.
         * For example, the root element of a component could have another ID
         * within the component, than within the document where the component
         * is used.
         * 
         * @param {string} i - (optional) The element ID to set.
         * @param {string} [ns = ""] - (optional) The namespace to use.
         * 
         * @returns {object} This element for chaining.
         */
        id(i, ns)
        {
            ns = ns || "";
            if (i === undefined)
            {
                return d.get(this).id[ns] || "";
            }
            else
            {
                d.get(this).id[ns] = i;
                return this;
            }
        }

        /**
         * Adds a child element to this element.
         * 
         * @param {object} child - The child high-level element.
         * @returns {object} This element for chaining.
         */
        add(child)
        {
            let children = d.get(this).children;
            children.push(child);

            const el = d.get(this).element;
            if (el.add)
            {
                const childEl = child.get();
                el.add(childEl);
                childEl.onDestruction = () =>
                {
                    const pos = children.indexOf(child);
                    if (pos !== -1)
                    {
                        children.splice(pos, 1);
                    }
                };
            }
            else
            {
                console.error("Element '" + el.constructor.name + "' does not accept children.");
            }

            return this;
        }

        /**
         * Calls the given method on the underlying mid-level element.
         * The method's return value is waived.
         * 
         * @param {string} name - The name of the method to call.
         * @returns {object} This element for chaining.
         */
        call(name)
        {
            let args = [];
            for (let i = 1; i < arguments.length; ++i)
            {
                args.push(arguments[i]);
            }

            const el = d.get(this).element;
            el[name].apply(el, args);

            return this;
        }

        /**
         * Adds a custom property to the underlying mid-level element.
         * 
         * The new property is notifyable, and is transitionable if it is
         * a number.
         * 
         * @param {string} name - The name of the new property.
         * @param {any} value - The initial value.
         * 
         * @returns {object} This element for chaining.
         */
        property(name, value)
        {
            const priv = d.get(this);
            let prop = null;
            //console.log("add custom property " + name + " to " + d.get(this).element.constructor.name);
            priv.element.addProperty(name, () => prop, (v) => { prop = v; });

            let uname = name[0].toUpperCase() + name.substr(1);
            this.bindProperty(name);
            this.bindProperty(name + "Changed");
            this.bindProperty("on" + uname + "Changed");
            this[name](value);

            if (typeof value === "number")
            {
                priv.element.transitionable(name);
                this.bindProperty(name + "Transition");
            }

            return this;
        }

        /**
         * Uses the given element subsequently in a chain of commands.
         * 
         * @param {object} el - A high-level element.
         * @returns {object} The given element for chaining.
         */
        use(el)
        {
            return el;
        }

        /* Adds an init callback to this element.
         */
        onInit(cb)
        {
            d.get(this).inits.push(cb);
            return this;
        }

        /* Returns the nth child element of this element.
         * Negative values count from backwards.
         */
        child(n)
        {
            if (n >= 0)
            {
                return d.get(this).children[n];
            }
            else
            {
                return d.get(this).children[d.get(this).children.length + n];
            }
        }

        /* Returns a list of children of the given element type.
         * Returns all children if type is undefined.
         */
        children(type)
        {
            return d.get(this).children.filter((c) =>
            {
                return type === undefined || c.get(true) instanceof type;
            });
        }

        /**
         * Returns the child element with the given ID in the given namespace.
         * 
         * @param {string} id - The ID of the element to look for.
         * @param {string} ns - The namespace to search.
         * 
         * @returns {object} The element, or `undefined` if not found.
         */
        find(id, ns)
        {
            ns = ns || "";
            //console.log("find " + id + "(" + ns + ") under element with ID " + JSON.stringify(m_id));
            if (id === d.get(this).id[ns])
            {
                return this;
            }
            else
            {
                for (var i = 0; i < d.get(this).children.length; ++i)
                {
                    var obj = d.get(this).children[i].find(id, ns);
                    if (obj)
                    {
                        return obj;
                    }
                }
            }
            return undefined;
        }

        /* Returns the ancestry of the given element.
         */
        ancestry(el)
        {
            let ancestry = [this];

            if (this === el)
            {
                return [el];
            }
            else
            {
                for (var i = 0; i < d.get(this).children.length; ++i)
                {
                    const path = d.get(this).children[i].ancestry(el);
                    if (path.length > 0 && path[path.length - 1] === el)
                    {
                        return ancestry.concat(path);
                    }
                }
            }

            return ancestry;
        }

        setProperty(prop, value)
        {
            const priv = d.get(this);
            //console.log("setProperty " + priv.element.constructor.name + "." + prop + " = " + JSON.stringify(value));

            const unwrap = (v) =>
            {
                if (v === null || typeof v === "number" || typeof v === "string")
                {
                    return v;
                }
                else if (prop.endsWith("Transition") || prop === "model" || prop == "ruler")
                {
                    //console.log("for model or transition: " + prop);
                    //console.log(v);
                    priv.children.push(v);
                    return v.get();
                }
                else if (prop === "delegate")
                {
                    if (typeof v !== "function")
                    {
                        throw `${priv.element.constructor.name}.delegate is not valid.`;
                    }
                    return (modelData) =>
                    {
                        let item = v(modelData);
                        return item.get(true);
                    };
                }
                else
                {
                    return v;
                }
            }

            if (priv.propertyWatchers.hasOwnProperty(prop))
            {
                //console.log("unwatch " + priv.element.constructor.name + "." + prop);
                priv.propertyWatchers[prop].unwatch();
            }

            if (typeof value === "function" && value._sh_dynamic_value)
            {
                //console.log("is a DV");

                // watch binding for value changes to apply
                const handle = value.watch((v) => { priv.element.change(prop, unwrap(v)); });
                priv.propertyWatchers[prop] = handle;
                if (unwrap(value.val) !== undefined)
                {
                    priv.element[prop] = unwrap(value.val);
                }
            }
            else if (typeof value === "function")
            {
                //console.log("is a function");
                priv.element[prop] = function () { return unwrap(value).apply(priv.element, arguments); };
            }
            else
            {
                //console.log("is a value");
                priv.element.change(prop, unwrap(value));
            }
            return this;
        }
    
        getProperty(prop)
        {
            const priv = d.get(this);
            const obj = priv.element[prop];
            const objType = typeof obj;

            //console.log("getProperty " + priv.element.constructor.name + "." + prop);
            if (objType === "function")
            {
                return function () { return obj.apply(priv.element, arguments); };
            }
            /* not needed anymore, I hope
            else if (objType === "object" && obj && ! obj._sh_element)
            {
                return wrapObject(obj);
            }
            */
            else
            {
                return obj;
            }
        }

        bindProperty(prop)
        {
            if (prop.startsWith("on") && prop.endsWith("Changed"))
            {
                return;
            }
            //console.log("binding property: " + d.get(this).element.constructor.name + "." + prop);

            const priv = d.get(this);

            // build property setter and getter function
            let p = exports.dynamicValue();
            p.setter = (v) => { return this.setProperty(prop, v); };
            p.getter = () => { return this.getProperty(prop); };
            
            // connect to changed event, if available
            let uprop = prop[0].toUpperCase() + prop.substr(1);
            if (priv.element["on" + uprop + "Changed"] !== undefined)
            {
                //console.log("is notifyable");
                priv.element["on" + uprop + "Changed"] = () =>
                {
                    p.update();
                };
                
                this["on" + uprop + "Changed"] = (cb) =>
                {
                    const handle = p.watch(() =>
                    {
                        cb.apply(this, [p]);
                    });
                    priv.changeWatchers.push(handle);
                    return this;
                };
            }

            if (this[prop] === undefined)
            {
                this[prop] = p;
            }
            else
            {
                this[prop + "_"] = p;
            }
        }
    }

    
    /** 
     * Creates and returns a high-level element wrapping the given mid-level
     * type.
     * 
     * #### Example:
     * 
     *     const e = high.element(mid.Box);
     * 
     * Element trees are constructed and parameterized by chaining commands,
     * like this:
     * 
     *     const tree = high.element(mid.Box).id("theBox")
     *                  .color("black")
     *                  .add(
     *                      high.element(mid.MouseBox)
     *                      .fillWidth(true)
     *                      .fillHeight(true)
     *                      .marginLeft(12)
     *                      .marginRight(12)
     *                      .click((ev) =>
     *                      {
     *                          console.log("clicked the box");
     *                      });
     *                  );
     * 
     * @param {function} type - The element constructor.
     * @returns {Element} The high-level element.
     */
    exports.element = function (type)
    {
        return new Element(type);
    };
    
    /**
     * Creates a routed element from the given element.
     * Children added to the routed element are added to the specified
     * element instead.
     * 
     * @param {Element} el - The element that is routed.
     * @param {Element} routeTo - The element that is routed to.
     * @returns {object} The routed element.
     */
    exports.routedElement = function (el, routeTo)
    {
        if (routeTo)
        {
            const proxy = Object.create(el);
            proxy.add = function (child)
            {
                routeTo.add(child);
                return this;
            };
            proxy.children = function (t)
            {
                return routeTo.children(t);
            };
            proxy.id = function (i, ns)
            {
                return el.id(i, ns);
            };
            /*
            proxy.find = function (id, ns)
            {
                return routeTo.find(id, ns);
            };
            */
            return proxy;
        }
        else
        {
            return el;
        }
    };

    /**
     * Creates and returns a dynamic value.
     * 
     * A dynamic value can be watched for value changes.
     * 
     * @param {any} value - The initial value.
     * @return {object} The dynamic value.
     */
    exports.dynamicValue = function (value)
    {
        ++dvCounter;
        //if (dvCounter % 1000 === 0) console.log("DV #" + dvCounter + ", watched: " + watchCount);

        /**
         * This constructor is not exported. Use {@link high.dynamicValue} to
         * create a dynamic value.
         * 
         * A dynamic value may be called like a function and acts as a combined
         * getter/setter function this way. Passing a value to the function
         * sets the value, while passing no value returns the current value.
         * 
         * #### Example:
         * 
         *     const dynVal = high.dynamicValue(42);
         *     console.log(dynVal());  // prints 42
         *     dynVal(25);             // changes the value to 25 and notifies all watchers.
         *     console.log(dynVal());  // prints 25
         * 
         * The stored value may also be accessed via the `val` property.
         * 
         * #### Example:
         * 
         *     const dynVal = high.dynamicValue(42);
         *     console.log(dynVal.val);  // prints 42
         *     dynVal.val = 25;          // changes the value to 25 and notifies all watchers.
         *     console.log(dynVal.val);  // prints 25
         * 
         * @name DynamicValue
         * @memberof high
         * @param {any} v - The initial value. 
         * 
         * @property {function} setter - The overridable setter function.
         * @property {function} getter - The overridable getter function.
         * @property {any} val - Gives access to the stored value.
          */
        let f = function (v)
        {
            if (v !== undefined)
            {
                const r = f.setter(v);
                //f.update();
                return r;
            }
            else
            {
                return f.getter();
            }
        };

        let storedValue = value;

        f.setter = function (v)
        {
            storedValue = v;
        };

        f.getter = function ()
        {
            return storedValue;
        };

        let idCounter = 0;
        let watchers = { };
        let onUnwatched = null;

        /**
         * Registers a callback for watching this dynamic value for changes
         * and returns the watch handle.
         * 
         * The callback takes the new stored value as parameter.
         * 
         * The watch handle has a method `unwatch` to stop watching the value
         * for changes.
         * 
         * @memberof high.DynamicValue
         * @parameter {function} watchCallback - The callback to invoke on changes.
         * @returns {object} The watch handle.
         */
        f.watch = function (watchCallback)
        {
            let watchId = idCounter;
            ++idCounter;
            ++watchCount;
            watchers[watchId] = watchCallback;
            return {
                unwatch: function ()
                {
                    --watchCount;
                    delete watchers[watchId];
                    if (Object.keys(watchers).length === 0 && onUnwatched)
                    {
                        onUnwatched();
                    }
                }
            }
        };

        /**
         * Notifies all watchers of this dynamic value about a value change.
         * 
         * @memberof high.DynamicValue
         */
        f.update = function ()
        {
            for (let watchId in watchers)
            {
                try
                {
                    watchers[watchId](f.getter());
                }
                catch (err)
                {
                    console.error("DynamicValue error: " + err);
                }
            }
        };

        /**
         * Registers a callback for when the last watcher was removed, meaning
         * that this dynamic value is now completely unwatched.
         * 
         * @memberof high.DynamicValue
         * @param {function} callback - The callback to invoke.
         */
        f.unwatched = function (callback)
        {
            onUnwatched = callback;
        }

        Object.defineProperty(f, "val", {
            get: function () { return f.getter(); },
            set: function(v) { if (v !== f.getter()) { f.setter(v); /*f.update();*/ } }
        });

        f._sh_dynamic_value = true;
        f._sh_annotation = "";

        return f;
    };
    
    /**
     * Creates and returns a dynamic value that evaluates whenever one of its
     * dependency dynamic values changes.
     * 
     * The callback takes the watched dynamic values as parameters and acts as
     * the value getter of the binding.
     * 
     * #### Example:
     * 
     *     const b = high.binding([a, b], (a, b) =>
     *     {
     *         return a.val * b.val;
     *     });
     * 
     * @param {DynamicValue[]} deps - The list of dependencies.
     * @param {function} callback - The evaluation callback to invoke.
     * @param {string} [annotation = ""] - A user-defined annotation string that may help for debugging. 
     */
    exports.binding = function (deps, callback, annotation)
    {
        let handles = [];
        
        function setup(b, newDeps)
        {
            // stop watching old deps
            handles.forEach(function (h)
            {
                h.unwatch();
            });
            handles = [];

            // watch new deps
            newDeps.forEach(function (dep)
            {
                let handle = dep.watch(function (v)
                {
                    // update binding if dependency updates
                    if (v !== undefined)
                    {
                        //console.log("Evaluating: " + b._sh_annotation);
                        //console.log("- triggered by: " + dep._sh_annotation + " = " + dep.val);
                        //console.log("-> " + b.val);
                        b.update();
                    }
                });
                handles.push(handle);
            });
        }

        let b = exports.dynamicValue(undefined);
        b._sh_annotation = annotation || "";
        b.getter = function ()
        {
            try
            {
                return callback(...deps);
            }
            catch (err)
            {
                console.error(`Could not evaluate binding: ${b._sh_annotation}\n${deps.map(d => "- " + d._sh_annotation + " = " + d.val).join("\n")}`);
                return undefined;
            }
        };
        b.unwatched(function ()
        {
            //console.log("binding unwatched: " + callback);
            handles.forEach(function (h)
            {
                h.unwatch();
            });
        });
        
        setup(b, deps);
        return b;
    };
    
    /*
    function xref(root, retriever)
    {
        const targetValue = retriever();
        if (targetValue && targetValue._sh_dynamic_value)
        {
            console.log("dv ready: " + retriever);
            return targetValue;
        }
        else
        {
            let b = exports.dynamicValue(undefined);
    
            function onInit()
            {
                const targetValue = retriever();
                if (targetValue && targetValue._sh_dynamic_value)
                {
                    b.val = targetValue.val;
                    targetValue.watch(function ()
                    {
                        b.val = targetValue.val;
                    });
                }
                else if (targetValue)
                {
                    b.getter = () => { return targetValue; };
                    b.update();
                }
                else
                {
                    // try again after embedded as a component
                    root.onInit(onInit);
                }
            }
            root.onInit(onInit);
    
            return b;
        }
    }
    exports.xref = xref;
    */

    const refCache = new WeakMap();

    /**
     * Creates and returns a dynamic value that references an element's
     * property. The element does not have to exist yet at the time of calling
     * this function.
     * 
     * If the referenced parameter cannot be resolved immediately, resolving is
     * retried later when the specified `root` element gets initialized.
     * 
     * The `chain` parameter consists of a list of identifiers that address a
     * property. For example, to address the property `width` of an element
     * with ID `theBox`, the chain would be `["theBox", "width"]`.
     * 
     * The `resolver` function takes an element ID string as parameter and
     * returns the corresponding high-level element, or `undefined` if it could
     * not be resolved yet (because the element has not yet been created).
     * 
     * A simple resolver might look like
     * 
     *     (id) => root.find(id);
     * 
     * @param {Element} root - The root element.
     * @param {string[]} chain - The chain that makes up the reference.
     * @param {function} resolver - A resolver function.
     */
    exports.chainRef = function (root, chain, resolver)
    {
        //console.log("Chain: " + JSON.stringify(chain));
        const targetObj = resolver(chain[0]);
        if (targetObj && refCache.has(targetObj) && refCache.get(targetObj)[chain])
        {
            //console.log("From chain cache: " + JSON.stringify(chain));
            return refCache.get(targetObj)[chain];
        }

        let handles = [];
        let b = exports.dynamicValue(undefined);
        b._sh_annotation = chain.join(".");

        function resolveChain(obj, chain)
        {
            let ch = chain.slice();
            if (obj === null)
            {
                obj = resolver(ch.shift());
            }
            ch.forEach(function (c)
            {
                const v = (obj && obj._sh_dynamic_value) ? obj.val
                                                         : obj;

                const next = (v !== undefined && v !== null) ? v[c]
                                                             : undefined;
                if (typeof next === "function" && ! next._sh_dynamic_value)
                {
                    // wrap to retain "this"
                    obj = (...args) => v[c](...args);
                }
                else
                {
                    obj = next;
                }
            });

            return obj;
        }

        function setup()
        {
            // stop watching old DVs first
            handles.forEach(function (h)
            {
                h.unwatch();
            });
            handles = [];

            //console.log("init: " + JSON.stringify(chain));
            let obj = null;
            let targetObj = null;
            let dvs = [];
            chain.forEach(function (c, i)
            {
                obj = resolveChain(obj, [c]);
                if (i === 0 && obj)
                {
                    targetObj = obj;
                }
                if (obj && obj._sh_dynamic_value)
                {
                    dvs.push(obj);
                }
            });

            if (targetObj)
            {
                if (! refCache.has(targetObj))
                {
                    refCache.set(targetObj, { });
                }
                refCache.get(targetObj)[chain] = b;
            }
    
            //console.log(chain + " -> " + JSON.stringify(obj));
            if (obj === undefined)
            {
                for (let i = 0; i < dvs.length; ++i)
                {
                    const handle = dvs[i].watch(function ()
                    {
                        //console.log("Re-evaluating reference: " + chain);
                        setup();
                    });
                    handles.push(handle);
                }

                // try again after embedded as a component
                //console.log("retry again later: " + JSON.stringify(chain));
                root.onInit(setup);
            }
            else if (dvs.length > 0)
            {
                //console.log("success: " + JSON.stringify(chain));

                for (let i = 0; i < dvs.length - 1; ++i)
                {
                    const handle = dvs[i].watch(function ()
                    {
                        //console.log("Re-evaluating reference: " + chain);
                        setup();
                    });
                    handles.push(handle);
                }

                const dv = dvs[dvs.length - 1];

                const handle = dv.watch(function ()
                {
                    b.update();
                });
                handles.push(handle);
                
                const items = chain.slice();
                if (obj._sh_dynamic_value)
                {
                    b.getter = function () { return obj.val; }
                }
                else
                {
                    //console.log("not a DV: " + JSON.stringify(chain));
                    b.getter = function () { return resolveChain(null, items); }
                }
                b.update();
            }
            else
            {
                // static
                //console.log("static: " + JSON.stringify(chain));
                b.getter = function () { return obj; };
                b.update();
            }    
        }

        setup();

        b.unwatched(function ()
        {
            handles.forEach(function (h)
            {
                h.unwatch();
            });
            handles = [];
        });

        return b;
    };
});
