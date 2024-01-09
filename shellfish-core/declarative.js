/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2024 Martin Grimme <martin.grimme@gmail.com>

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
 * **Module ID:** `shellfish/declarative`
 * 
 * This module provides a high-level API with tools for declarative programming
 * in JavaScript.
 * 
 * It is used extensively by the code created by {@link fengshui Feng Shui}
 * and is rarely used directly. So unless you are sure that you absolutely need 
 * to use this module, **you may safely ignore it.**
 * 
 * @example <caption>Import by module ID</caption>
 * shRequire("shellfish/declarative", declarative =>
 * {
 *     ...
 * });
 * 
 * @namespace declarative
 */

exports.__id = "shellfish/declarative";

shRequire(["shellfish/core", "shellfish/core/warehouse"], function (core, warehouse)
{
    let dvCounter = 0;
    let totalWatchCount = 0;

    // maps an element to its high-level counterpart
    const elementRegistry = new Map();

    // a warehouse for storing pre-created elements for quick delivery
    // (this occupies some RAM, so only do this where we can be sure it's safe)
    const elementWarehouse = shRequire.deviceMemory >= 4
                             ? new warehouse.Warehouse((type) => { return new Element(type); }, 25)
                             : null;

    /**
     * Returns if the given object is a dynamic value.
     * 
     * @memberof declarative
     * 
     * @param {object} v
     * @returns {bool} `true` if the object is a dynamic value.
     */
    function isDynamicValue(v)
    {
        return v instanceof DynamicValue;
    }
    exports.isDynamicValue = isDynamicValue;


    let d = new WeakMap();

    const propertiesCache = new Map();

    function allKeys(obj)
    {
        //console.log("allKeys of " + obj.constructor.name);
        let keys = Object.getOwnPropertyNames(obj)
        .filter(n => n !== "constructor");
        keys = keys.concat(obj.customProperties());
        //console.log(JSON.stringify(keys));
        const proto = Object.getPrototypeOf(obj);
        if (! proto.hasOwnProperty("customProperties"))
        {
            keys = keys.concat(allKeys(proto));
        }
        return keys;
    }

    /**
     * Class representing a high-level element wrapping a mid-level element in
     * a declarative fashion.
     * 
     * The properties of the underlying mid-level element are exposed as
     * {@link declarative.DynamicValue dynamic values}.
     * 
     * @memberof declarative
     */
    class Element
    {
        /**
         * This constructor is not exported. Use the function {@link declarative.element} to
         * create an element.
         * @constructor
         * @param {function} type - The constructor of the mid-level object type to wrap.
         */
        constructor(type)
        {
            this._sh_element = true;

            d.set(this, {
                element: null,
                id: { },
                elementType: { },
                changeWatchers: [],
                propertySupplyHandles: { },
                dormantProperties: { },
                customProperties: { },
                childrenCache: null,
                findCache: { }  // maps ID to child on path to element
            });


            // setup properties
            const el = new type();
            d.get(this).element = el;
            elementRegistry.set(el, this);
            //console.log("Created high " + el.constructor.name);

            if (! propertiesCache.has(type))
            {
                //console.log("allKeys: " + JSON.stringify(allKeys(el)));
                propertiesCache.set(type, allKeys(el));
            }
            propertiesCache.get(type)
            .forEach((prop) => { this.bindProperty(prop); });
            //console.log("Bound properties of high " + el.constructor.name + " (" + propertiesCache.get(type).length + " properties)");

            // each high-level element has a "profiles" property
            this.property("profiles", [], true);
            //console.log("Initialized profiles of high " + el.constructor.name + " after " + (Date.now() - now) + " ms");
    
            el.onChildrenChanged = () =>
            {
                d.get(this).childrenCache = null;
                d.get(this).findCache = { };
            };

            el.onTermination = () =>
            {
                //console.log("Destroying high-level element: " +
                //            el.constructor.name +
                //            "(" + el.objectLocation + ")");

                for (let key in d.get(this).propertySupplyHandles)
                {
                    //console.log("property watcher unwatched on " + el.constructor.name);
                    d.get(this).propertySupplyHandles[key].unwatch();
                }
                d.get(this).propertySupplyHandles = { };
    
                d.get(this).changeWatchers.forEach(handle =>
                {
                    //console.log("change watcher unwatched on " + el.constructor.name);
                    handle.unwatch();
                });
                d.get(this).changeWatchers = [];
    
                d.get(this).childrenCache = null;
                d.get(this).findCache = { };

                d.get(this).dormantProperties = { };
                d.get(this).customProperties = { };

                d.get(this).element = null;

                elementRegistry.delete(el);
                //console.log(`Discarded high-level element: ${el.constructor.name} (${el.objectLocation}), ${elementRegistry.size} elements remaining`);
            };
        }

        /**
         * Returns the underlying mid-level element.
         * 
         * @returns {core.Object} The mid-level element.
         */
        get()
        {
            return d.get(this).element;
        }

        /**
         * Sets or returns the ID of this element in the given namespace.
         * 
         * An element may be present in multiple namespaces by different IDs.
         * For example, the root element of a component could have another ID
         * within the component, than within the document where the component
         * is used.
         * 
         * @param {string} i - (optional) The element ID to set.
         * @param {string} [ns = ""] - (optional) The namespace to use.
         * 
         * @returns {declarative.Element} This element for chaining.
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

        elementType(type, ns)
        {
            ns = ns || "";

            if (type === undefined)
            {
                return d.get(this).elementType[ns] || "";
            }
            else
            {
                d.get(this).elementType[ns] = type;
                return this;
            }
        }

        /**
         * Adds a child element to this element.
         * 
         * @param {declarative.Element} child - The child declarative-level element.
         * @returns {declarative.Element} This element for chaining.
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
         * @returns {declarative.Element} This element for chaining.
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
         * The new property is notifyable. If it is a number, it is transitionable
         * as well.
         * 
         * @param {string} name - The name of the new property.
         * @param {any} value - The initial value.
         * 
         * @returns {declarative.Element} This element for chaining.
         */
        property(name, value, innate)
        {
            const priv = d.get(this);
            const el = priv.element;

            let prop = undefined;
            //console.log("add custom property " + name + " to " + d.get(this).element.constructor.name);
            el.addProperty(name, () => prop, (v) => { prop = v; }, innate);
            priv.customProperties[name] = true;
            
            this.bindProperty(name);
            this.setProperty(name, value);
            this.bindProperty(name + "Changed");
            //this[name](value);
            
            if (typeof value === "number")
            {
                el.transitionable(name);
                this.bindProperty(name + "Transition");
            }

            if (name === "profiles")
            {
                el.onProfilesChanged = () =>
                {
                    el.profiles.filter(obj => obj).forEach(obj =>
                    {
                        Object.keys(d.get(obj).customProperties)
                        .filter(p => p != "profiles")
                        .forEach(profileProp =>
                        {
                            // ok, this is tricky:
                            // assign the DV (not the actual value!) of the
                            // profile's property to this object's property
                            this[profileProp].val = obj[profileProp];
                            //console.log("from profile: " + profileProp + " = " + this[profileProp].val);
                        });
                    });
                };
            }

            return this;
        }

        /**
         * Adds a custom event to the underlying mid-level element.
         * 
         * @param {string} name - The name of the new event.
         * 
         * @returns {declarative.Element} This element for chaining.
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
         * @param {declarative.Element} el - A declarative-level element.
         * @returns {declarative.Element} The given element for chaining.
         */
        use(el)
        {
            return el;
        }

        /**
         * Sets the given property and returns this element for chaining.
         * 
         * @param {string} prop - The property name.
         * @param {any} value - The new value.
         * @returns {declarative.Element} This element for chaining.
         */
        set(prop, value)
        {
            const p = this[prop];
            if (p === undefined)
            {
                console.error("Object " + d.get(this).element.objectType + "@" +
                              d.get(this).element.objectLocation + " has no property '" + prop + "'.");
                return this;
            }

            if (prop.startsWith("on") && prop.endsWith("Changed"))
            {
                this[prop](value);
            }
            else
            {
                if (p instanceof DynamicValue)
                {
                    p.val = value;
                }
            }
            return this;
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
         * @param {function} getEl - A function returning the target declarative-level element.
         * @param {string} event - The name of the event.
         * @returns {function} The connector.
         */
        crossConnect(getEl, event)
        {
            const setup = f =>
            {
                let el = getEl();
                if (el instanceof DynamicValue)
                {
                    el = el.val;
                }
                if (!! el)
                {
                    el.get().connect(event, this.get(), f);
                }
                else
                {
                    if (this.lifeCycleStatus.val === "new")
                    {
                        this.get().onInitialization = () =>
                        {
                            setup(f);
                        };
                    }
                    else
                    {
                        console.error("Failed to establish cross-connection: " + this.objectLocation.val + " " + event);
                    }
                }
            };

            return f =>
            {
                setup(f);
                return this;
            };
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
            const priv = d.get(this);
            if (priv.childrenCache === null)
            {
                priv.childrenCache = d.get(this).element.children
                .filter(c => elementRegistry.has(c))
                .filter(c => type === undefined || c instanceof type )
                .map(c => elementRegistry.get(c));
            }
            return priv.childrenCache;
        }

        /**
         * Returns the child element with the given ID in the given namespace.
         * 
         * @param {string} id - The ID of the element to look for.
         * @param {string} ns - The namespace to search.
         * 
         * @returns {declarative.Element} The element, or `undefined` if not found.
         */
        find(id, ns)
        {
            const priv = d.get(this);

            ns = ns || "";
            //console.log("find " + id + "(" + ns + ") under element with ID " + JSON.stringify(priv.id));

            if (! priv.element)
            {
                return undefined;
            }
            else if (id === priv.id[ns])
            {
                return this;
            }
            else
            {
                const child = priv.findCache[id];
                if (child)
                {
                    const obj = child.find(id, ns);
                    if (obj)
                    {
                        return obj;
                    }
                }
                else
                {
                    const cs = this.children();
                    for (let i = 0; i < cs.length; ++i)
                    {
                        const obj = cs[i].find(id, ns);
                        if (obj)
                        {
                            priv.findCache[id] = cs[i];
                            return obj;
                        }
                    }
                }
            }
            return undefined;
        }

        setProperty(prop, value)
        {
            const priv = d.get(this);
            //console.log("setProperty " + priv.element.objectType + "@" + priv.element.objectLocation + "." + prop + " = " + value);

            const unwrap = (v) =>
            {
                if (v instanceof Element)
                {
                    return v.get();
                }
                else if (typeof v === "function")
                {
                    return (...args) =>
                    {
                        // if the function returns a declarative-level wrapper,
                        // return its mid-level element instead
                        const r = v.apply(priv.element, args);
                        return r instanceof Element ? r.get() : r;
                    };
                }
                else
                {
                    return v;
                }
            };

            const existingHandle = priv.propertySupplyHandles[prop];
            if (existingHandle)
            {
                existingHandle.unwatch();
            }

            if (value instanceof DynamicValue)
            {
                //console.log("is a DV");

                // watch binding for value changes to apply
                const handle = value.watch(() =>
                {
                    const uv = unwrap(value.val);
                    if (uv !== undefined)
                    {
                        priv.element.change(prop, uv);
                    }
                });

                priv.propertySupplyHandles[prop] = handle;

                const v = value.val;
                if (v !== undefined)
                {
                    // do not assign undefined
                    priv.element[prop] = unwrap(v);
                }

                if (priv.customProperties[prop] && priv.dormantProperties[prop])
                {
                    handle.setEnabled(false);
                }
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
            if (! priv.element)
            {
                // accessing a dead element
                //console.error(`[${core.dbgctx}] Accessing <destroyed element>.${prop}`);
                return undefined;
            }

            if (priv.dormantProperties[prop])
            {
                priv.dormantProperties[prop] = false;
                const handle = priv.propertySupplyHandles[prop];
                if (handle)
                {
                    handle.setEnabled(true);
                }
            }

            const obj = priv.element[prop];

            const objType = typeof obj;

            //console.log("getProperty " + priv.element.constructor.name + "." + prop + " " + objType + " " + priv.element.objectId);
            if (objType === "function")
            {
                return (...args) =>
                {
                    const r = obj.apply(priv.element, args);
                    if (r instanceof core.Object)
                    {
                        // if the mid-level element has a declarative-level wrapper,
                        // return the declarative-level wrapper instead
                        return elementRegistry.has(r) ? elementRegistry.get(r) : r;
                    }
                    else
                    {
                        return r;
                    }
                };
            }
            else if (obj && obj instanceof core.Object)
            {
                // if the mid-level element has a declarative-level wrapper, return
                // the declarative-level wrapper instead
                return elementRegistry.has(obj) ? elementRegistry.get(obj) : obj;
            }
            else if (obj && Array.isArray(obj))
            {
                // if the mid-level element has a declarative-level wrapper, return
                // the declarative-level wrapper instead
                let i = 0;
                for (i = 0; i < obj.length; ++i)
                {
                    if (obj[i] instanceof core.Object && elementRegistry.has(obj[i]))
                    {
                        obj[i] = elementRegistry.get(obj[i]);
                    }
                }
                return obj;
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
            const el = priv.element;

            let targetName = prop;
            if (this[targetName] !== undefined)
            {
                targetName = prop + "_";
            }

            const propType = el.typeOf(prop);
            //console.log("Type: " + el.objectType + "@" + el.objectLocation + "." + prop + " = " + propType);
            if (propType === "method")
            {
                // no need for a DV for methods
                this[targetName] = (...args) => el[prop].apply(el, args);
                return;
            }

            const isCustomProperty = priv.customProperties[prop];

            // build property setter and getter function
            //let p = exports.dynamicValue();
            let p = new DynamicValue();
            p._sh_annotation = el.objectType + "@" + el.objectLocation + "." + prop;
            p.setter = (v) => this.setProperty(prop, v);
            p.getter = () => this.getProperty(prop);
            p.maybeUndefined = () => false;
            
            // every newly bound property except for "profiles" starts as dormant
            if (prop !== "profiles")
            {
                priv.dormantProperties[prop] = true;
            }

            p.watched(() =>
            {
                // a watched property is no longer dormant
                priv.dormantProperties[prop] = false;

                if (isCustomProperty)
                {
                    const handle = priv.propertySupplyHandles[prop];
                    if (handle)
                    {
                        handle.setEnabled(true);
                    }
                }

            });
            p.unwatched(() =>
            {
                // an unwatched property becomes dormant
                priv.dormantProperties[prop] = true;

                if (isCustomProperty)
                {
                    // dormant custom properties are not interested in updates
                    const handle = priv.propertySupplyHandles[prop];
                    if (handle)
                    {
                        handle.setEnabled(false);
                    }
                }
            });

            // connect to changed event, if available
            let uprop = prop[0].toUpperCase() + prop.substr(1);
            if (el["on" + uprop + "Changed"] !== undefined)
            {
                //console.log("is notifyable");
                el["on" + uprop + "Changed"] = () =>
                {
                    // don't update if dormant
                    if (! priv.dormantProperties[prop])
                    {
                        p.update();
                    }
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

            this[targetName] = p;
        }
    }

    
    /** 
     * Creates and returns a declarative-level {@link declarative.Element element} wrapping
     * the given mid-level type.
     * 
     * @example
     * const e = declarative.element(html.Box);
     * 
     * @example <caption>Trees of elements may be created and parameterized by chaining commands</caption>
     * const tree = declarative.element(html.Box).id("theBox")
     *              .set("color", "black")
     *              .add(
     *                  declarative.element(html.MouseBox)
     *                  .set("fillWidth", true)
     *                  .set("fillHeight", true)
     *                  .set("marginLeft", 12)
     *                  .set("marginRight", 12)
     *                  .click((ev) =>
     *                  {
     *                      console.log("clicked the box");
     *                  });
     *              );
     * 
     * @memberof declarative
     * @param {function} type - The element constructor.
     * @returns {declarative.Element} The declarative-level element.
     */
    function element(type)
    {
        if (elementWarehouse &&
            (type.name === "Box" ||
             type.name === "MouseBox" ||
             type.name === "Label" ||
             type.name === "Object" ||
             type.name === "Ruler" ||
             type.name === "Timer"))
        {
            return elementWarehouse.retrieve(type);
        }
        else
        {
            return new Element(type);
        }
    }
    exports.element = element;
    
    /**
     * Creates a routed element from the given {@link declarative.Element element}.
     * Children added to the routed element are added to the specified
     * element instead.
     * 
     * @memberof declarative
     * @param {declarative.Element} el - The element that is routed.
     * @param {declarative.Element} routeTo - The element that is routed to.
     * @returns {declarative.Element} The routed element.
     */
    function routedElement(el, routeTo)
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
    }
    exports.routedElement = routedElement;


    /**
     * A dynamic value is a variable that may hold any value and watchers
     * can subscribe for monitoring changes.
     * 
     * The stored value is accessible via the `val` property.
     * 
     * @example
     * const dynVal = new declarative.DynamicValue(42);
     * console.log(dynVal.val);  // prints 42
     * dynVal.val = 25;          // changes the value to 25 and notifies all watchers.
     * console.log(dynVal.val);  // prints 25
     * 
     * @memberof declarative
     * 
     * @property {function} setter - The overridable setter function.
     * @property {function} getter - The overridable getter function.
     * @property {any} val - Gives access to the stored value.
     */
    class DynamicValue
    {
        /**
         * Creates a new dynamic value.
         * @constructor
         * 
         * @param {any} value - The initial value. 
         */
        constructor(value)
        {
            this._sh_really_undefined = false;
            this._sh_annotation = "";

            this.idCounter = 0;
            
            this.watchers = { };
            this.watchersEnabled = { };
            this.watchCount = 0;
            this.activeWatchCount = 0;
            
            this.onUnwatched = null;
            this.onWatched = null;
            
            this.storedValue = value;
            
            // the cached value avoids updates when nothing has changed, however,
            // we may only use the cache during an update phase
            this.cachedValue = undefined;
            this.mayUseCache = false;
            
            this.setter = (v) =>
            {
                this.storedValue = v;
            };
            this.getter = () =>
            {
                return this.storedValue;
            };
            this.maybeUndefined = () => true;
            
            ++dvCounter;
            //if (dvCounter % 1000 === 0) console.log("DV #" + dvCounter + ", watched: " + watchCount);
        }

        get val()
        {
            if (! this.mayUseCache)
            {
                return this.getter();
            }
            if (! this.cachedValue)
            {
                this.cachedValue = this.getter();
            }
            return this.cachedValue;
        }

        set val(v)
        {
            this.cachedValue = undefined;
            this.setter(v);
        }

        /**
         * Registers a callback for watching this dynamic value for changes
         * and returns a watch handle.
         * 
         * The watch handle has a method `unwatch` to stop watching the value
         * for changes.
         * 
         * @example <caption>Watch for changes</caption>
         * const dynVal = new declarative.DynamicValue(42);
         * dynVal.watch(v => console.log("The value changed to " + v.val);
         * ++(dynval.val);
         * dynVal.update();           // prints "The value changed to 43"
         * 
         * @param {function} watchCallback - The callback to invoke on changes.
         * @returns {declarative.DynamicValue.WatchHandle} The watch handle.
         */
        watch(watchCallback)
        {
            let watchId = this.idCounter;
            ++this.idCounter;
            ++totalWatchCount;
            ++this.watchCount;
            ++this.activeWatchCount;
            this.watchers[watchId] = watchCallback;
            this.watchersEnabled[watchId] = true;

            if (this.watchCount === 1 && this.onWatched)
            {
                this.onWatched();
            }

            /**
             * A dynamic value watch handle.
             * @typedef WatchHandle
             * @memberof declarative.DynamicValue
             * @property {function} setEnabled - Enables or disables this watcher.
             * @property {function} unwatch - Stops watching the dynamic value.
             * @property {function} value - Returns the current value.
             */
            return {
                value: () => { return this.getter(); },
                setEnabled: (enabled) =>
                {
                    if (enabled !== this.watchersEnabled[watchId] && this.watchers[watchId])
                    {
                        this.watchersEnabled[watchId] = enabled;
                        this.activeWatchCount += enabled ? 1 : -1;

                        if (enabled && this.watchers[watchId])
                        {
                            // supply the watcher with the latest update
                            try
                            {
                                this.watchers[watchId]();
                            }
                            catch (err)
                            {
                                console.error(`[${core.dbgctx}] DynamicValue.update (${this._sh_annotation}): ${err}`);
                            }
                        }
                    }
                },
                unwatch: () =>
                {
                    --totalWatchCount;
                    --this.watchCount;
                    --this.activeWatchCount;
                    delete this.watchers[watchId];
                    if (this.watchCount === 0 && this.onUnwatched)
                    {
                        this.onUnwatched();
                    }
                }
            }
        }

        /**
         * Notifies all watchers of this dynamic value about a value change.
         * This method must be called explicitly after changing a value directly.
         */
        update()
        {
            // no active watchers, no evaluation
            if (this.activeWatchCount > 0)
            {
                this.cachedValue = undefined;
                this.mayUseCache = true;
                for (let watchId in this.watchers)
                {
                    if (! this.watchersEnabled[watchId])
                    {
                        continue;
                    }

                    try
                    {
                        this.watchers[watchId]();
                    }
                    catch (err)
                    {
                        console.error(`[${core.dbgctx}] DynamicValue.update (${this._sh_annotation}): ${err}`);
                    }
                }
                this.cachedValue = undefined;
                this.mayUseCache = false;
            }
        }

        /**
         * Registers a callback for when the last watcher was removed, meaning
         * that this dynamic value is now completely unwatched.
         * 
         * @param {function} callback - The callback to invoke.
         */
        unwatched(callback)
        {
            this.onUnwatched = callback;
            this.cachedValue = undefined;
        }

        /**
         * Registers a callback for when the first watcher was added, meaning
         * that this dynamic value is now being watched.
         * 
         * @name watched
         * @method
         * @memberof declarative.DynamicValue.prototype
         * @param {function} callback - The callback to invoke.
         */
        watched(callback)
        {
            this.onWatched = callback;
        }
    }
    exports.DynamicValue = DynamicValue;
    
    /**
     * Creates and returns a {@link declarative.DynamicValue dynamic value} acting as
     * a binding. This means that it is re-evaluated whenever one of its
     * dependency dynamic values changes.
     * 
     * The evaluation function takes the watched dynamic values as parameters
     * and acts as the value getter of the binding.
     * 
     * @example
     * const b = declarative.binding([a, b], (aValue, bValue) =>
     * {
     *     return aValue.val * bValue.val;
     * });
     * 
     * @memberof declarative
     * @param {declarative.DynamicValue[]} deps - The list of dependencies.
     * @param {function} evaluator - The evaluation function to invoke.
     * @param {string} [annotation = ""] - A user-defined annotation string that may help for debugging. 
     */
    function binding(deps, evaluator, annotation)
    {
        //console.log("Creating binding for " + annotation);

        let handles = [];
        
        function setup(b, newDeps)
        {
            // stop watching old deps
            handles.forEach(h =>
            {
                h.unwatch();
            });
            handles = [];

            // watch new deps
            newDeps.forEach(dep =>
            {
                const handle = dep.watch(() =>
                {
                    //console.log("Evaluating: " + b._sh_annotation + " -> " + b.val +
                    //            " (triggered by: " + dep._sh_annotation + " = " + dep.val + ")");
                    b.update();
                });
                handles.push(handle);
            });
        }

        //const b = exports.dynamicValue(undefined);
        const b = new DynamicValue(undefined);
        b._sh_annotation = "binding " + (annotation || "");
        b.getter = () =>
        {
            // as long as not all dependencies have been resolved, the binding is undefined
            if (deps.filter(d => d.maybeUndefined() && d.val === undefined && ! d._sh_really_undefined).length !== 0)
            {
                return undefined;
            }

            try
            {
                return evaluator(...deps);
            }
            catch (err)
            {
                console.error(`[${core.dbgctx}] Could not evaluate binding: ${b._sh_annotation}\n${deps.map(d => "- " + d._sh_annotation + " = " + d.val).join("\n")}\n${err}`);
                return undefined;
            }
        };
        b.maybeUndefined = () =>
        {
            for (let i = 0; i < deps.length; ++i)
            {
                if (deps[i].maybeUndefined())
                {
                    return true;
                }
            }
            return false;
        };
        b.unwatched(() =>
        {
            //console.log("binding unwatched: " + annotation);
            handles.forEach(function (h)
            {
                h.unwatch();
            });
            handles = [];

            b.getter = null;
        });
        
        setup(b, deps);
        return b;
    }
    exports.binding = binding;
    
    /**
     * Creates and returns a {@link declarative.DynamicValue dynamic value} that
     * references a property of an {@link declarative.Element element}.
     * The element does not have to exist yet at the time of calling this function.
     * 
     * If the referenced parameter cannot be resolved immediately, resolving is
     * retried later when the specified `root` element gets initialized.
     * 
     * The `chain` parameter consists of a list of identifiers that address a
     * property. For example, to address the property `width` of an element
     * with ID `theBox`, the chain would be `["theBox", "width"]`.
     * 
     * The `resolver` function is expected to take an element ID string as parameter and
     * return the corresponding declarative-level element, or `undefined` if it could
     * not be resolved yet (because the element has not yet been created).
     * 
     * A simple resolver might look like
     * 
     *     (id) => root.find(id);
     * 
     * @example
     * const b = declarative.chainRef(root, ["theBox", "width"], (id) =>
     * {
     *     // do something to lookup the element by ID
     *     ...
     *     return element;
     * });
     * 
     * @memberof declarative
     * 
     * @param {declarative.Element} root - The root element.
     * @param {string[]} chain - The chain that makes up the reference.
     * @param {function} resolver - A resolver function.
     */
    function chainRef(root, chain, resolver)
    {
        //console.log("Chain: " + JSON.stringify(chain) + " with root " + root.objectType() + "@" + root.objectLocation());

        let handles = [];
        //let b = exports.dynamicValue(undefined);
        let b = new DynamicValue(undefined);
        b._sh_annotation = chain.join(".");

        function resolveChain(obj, chain)
        {
            let ch = chain.slice();
            if (obj === null)
            {
                obj = resolver(ch.shift());
            }
            ch.forEach(c =>
            {
                const v = (obj instanceof DynamicValue) ? obj.val
                                                        : obj;

                const next = (v !== undefined && v !== null) ? v[c]
                                                             : undefined;
                if (typeof next === "function")
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
            if (! resolveChain)
            {
                return;
            }

            // stop watching old DVs first
            handles.forEach(h =>
            {
                h.unwatch();
            });
            handles = [];

            //console.log("init: " + JSON.stringify(chain));
            let obj = null;
            let dvs = [];
            chain.forEach((c, i) =>
            {
                obj = resolveChain(obj, [c]);
                if (obj instanceof DynamicValue)
                {
                    dvs.push(obj);
                }
            });

            //console.log(chain + " -> " + JSON.stringify(obj));
            if (obj === undefined)
            {
                for (let i = 0; i < dvs.length; ++i)
                {
                    const handle = dvs[i].watch(() =>
                    {
                        //console.log("Re-evaluating reference: " + chain);
                        setup();
                    });
                    handles.push(handle);
                }

                // this value won't change anymore
                if (b._sh_annotation !== "")
                {
                    //console.log("The reference " + root.objectLocation.val + " " + b._sh_annotation + " remains undefined");
                }
                b._sh_really_undefined = true;
                b.update();
            }
            else if (dvs.length > 0)
            {
                //console.log("success: " + JSON.stringify(chain));

                for (let i = 0; i < dvs.length - 1; ++i)
                {
                    const handle = dvs[i].watch(() =>
                    {
                        //console.log("Re-evaluating reference: " + chain);
                        setup();
                    });
                    handles.push(handle);
                }

                const dv = dvs[dvs.length - 1];

                const handle = dv.watch(() =>
                {
                    b.update();
                });
                handles.push(handle);
                
                const items = chain.slice();
                if (obj instanceof DynamicValue)
                {
                    b.getter = () => { return obj.val; }
                    b.maybeUndefined = () => obj.maybeUndefined();
                }
                else
                {
                    //console.log("not a DV: " + JSON.stringify(chain));
                    b.getter = () => { return resolveChain(null, items); }
                }
                b.update();
            }
            else
            {
                // static
                //console.log("static: " + JSON.stringify(chain));
                b.getter = () => { return obj; };
                b.update();
            }    
        }

        if (root.lifeCycleStatus.val === "initialized")
        {
            setup();
        }
        else
        {
            root.get().onInitialization = () =>
            {
                setup();
            };
         }

        b.unwatched(() =>
        {
            //console.log("ref unwatched: " + JSON.stringify(chain));
            handles.forEach(h =>
            {
                h.unwatch();
            });
            handles = [];
            // break cycle (setup <-> resolveChain)
            resolveChain = null;
        });

        return b;
    }
    exports.chainRef = chainRef;
});
