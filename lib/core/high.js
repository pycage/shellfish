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

    // maps an element to its high-level counterpart
    const elementRegistry = new Map();


    exports.isDynamicValue = function (v)
    {
        return v !== null && v !== undefined && v._sh_dynamic_value === true;
    }


    let d = new WeakMap();

    const propertiesCache = new Map();

    function allKeys(obj)
    {
        let keys = Object.getOwnPropertyNames(obj)
        .filter(n => n !== "constructor");
        const proto = Object.getPrototypeOf(obj);
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
                id: { },
                changeWatchers: [],
                propertyWatchers: [],
                customProperties: [],
                flushingCallbacks: []
            });
    

            // setup properties
            d.get(this).element = new type();
            elementRegistry.set(d.get(this).element, this);
            //console.log("Creating element " + d.get(this).element.constructor.name);

            if (! propertiesCache.has(type))
            {
                //console.log("allKeys: " + JSON.stringify(allKeys(d.get(this).element)));
                propertiesCache.set(type, allKeys(d.get(this).element));
            }
            propertiesCache.get(type)
            .forEach((prop) => { this.bindProperty(prop); });

            // each high-level element has a "profiles" property
            this.property("profiles", []);
    
            d.get(this).element.onInitialization = () =>
            {
                this.flushPending();
            };
    
            d.get(this).element.onDestruction = () =>
            {
                //console.log("Destroying high-level element: " +
                //            d.get(this).element.constructor.name +
                //            "(" + d.get(this).element.objectLocation + ")");

                for (let key in d.get(this).propertyWatchers)
                {
                    //console.log("property watcher unwatched on " + d.get(this).element.constructor.name);
                    d.get(this).propertyWatchers[key].unwatch();
                }
    
                d.get(this).changeWatchers.forEach(handle =>
                {
                    //console.log("change watcher unwatched on " + d.get(this).element.constructor.name);
                    handle.unwatch();
                });
    
                elementRegistry.delete(d.get(this).element);
                //console.log(`Discarded high-level element: ${d.get(this).element.constructor.name} (${d.get(this).element.objectLocation}), ${elementRegistry.size} elements remaining`);
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
            d.get(this).element.add(child.get());
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
            let prop = undefined;
            //console.log("add custom property " + name + " to " + d.get(this).element.constructor.name);
            priv.element.addProperty(name, () => prop, (v) => { prop = v; });

            let uname = name[0].toUpperCase() + name.substr(1);
            this.bindProperty(name);
            this.bindProperty(name + "Changed");
            this[name](value);

            if (typeof value === "number")
            {
                priv.element.transitionable(name);
                this.bindProperty(name + "Transition");
            }

            if (name === "profiles")
            {
                priv.element.onProfilesChanged = () =>
                {
                    priv.element.profiles.forEach(obj =>
                    {
                        d.get(obj).customProperties
                        .filter(p => p != "profiles")
                        .forEach(profileProp =>
                        {
                            // ok, this is tricky:
                            // assign the DV (not the actual value!) of the
                            // profile's property to this object's property
                            this[profileProp](obj[profileProp]);
                            //console.log("from profile: " + profileProp + " = " + this[profileProp].val);
                        });
                    });
                }
            }

            priv.customProperties.push(name);

            return this;
        }

        /**
         * Adds a custom event to the underlying mid-level element.
         * 
         * @param {string} name - The name of the new event.
         * 
         * @returns {object} This element for chaining.
         */
        event(name)
        {
            const uname = name[0].toUpperCase() + name.substr(1);
            const onEvent = "on" + uname;

            const priv = d.get(this);
            priv.element.registerEvent(name);
            this.bindProperty(name);
            this.bindProperty(onEvent);
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

        /*
        connect(el, event)
        {
            if (el._sh_dynamic_value)
            {
                el = el();
            }
            return (f) =>
            {
                el.get().connect(event, this.get(), f);
                return this;
            };
        }
        */

        /**
         * Returns a cross connector to another element's event.
         * 
         * @param {function} getEl - A function returning the target high-level element.
         * @param {string} event - The name of the event.
         * @returns {function} The connector.
         */
        crossConnect(getEl, event)
        {
            const setup = f =>
            {
                let el = getEl();
                if (!! el && el._sh_dynamic_value)
                {
                    el = el();
                }
                if (!! el)
                {
                    el.get().connect(event, this.get(), f);
                }
                else
                {
                    this.addPendingCallback(() => setup(f));
                }
            };

            return f =>
            {
                this.addPendingCallback(() => setup(f));
                return this;
            };
        }

        /* Adds a pending callback to this element that will be triggered
         * when the pending callbacks get flushed.
         *
         * Elements may be flushed several times and there are two internal
         * flushing points: (1) after the element's hierarchy with child elements
         * got created, and (2) at initialization.
         */
        addPendingCallback(cb)
        {
            d.get(this).flushingCallbacks.push(cb);
            return this;
        }

        /**
         * Flushes pending callbacks and executes them.
         */
        flushPending()
        {
            const cbs = d.get(this).flushingCallbacks;
            d.get(this).flushingCallbacks = [];

            cbs.forEach(cb =>
            {
                cb();
            });
        }

        /* Returns the nth child element of this element.
         * Negative values count from backwards.
         */
        child(n)
        {
            const cs = this.children();
            if (n >= 0)
            {
                return cs[n];
            }
            else
            {
                return cs[cs.length + n];
            }
        }

        /* Returns a list of children of the given element type.
         * Returns all children if type is undefined.
         */
        children(type)
        {
            return d.get(this).element.children
            .filter(c => elementRegistry.has(c))
            .filter(c => type === undefined || c instanceof type )
            .map(c => elementRegistry.get(c));
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
            //console.log("find " + id + "(" + ns + ") under element with ID " + JSON.stringify(d.get(this).id));
            if (id === d.get(this).id[ns])
            {
                return this;
            }
            else
            {
                const cs = this.children();
                for (var i = 0; i < cs.length; ++i)
                {
                    var obj = cs[i].find(id, ns);
                    if (obj)
                    {
                        return obj;
                    }
                }
            }
            return undefined;
        }

        setProperty(prop, value)
        {
            const priv = d.get(this);
            //console.log("setProperty " + priv.element.constructor.name + "." + prop + " = " + value);

            const unwrap = (v) =>
            {
                if (v === null || typeof v === "number" || typeof v === "string")
                {
                    return v;
                }
                else if (v instanceof Element)
                //else if (prop.endsWith("Transition") || prop === "model" || prop == "ruler")
                {
                    //console.log("for model or transition: " + prop);
                    //console.log(v);
                    return v.get();
                }
                else if (prop === "delegate")
                {
                    if (typeof v !== "function")
                    {
                        throw `${priv.element.constructor.name}.delegate is not valid (${priv.element.objectLocation}).`;
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
                //console.log("property watcher unwatched on " + d.get(this).element.constructor.name);
                priv.propertyWatchers[prop].unwatch();
            }

            if (exports.isDynamicValue(value))
            {
                //console.log("is a DV");

                // watch binding for value changes to apply
                const handle = value.watch((v) =>
                {
                    const uv = unwrap(v);
                    if (uv !== undefined)
                    {
                        priv.element.change(prop, uv);
                    }
                });
                priv.propertyWatchers[prop] = handle;
                if (value.val !== undefined)
                {
                    priv.element[prop] = unwrap(value.val);
                }
            }
            else if (typeof value === "function")
            {
                //console.log("is a function");
                priv.element[prop] = function () { return unwrap(value).apply(priv.element, arguments); };
            }
            else if (value instanceof Element)
            {
                priv.element[prop] = unwrap(value);
            }
            else
            {
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
            else if (obj && obj instanceof mid.Object)
            {
                // if the mid-level element has a high-level wrapper, return
                // the high-level wrapper instead
                return elementRegistry.has(obj) ? elementRegistry.get(obj) : obj;
            }
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

            // the cached value allows for quick access to the property's value
            // without having to re-evaluate it
            let cachedValue = undefined;

            // build property setter and getter function
            let p = exports.dynamicValue();
            p._sh_annotation = priv.element.objectType + "@" + priv.element.objectLocation + "." + prop;
            p.setter = (v) => { return this.setProperty(prop, v); };
            p.getter = () => { return cachedValue || this.getProperty(prop); };
            
            // connect to changed event, if available
            let uprop = prop[0].toUpperCase() + prop.substr(1);
            if (priv.element["on" + uprop + "Changed"] !== undefined)
            {
                //console.log("is notifyable");
                priv.element["on" + uprop + "Changed"] = () =>
                {
                    cachedValue = this.getProperty(prop);
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
            
            // they share the same private object
            d.set(proxy, d.get(el));

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
                return r;
            }
            else
            {
                return f.getter();
            }
        };

        let storedValue = value;

        // the cached value avoids updates when nothing has changed
        let cachedValue = undefined;

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
            const v = f.getter();
            if (f._sh_really_undefined || typeof v === "object" || v !== cachedValue)
            {
                cachedValue = v;
                for (let watchId in watchers)
                {
                    try
                    {
                        watchers[watchId](v);
                    }
                    catch (err)
                    {
                        console.error(`[${mid.dbgctx}] DynamicValue.update (${f._sh_annotation}): ${err}`);
                    }
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
            cachedValue = undefined;
        }

        Object.defineProperty(f, "val", {
            get: function () { return f.getter(); },
            set: function(v) { if (v !== f.getter()) { f.setter(v); } }
        });

        f._sh_dynamic_value = true;
        f._sh_really_undefined = false;
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
                    //console.log("Evaluating: " + b._sh_annotation);
                    //console.log("- triggered by: " + dep._sh_annotation + " = " + dep.val);
                    //console.log("-> " + b.val);
                    b.update();
                });
                handles.push(handle);
            });
        }

        let b = exports.dynamicValue(undefined);
        b._sh_annotation = annotation || "";
        b.getter = function ()
        {
            // as long as not all dependencies have been resolved, the binding is undefined
            if (deps.filter(d => d.val === undefined && ! d._sh_really_undefined).length !== 0)
            {
                return undefined;
            }

            try
            {
                return callback(...deps);
            }
            catch (err)
            {
                console.error(`[${mid.dbgctx}] Could not evaluate binding: ${b._sh_annotation}\n${deps.map(d => "- " + d._sh_annotation + " = " + d.val).join("\n")}`);
                return undefined;
            }
        };
        b.unwatched(function ()
        {
            //console.log("binding unwatched: " + annotation);
            handles.forEach(function (h)
            {
                h.unwatch();
            });
        });
        
        setup(b, deps);
        return b;
    };
    

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
        //console.log("Chain: " + JSON.stringify(chain) + " with root " + root.objectType() + "@" + root.objectLocation());

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
                /*
                if (i === 0 && obj)
                {
                    targetObj = obj;
                }
                */
                if (obj && obj._sh_dynamic_value)
                {
                    dvs.push(obj);
                }
            });

            /*
            if (targetObj)
            {
                if (! refCache.has(targetObj))
                {
                    refCache.set(targetObj, { });
                }
                refCache.get(targetObj)[chain] = b;
            }
            */
    
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
                if (root.lifeCycleStatus() === "new")
                {
                    root.addPendingCallback(setup);
                }
                else
                {
                    // this value won't change anymore
                    /*
                    if (b._sh_annotation !== "")
                    {
                        console.log("The reference " + b._sh_annotation + " remains undefined");
                    }
                    */
                    b._sh_really_undefined = true;
                    b.update();
                }
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

        root.addPendingCallback(setup);

        b.unwatched(function ()
        {
            //console.log("ref unwatched: " + JSON.stringify(chain));
            handles.forEach(function (h)
            {
                h.unwatch();
            });
            handles = [];
        });

        return b;
    };
});
