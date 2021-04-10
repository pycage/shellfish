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
 * A color value.
 * @typedef Color
 * @memberof mid.Object
 */

/**
 * A directional vector in 2D space.
 * @typedef Vec2
 * @memberof mid.Object
 */

/**
 * A directional vector in 3D space.
 * @typedef Vec3
 * @memberof mid.Object
 */

shRequire(["shellfish/low", __dirname + "/util/color.js"], (low, colUtil) =>
{

    /**
     * Class representing a hub of the event connections.
     * @private
     */
    class ConnectionsHub
    {
        constructor()
        {
            this.keyCounter = 0;

            // map { receiver -> { emitter } }
            this.emittersOfReceiver = new Map();
            // map { emitter -> { receiver } }
            this.receiversOfEmitter = new Map();

            // map { emitter -> { handlerKey } }
            this.handlersOfEmitter = new Map();
            // map { receiver -> { handlerKey } }
            this.handlersOfReceiver = new Map();

            // map { handlerKey -> event }
            this.eventOfHandler = new Map();

            // map { handlerKey -> handler }
            this.handlers = new Map();
        }

        connect(emitter, event, receiver, handler)
        {
            const handlerKey = "handler-" + this.keyCounter;
            ++this.keyCounter; 

            this.handlers.set(handlerKey, handler);

            if (! this.emittersOfReceiver.has(receiver))
            {
                this.emittersOfReceiver.set(receiver, new Set());
            }
            this.emittersOfReceiver.get(receiver).add(emitter);

            if (! this.receiversOfEmitter.has(emitter))
            {
                this.receiversOfEmitter.set(emitter, new Set());
            }
            this.receiversOfEmitter.get(emitter).add(receiver);

            if (! this.handlersOfReceiver.has(receiver))
            {
                this.handlersOfReceiver.set(receiver, new Set());
            }
            this.handlersOfReceiver.get(receiver).add(handlerKey);

            if (! this.handlersOfEmitter.has(emitter))
            {
                this.handlersOfEmitter.set(emitter, new Set());
            }
            this.handlersOfEmitter.get(emitter).add(handlerKey);
            this.eventOfHandler.set(handlerKey, event);
        }

        disconnect(emitter, event, receiver)
        {
            if (this.emittersOfReceiver.has(receiver))
            {
                for (let handlerKey of this.handlersOfReceiver.get(receiver).keys())
                {
                    if (this.eventOfHandler.get(handlerKey) === event &&
                        this.handlersOfEmitter.get(emitter) === handlerKey)
                    {
                        this.handlers.delete(handlerKey);
                        this.eventOfHandler.delete(handlerKey);
                        this.handlersOfEmitter.get(emitter).delete(handlerKey);
                        this.handlersOfReceiver.get(receiver).delete(handlerKey);
                    }
                }
            }

            // may we drop the connection relation?
            if (this.handlersOfReceiver.has(receiver))
            {
                let hasConnections = false;
                for (let handlerKey of this.handlersOfReceiver.get(receiver).keys())
                {
                    if (this.handlersOfEmitter.get(emitter).has(handlerKey))
                    {
                        hasConnections = true;
                        break;
                    }
                }
    
                if (! hasConnections)
                {
                    this.receiversOfEmitter.get(emitter).delete(receiver);
                    this.emittersOfReceiver.get(receiver).delete(emitter);
                }
            }
        }

        removeEmitter(emitter)
        {
            if (this.receiversOfEmitter.has(emitter))
            {
                for (let receiver of this.receiversOfEmitter.get(emitter).keys())
                {
                    this.emittersOfReceiver.get(receiver).delete(emitter);
    
                    for (let handlerKey of this.handlersOfEmitter.get(emitter).keys())
                    {
                        this.handlers.delete(handlerKey);
                        this.eventOfHandler.delete(handlerKey);
                        this.handlersOfReceiver.get(receiver).delete(handlerKey);
                    }
                }
            }

            this.receiversOfEmitter.delete(emitter);
            this.handlersOfEmitter.delete(emitter);
        }

        removeReceiver(receiver)
        {
            if (this.emittersOfReceiver.has(receiver))
            {
                for (let emitter of this.emittersOfReceiver.get(receiver).keys())
                {
                    this.receiversOfEmitter.get(emitter).delete(receiver);
    
                    for (let handlerKey of this.handlersOfReceiver.get(receiver).keys())
                    {
                        this.handlers.delete(handlerKey);
                        this.eventOfHandler.delete(handlerKey);
                        this.handlersOfEmitter.get(emitter).delete(handlerKey);
                    }
                }
            }

            this.emittersOfReceiver.delete(receiver);
            this.handlersOfReceiver.delete(receiver);
        }

        trigger(emitter, event, args)
        {
            if (! this.handlersOfEmitter.has(emitter))
            {
                return;
            }

            for (let handlerKey of this.handlersOfEmitter.get(emitter))
            {
                if (this.eventOfHandler.get(handlerKey) === event)
                {
                    try
                    {
                        this.handlers.get(handlerKey).apply(null, args || []);
                    }
                    catch (err)
                    {
                        console.error(`[${exports.dbgctx}] Error triggering event '${emitter.constructor.name}.${event} (${emitter.objectLocation}): ${err}\n${err.stack || "<stacktrace not available>"}`);
                    }
                }
            }    
        }

        has(emitter, event)
        {
            if (! this.handlersOfEmitter.has(emitter))
            {
                return false;
            }

            for (let handlerKey of this.handlersOfEmitter.get(emitter))
            {
                if (this.eventOfHandler.get(handlerKey) === event)
                {
                    return true;
                }
            }
            
            return false;
        }

        events(emitter)
        {
            if (this.handlersOfEmitter.has(emitter))
            {
                const events = [];
                for (let handlerKey of this.handlersOfEmitter.get(emitter))
                {
                    let recv = null;
                    for (let receiver of this.receiversOfEmitter.get(emitter))
                    {
                        for (let rh of this.handlersOfReceiver.get(receiver))
                        {
                            if (rh === handlerKey)
                            {
                                recv = receiver;
                            }
                        }
                    }
                    if (this.eventOfHandler.has(handlerKey))
                    {
                        events.push([this.eventOfHandler.get(handlerKey), recv]);
                    }
                }
                return events;
            }
            else
            {
                return [];
            }
        }
    }
    const connHub = new ConnectionsHub();


    let objCounter = 0;
    let idCounter = 0;
    const allInstances = new Set();
    const d = new WeakMap();

    /**
     * Base class representing a mid-level object with support for
     * parent-child relations, reference counting, properties, events, and
     * lifecycle management.
     * 
     * @alias mid.Object
     * 
     * @property {mid.Object[]} children - [readonly] The child objects.
     * @property {string} lifeCycleStatus - [readonly] The current lifecycle status: `new|initialized|destroyed`
     * @property {number} objectId - [readonly] The unique ID of the object for debugging purposes.
     * @property {string} objectLocation - A string describing the object's location for debugging purposes.
     * @property {string} objectType - A string describing the object's type for debugging purposes.
     * @property {mid.Object} parent - The parent object, or `null` if the object has no parent.
     * 
     */
    class Obj
    {
        constructor()
        {
            d.set(this, {
                lifeCycleStatus: "new",
                referenceCount: 0,
                referenceMap: { },
                customProperties: [],
                parent: null,
                children: [],
                interpolators: { },
                objectId: idCounter++,
                objectLocation: "<unspecified location>",
                objectType: this.constructor.name,
                recursionDepth: 0,
                htmlEventListeners: [],
                blobUrls: [],
                typeCache: { }
            });

            this.notifyable("children");
            this.notifyable("parent");

            /**
             * Is triggered after the object was initialized.
             * @event initialization
             * @memberof mid.Object
             */
            this.registerEvent("initialization");

            /**
             * Is triggered immediately before the object will be discarded.
             * @event destruction
             * @memberof mid.Object
             */
            this.registerEvent("destruction");

            /**
             * Is triggered after the object was discarded.
             * @event termination
             * @memberof mid.Object
             */
            this.registerEvent("termination");

            /**
             * Is triggered when object data changes.
             * Subclasses may use this event for update notifications.
             * @event dataChange
             * @memberof mid.Object
             */
            this.registerEvent("dataChange");

            ++objCounter;
            allInstances.add(this);
            //console.log("objCounter: " + objCounter + " +" + this.constructor.name);
        }

        get lifeCycleStatus() { return d.get(this).lifeCycleStatus; }
        
        get objectId() { return d.get(this).objectId; }

        get objectLocation() { return d.get(this).objectLocation; }
        set objectLocation(l)
        {
            d.get(this).objectLocation = l;
        }

        get objectType() { return d.get(this).objectType; }
        set objectType(t)
        {
            d.get(this).objectType = t;
        }
        
        get parent() { return d.get(this).parent; }
        set parent(p)
        {
            if (d.get(this).parent === p)
            {
                return;
            }

            if (d.get(this).parent)
            {
                if (p !== null)
                {
                    console.warn("The object " +
                                 this.constructor.name + " at " + this.objectLocation + " " +
                                 "has already a parent " +
                                 d.get(this).parent.constructor.name + " at " + d.get(this).parent.objectLocation + ".");
                }
                //console.log("Removing parent reference of " + this.objectLocation);
                d.get(this).parent.detachChild(this);
                //console.log("referenceRemove on " + this.objectLocation + " by changing parent to " + (p ? p.objectLocation : "null"));
                this.referenceRemove(d.get(this).parent);
            }
            d.get(this).parent = p;
            if (p !== null)
            {
                p.attachChild(this);
                this.referenceAdd(p);
            }
            this.parentChanged();
        }

        get children() { return d.get(this).children; }


        /**
         * Creates a color from RGBA values.
         * 
         * @param {number} r - The red value between 0.0 and 1.0.
         * @param {number} g - The green value between 0.0 and 1.0.
         * @param {number} b - The blue value between 0.0 and 1.0.
         * @param {number} a - The alpha value between 0.0 and 1.0.
         * @returns {Color} - The color.
         */
        rgba(r, g, b, a) { return colUtil.rgba(r, g, b, a); }
        /**
         * Creates a color from RGB values.
         * 
         * @param {number} r - The red value between 0.0 and 1.0.
         * @param {number} g - The green value between 0.0 and 1.0.
         * @param {number} b - The blue value between 0.0 and 1.0.
         * @returns {Color} - The color.
         */
        rgb(r, g, b) { return colUtil.rgb(r, g, b); }
        /**
         * Creates a color from a CSS color name.
         * 
         * @param {string} name - The color name.
         * @returns {Color} - The color.
         */
        colorName(name) { return colUtil.color(name); }


        /**
         * Initializes this object. Call this method after creating the object
         * and its children.
         */
        init()
        {
            if (d.get(this).lifeCycleStatus === "initialized")
            {
                console.error(`Attempted to initialize an already initialized object: ${this.constructor.name} (${this.objectLocation})`);
                return;
            }
            
            d.get(this).lifeCycleStatus = "initialized";
            this.trigger("initialization");

        }

        /**
         * Discards this object.
         * 
         * @deprecated Objects are discarded automatically once the reference count reaches 0.
         */
        discard()
        {
            console.warn(this.objectType + "@" + this.objectLocation +
                         ": Calling discard() is deprecated and should not be used.");
            this.destroy();
        }

        /**
         * Destroys this object. Do not use this object afterwards and drop all
         * references to it so it may get garbage-collected.
         * 
         * @private
         */
        destroy()
        {
            if (d.get(this).lifeCycleStatus === "destroyed")
            {
                console.error(`Attempted to destroy an already destroyed object: ${this.constructor.name} (${this.objectLocation})`);
                return;
            }

            d.get(this).lifeCycleStatus = "destroyed";
            this.trigger("destruction");

            connHub.removeReceiver(this);
            connHub.removeEmitter(this);

            if (d.get(this).parent)
            {
                d.get(this).parent.detachChild(this);
            }
            d.get(this).parent = null;

            d.get(this).htmlEventListeners.forEach(entry =>
            {
                //console.log("removeEventListener: " + entry.type + ", " + JSON.stringify(entry.options));
                entry.target.removeEventListener(entry.type, entry.listener, entry.options);
            });
            d.get(this).htmlEventListeners = [];

            d.get(this).blobUrls.forEach(url =>
            {
                console.log("Revoking object URL: " + url);
                URL.revokeObjectURL(url);
            });
            d.get(this).blobUrls = [];

            d.get(this).interpolators = { };

            if (this.get)
            {
                // remove from DOM
                this.get().remove();
            }

            --objCounter;
            allInstances.delete(this);
            //console.log(`Destroyed: ${this.constructor.name} (${this.objectLocation}), ${objCounter} objects remaining`);
        }

        /**
         * Wraps a callback function to be save, i.e. it will only be invoked
         * if the object is still alive. This helps when working with asynchronous
         * code.
         * 
         * @param {function} callback - The callback function.
         * @returns {function} - The safe callback function.
         */
        safeCallback(callback)
        {
            return (...args) =>
            {
                if (d.get(this).lifeCycleStatus !== "destroyed")
                {
                    return callback(...args);
                }
            };
        }

        /**
         * Adds a reference to this object, which means that another object is
         * holding a reference to this object from then on. Objects are not
         * discarded while still being referenced.
         * 
         * @param {mid.Object} which - The referencing object.
         * @see {@link mid.Object#referenceRemove referenceRemove}
         */
        referenceAdd(which)
        {
            if (which === this)
            {
                return;
            }

            ++d.get(this).referenceCount;
            const whichName = which ? which.objectType + "@" + which.objectLocation
                                    : "<global>";
            d.get(this).referenceMap[whichName] = (d.get(this).referenceMap[whichName] || 0) + 1;

            if (which === null)
            {
                return;
            }
            /*
            console.log(this.constructor.name + "@" + this.objectLocation +
                        " is referenced by " + which.constructor.name + "@" + which.objectLocation +
                        " (" + d.get(this).referenceCount + " references)");
            */

            if (d.get(this).lifeCycleStatus === "new")
            {
                if (which.lifeCycleStatus === "initialized")
                {
                    this.init();
                }
                else
                {
                    which.connect("initialization", this, () =>
                    {
                        if (this.lifeCycleStatus === "new")
                        {
                            this.init();
                        }
                        which.disconnect("initialization", this);
                    });
                }
            }

            which.connect("destruction", this, () =>
            {
                //console.log("Remove reference on destruction of " + this.objectLocation + " -> " + (d.get(this).referenceCount - 1));
                //console.log("referenceRemove on " + this.objectLocation + " by destruction of " + which.objectLocation);
                this.referenceRemove(which);
            });
        }

        /**
         * Removes a reference from this object. When there are no references
         * left, the object will be discarded automatically.
         * 
         * @param {mid.Object} which - The referencing object.
         * @see {@link mid.Object#referenceAdd referenceAdd}
         */
        referenceRemove(which)
        {
            if (which === this)
            {
                return;
            }

            --d.get(this).referenceCount;
            const whichName = which ? which.objectType + "@" + which.objectLocation
                                    : "<global>";
            --d.get(this).referenceMap[whichName];
            if (d.get(this).referenceMap[whichName] === 0)
            {
                delete d.get(this).referenceMap[whichName];
            }

            /*
            console.log(this.constructor.name + "@" + this.objectLocation +
                        " is unreferenced by " + which.constructor.name + "@" + which.objectLocation +
                        " (" + d.get(this).referenceCount + " references)");
            */

            which.disconnect("destruction", this);

            if (d.get(this).referenceCount === 0)
            {
                //console.log("Destroy on referenceRemove on " + this.objectLocation);
                this.destroy();
            }
        }

        /**
         * Attaches a child object.
         * 
         * @private
         * @param {mid.Object} child - The child to attach.
         */
        attachChild(child)
        {
            d.get(this).children.push(child);
            this.childrenChanged();
        }

        /**
         * Detaches a child object.
         * 
         * @private
         * @property {mid.Object} child - The child to detach.
         */
        detachChild(child)
        {
            //console.log("Detach Child: " +
            //            child.constructor.name + " (" + child.objectLocation + ") from " +
            //            this.constructor.name + " (" + this.objectLocation + ")");
            d.get(this).children = d.get(this).children.filter(c => c !== child);
            this.childrenChanged();
        }

        /**
         * Makes the given property notifyable.
         * This adds a `<name>Changed` event to the object for watching the
         * property for changes.
         * 
         * @param {string} name - The name of the property.
         */
        notifyable(name)
        {
            this.registerEvent(name + "Changed");
        }

        /**
         * Returns the role type of the given property. The type is `undefined` if the
         * property does not exist.
         * 
         * @param {string} name - The name of the property.
         * @returns {string} The type, one of `property|method|event|eventhandler|undefined`
         */
        typeOf(name)
        {
            const priv = d.get(this);
            const result = priv.typeCache[name];
            if (result)
            {
                return result;
            }

            let descr = Object.getOwnPropertyDescriptor(this, name);
            if (descr)
            {
                // event or event handler or custom property
                if (descr.set)
                {
                    if (priv.customProperties.find(c => c === name))
                    {
                        priv.typeCache[name] = "property";
                        return "property";
                    }
                    else
                    {
                        priv.typeCache[name] = "eventhandler";
                        return "eventhandler";
                    }
                }
                else
                {
                    priv.typeCache[name] = "event";
                    return "event";
                }
            }
            
            let proto = Object.getPrototypeOf(this);
            while (proto)
            {
                descr = Object.getOwnPropertyDescriptor(proto, name);
                if (descr)
                {
                    if (descr.get || descr.set)
                    {
                        priv.typeCache[name] = "property";
                        return "property";
                    }
                    else
                    {
                        priv.typeCache[name] = "method";
                        return "method";
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }

            // the property is not defined (do not cache)
            return "undefined";
        }

        /**
         * Adds a custom external property of any type. The property is notifyable.
         * 
         * @param {string} name - The name of the property.
         * @param {function} getter - A function returning the property's value.
         * @param {function} setter - A function accepting the property's new value.
         */
        addProperty(name, getter, setter)
        {
            this.notifyable(name);

            const s = (v) =>
            {
                const prevV = getter();
                if (v === prevV)
                {
                    return;
                }
                if (prevV instanceof Obj)
                {
                    //console.log("referenceRemove on " + prevV.objectLocation + " by set " + name + " on " + this.objectLocation);
                    prevV.referenceRemove(this);
                }
                if (v instanceof Obj)
                {
                    v.referenceAdd(this);
                }
                setter(v);
                this[name + "Changed"]();
            };

            Object.defineProperty(this, name, {
                set: s,
                get: getter,
                enumerable: true
            });

            d.get(this).customProperties.push(name);
        }

        /**
         * Makes the given property transitionable by adding a property
         * `<name>Transition` for defining a transition animation.
         * 
         * @param {string} name - The name of the property.
         * @param {function} interpolate - An optional interpolation function.
         * @see {@link mid.Object#change change}
         */
        transitionable(name, interpolate)
        {
            let transition = null;
            this.addProperty(name + "Transition", () => transition, t =>
            {
                transition = t;

            });
            if (interpolate)
            {
                d.get(this).interpolators[name] = interpolate;
            }
        }

        /**
         * Changes the given property by applying a transition if specified.
         * This is the prefered way to change a property's value as it takes
         * potential transitioning into account.
         * 
         * @param {string} name - The name of the property.
         * @param {any} newValue - The property's new value.
         * @see {@link mid.Object#transitionable transitionable}
         */
        change(name, newValue)
        {
            const transitionProp = name + "Transition";
            if (this[transitionProp] &&
                this[transitionProp].enabled &&
                d.get(this).lifeCycleStatus === "initialized")
            {
                const transition = this[transitionProp];
                transition.from = this[name];
                transition.to = newValue;
                const interpolate = d.get(this).interpolators[name];
                if (interpolate)
                {
                    transition.interpolate = interpolate;
                }
                transition.start((value) => { this[name] = value; });
            }
            else
            {
                this[name] = newValue;
            }
        }

        /**
         * Registers the given event.
         * If `connectionMonitor` is specified, that callback will be invoked
         * whenever a connection to the event is made.
         * 
         * @param {string} name - The name of the event.
         * @param {function} connectionMonitor - The callback to invoke after each new connection.
         */
        registerEvent(name, connectionMonitor)
        {
            if (this[name] !== undefined)
            {
                throw "The name " + name + " is already in use.";
            }

            const uname = name[0].toUpperCase() + name.substr(1);
            const onEvent = "on" + uname;

            if (this[onEvent] !== undefined)
            {
                throw "The name " + onEvent + " is already in use.";
            }

            Object.defineProperty(this, onEvent, {
                set: (cb) =>
                {
                    connHub.connect(this, name, this, cb);
                    if (connectionMonitor) connectionMonitor();
                },
                get: () => true,
                enumerable: false
            });

            const priv = d.get(this);
            this[name] = (...args) =>
            {
                if (priv.recursionDepth > 3)
                {
                    console.warn(`Binding loop in ${this.constructor.name}.${name} (${this.objectLocation})`);
                    return;
                }

                ++priv.recursionDepth;
                this.trigger(name, ...args);
                --priv.recursionDepth;
            };
        }

        /**
         * Connects a handler to the given event. The handler gets disconnected
         * automatically when the receiver object is discarded.
         * 
         * @param {string} event - The event name.
         * @param {mid.Object} receiver - The receiver object that owns the handler.
         * @param {function} handler - The event handler.
         */
        connect(event, receiver, handler)
        {
            connHub.connect(this, event, receiver, handler);
        }

        /**
         * Disconnects an object from the given event.
         * 
         * @param {string} event - The event name.
         * @param {mid.Object} receiver - The object to disconnect.
         */
        disconnect(event, receiver)
        {
            connHub.disconnect(this, event, receiver);
        }

        /**
         * Triggers the given event.
         * @deprecated Call the event name directly, e.g. this.dataChanged();
         * 
         * @param {string} event - The name of the event.
         * @param {any[]} args - The event arguments.
         */
        trigger(event, ...args)
        {
            //console.log("Trigger Event: " + this.constructor.name + "." + event);
            connHub.trigger(this, event, args);
        }

        /**
         * Returns whether the given event has handlers connected.
         * 
         * @param {string} event - The name of the event.
         * @returns {bool} Whether the event has handlers connected.
         */
        hasConnections(event)
        {
            return connHub.has(this, event);
        }
        
        /**
         * Adds a HTML event listener and registers it for proper removal. This
         * is prefered to just using `addEventListener`.
         * 
         * @param {HTMLElement} target - The target HTML element.
         * @param {string} type - The event type.
         * @param {function} listener - The listener function.
         * @param {object} [options] - Optional HTML event listener options.
         */
        addHtmlEventListener(target, type, listener, options)
        {
            target.addEventListener(type, listener, options);
            d.get(this).htmlEventListeners.push({
                target, type, listener, options
            });
        }

        /**
         * Removes the given HTML event listener. This is prefered to just using
         * `removeEventListener`.
         * 
         * @param {HTMLElement} target - The target HTML element.
         * @param {string} type - The event type.
         * @param {function} listener - The listener function.
         * @param {object} [options] - Optional HTML event listener options.
         */
        removeHtmlEventListener(target, type, listener, options)
        {
            target.removeEventListener(type, listener, options);
            const listeners = d.get(this).htmlEventListeners;
            
            const idx = listeners.findIndex(entry =>
            {
                return entry.target === target &&
                       entry.type === type &&
                       entry.listener === listener &&
                       entry.options === options;
            });

            if (idx !== -1)
            {
                listeners.splice(idx, 1);
            }
        }

        /**
         * Creates an URL for the given blob. The URL is automatically revoked
         * on destruction of this object.
         * 
         * @param {Blob} blob - The blob to create an URL for.
         * @returns {string} - The URL.
         */
        blobUrl(blob)
        {
            const url = URL.createObjectURL(blob);
            //console.log("Creating object URL (object size: " + blob.size + " bytes, type: " + (blob.type || "<unknown>") + "): " + url);
            d.get(this).blobUrls.push(url);
            return url;
        }

        /**
         * Adds a child object to this object.
         * 
         * @param {mid.Object} child - The child object.
         */
        add(child)
        {
            child.parent = this;
        }
    }
    exports.Object = Obj;

    /**
     * Creates a dump of the current status for debugging purposes.
     *
     * This is a very expensive operation giving you details about the objects,
     * their relations, reference counts, and lifecycle status.
     * 
     * The dump must only be used for debugging purposes as its format may be
     * subject to change.
     * 
     * @example <caption>Dumping to the console (some browsers allow you to navigate it as a tree)</caption>
     * console.log(mid.dumpStatus());
     * 
     * @example <caption>Dump as string (Warning: the output could become very long!)</caption>
     * console.log(JSON.stringify(mid.dumpStatus()));
     * 
     * @example <caption>Setup dumping on pressing Ctrl+D in a Shui document</caption>
     * Document {
     *     onKeyDown: (ev) =>
     *     {
     *         if (ev.key === "d" && ev.ctrlKey)
     *         {
     *             console.log(mid.dumpStatus());
     *             ev.accepted = true;  // this key-press was handled and should not bubble up further
     *         }
     *     }
     * }
     * 
     * @memberof mid
     * 
     * @returns {Object} The dump.
     */
    function dumpStatus()
    {
        function dumpObject(obj)
        {
            return {
                id: obj.objectId,
                type: obj.objectType,
                location: obj.objectLocation,
                lifeCycleStatus: obj.lifeCycleStatus,
                domNode: obj.get ? obj.get() : null,
                references: d.get(obj).referenceCount,
                referenceHolders: d.get(obj).referenceMap,
                events: connHub.events(obj).map(item => [item[0], item[1].objectType + "@" + item[1].objectLocation]),
                children: d.get(obj).children.map(dumpObject),
                parent: d.get(obj).parent ? d.get(obj).parent.objectType + "@" + d.get(obj).parent.objectLocation : "",
                itemStatus: !! obj.get ? {
                    ancestorsEnabled: obj.ancestorsEnabled,
                    enabled: obj.enabled,
                    ancestorsVisible: obj.ancestorsVisible,
                    visible: obj.visible,
                    focus: obj.focus
                } : null
            };
        }

        const idMap = { };
        const locationMap = { };
        const typeMap = { };
        const statusMap = { };
        const refCountMap = { };
        for (let obj of allInstances)
        {
            const loc = obj.objectLocation;
            const dObj = dumpObject(obj);

            idMap[obj.objectId] = dObj;

            if (! locationMap[loc])
            {
                locationMap[loc] = [];
            }
            locationMap[loc].push(dObj);
            
            if (! typeMap[obj.objectType])
            {
                typeMap[obj.objectType] = [];
            }
            typeMap[obj.objectType].push(dObj);

            if (! statusMap[obj.lifeCycleStatus])
            {
                statusMap[obj.lifeCycleStatus] = [];
            }
            statusMap[obj.lifeCycleStatus].push(dObj);

            if (! refCountMap[dObj.references])
            {
                refCountMap[dObj.references] = [];
            }
            refCountMap[dObj.references].push(dObj);
        }

        return {
            objectCount: objCounter,
            frameHandlers: low.activeFrameHandlers(),
            byId: idMap,
            byLocation: locationMap,
            byType: typeMap,
            byLifeCycleStatus: statusMap,
            byReferences: refCountMap,
            focusedNode: document.activeElement
        };
    }
    exports.dumpStatus = dumpStatus;
});

// internal debug context for giving helpful error messages
exports.dbgctx = "<no information>";
