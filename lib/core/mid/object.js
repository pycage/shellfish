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

(function ()
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
                        this.handlersOfEmitter.has(handlerKey))
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
                        console.error(`Error triggering event '${emitter.constructor.name}.${event} (${emitter.objectLocation}): ${err}`);
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
    }
    const connHub = new ConnectionsHub();


    let objCounter = 0;
    const d = new WeakMap();

    /**
     * Base class representing a mid-level object.
     * 
     * @memberof mid
     * @property {mid.Object[]} children - [readonly] The child objects.
     * @property {string} lifeCycleStatus - [readonly] The current life cycle status: `new|initialized|destroyed`
     * @property {mid.Object} parent - The parent object, or `null` if the object has no parent.
     * 
     */
    exports.Object = class Obj
    {
        constructor()
        {
            d.set(this, {
                lifeCycleStatus: "new",
                parent: null,
                children: [],
                interpolators: { },
                objectLocation: "<unspecified location>",
                recursionDepth: 0,
                htmlEventListeners: []
            });

            /**
             * Is triggered after the object is initialized.
             * @event initialization
             * @memberof mid.Object
             */
            this.registerEvent("initialization");

            /**
             * Is triggered immediately before the object is discarded.
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
            //console.log("objCounter: " + objCounter + " +" + this.constructor.name);
        }

        get lifeCycleStatus() { return d.get(this).lifeCycleStatus; }
        
        get objectLocation() { return d.get(this).objectLocation; }
        set objectLocation(l)
        {
            //console.log("objectLocation = " + l);
            d.get(this).objectLocation = l;
        }
        
        get parent() { return d.get(this).parent; }
        set parent(p)
        {
            if (d.get(this).parent)
            {
                if (p !== null)
                {
                    console.warn("The object " +
                                 this.constructor.name + " at " + this.objectLocation + " " +
                                 "has already a parent " +
                                 d.get(this).parent.constructor.name + " at " + d.get(this).parent.objectLocation + ".");
                }
                d.get(this).parent.detachChild(this);
            }
            d.get(this).parent = p;
            if (p !== null)
            {
                p.attachChild(this);
            }
        }

        get children() { return d.get(this).children; }

        /**
         * Initializes this object. Call this method after creating this object
         * and its children.
         * 
         * @memberof mid.Object
         */
        init()
        {
            d.get(this).lifeCycleStatus = "initialized";
            this.trigger("initialization");
            this.children.filter(c => c.lifeCycleStatus === "new").forEach(c =>
            {
                c.init();
            });
        }

        /**
         * Discards this object. Do not use this object afterwards and drop all
         * references to it so it may get garbage-collected.
         * 
         * @memberof mid.Object
         */
        discard()
        {
            d.get(this).lifeCycleStatus = "destroyed";
            this.children.forEach(c => { c.discard(); });
            this.trigger("destruction");
            connHub.removeReceiver(this);
            connHub.removeEmitter(this);
            this.parent = null;

            d.get(this).htmlEventListeners.forEach(entry =>
            {
                //console.log("removeEventListener: " + entry.type + ", " + JSON.stringify(entry.options));
                entry.target.removeEventListener(entry.type, entry.listener, entry.options);
            });
            d.get(this).htmlEventListeners = [];

            d.get(this).interpolators = { };

            if (this.get)
            {
                this.get().remove();
            }


            --objCounter;
            //console.log(`Discarded: ${this.constructor.name} (${this.objectLocation}), ${objCounter} objects remaining`);
        }

        /**
         * Wraps a callback function to be save, i.e. it will only be invoked
         * if the object is still alive. 
         * 
         * @memberof mid.Object
         * @param {function} callback - The callback function.
         */
        safeCallback(callback)
        {
            return (...args) =>
            {
                if (d.get(this).lifeCycleStatus !== "destroyed")
                {
                    callback(...args);
                }
            };
        }

        /**
         * Attaches a child object.
         * 
         * @memberof mid.Object
         * @param {mid.Object} child - The child to attach.
         */
        attachChild(child)
        {
            d.get(this).children.push(child);
            if (this.lifeCycleStatus === "initialized" &&
                child.lifeCycleStatus === "new")
            {
                child.init();
            }
        }

        /**
         * Detaches a child object.
         * 
         * @memberof mid.Object
         * @property {mid.Object} child - The child to detach.
         */
        detachChild(child)
        {
            //console.log("Detach Child: " +
            //            child.constructor.name + " (" + child.objectLocation + ") from " +
            //            this.constructor.name + " (" + this.objectLocation + ")");
            d.get(this).children = d.get(this).children.filter(c => c !== child);
        }

        /**
         * Makes the given property notifyable.
         * This adds a `<name>Changed` event to the object for watching the
         * property for changes.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         * @param {bool} triggerInitially - Whether to trigger the `<name>Changed` event initially.
         */
        notifyable(name, triggerInitially)
        {
            const nameChanged = name + "Changed";
            this.registerEvent(nameChanged);

            if (triggerInitially)
            {
                const currentValue = this[name];
                window.requestAnimationFrame(() => { if (this[name] !== currentValue) this[nameChanged](); });
            }

            const priv = d.get(this);
            priv["(notifyable)" + name] = undefined;
            this[nameChanged] = (...args) =>
            {
                const newValue = this[name];
                if (typeof newValue === "object" || newValue !== priv["(notifyable)" + name])
                {
                    if (d.get(this).recursionDepth > 3)
                    {
                        console.warn(`Binding loop in ${this.constructor.name}.${name} (${this.objectLocation})`);
                        return;
                    }

                    ++d.get(this).recursionDepth;
                    this.trigger(nameChanged, ...args);
                    --d.get(this).recursionDepth;
                    priv["(notifyable)" + name] = newValue;
                }
            };
        }

        /**
         * Adds a custom external property of any type. The property is notifyable.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         * @param {function} getter - A function returning the property's value.
         * @param {function} setter - A function accepting the property's new value.
         */
        addProperty(name, getter, setter)
        {
            var nameChanged = name + "Changed";

            this.notifyable(name);

            Object.defineProperty(this, name, {
                set: function (v)
                {
                    setter.apply(this, [v]);
                    this[nameChanged]();
                },
                get: getter,
                enumerable: true
            });
        }

        /**
         * Makes the given property transitionable by adding a property
         * `<name>Transition` for defining a transition animation.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         * @param {function} interpolate - An optional interpolation function.
         */
        transitionable(name, interpolate)
        {
            let transition = null;
            this.addProperty(name + "Transition", () => transition, t =>
            {
                transition = t;
                if (t && ! t.parent)
                {
                    t.parent = this;
                }
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
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         * @param {any} newValue - The property's new value.
         */
        change(name, newValue)
        {
            const transitionProp = name + "Transition";
            if (this[transitionProp] && this[transitionProp].enabled)
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
         * If `connectionCb` is specified, that callback will be invoked
         * whenever a connection to the event is made.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the event.
         * @param {function} connectionCb - The callback to invoke after each new connection.
         */
        registerEvent(name, connectionCb)
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
                    if (connectionCb) connectionCb();
                },
                get: () => true,
                enumerable: false
            });

            const that = this;
            this[name] = function () { that.trigger(name, arguments); };
        }

        /**
         * Connects a handler to the given event. The handler gets disconnected
         * automatically when the receiver object is discarded.
         * 
         * @memberof mid.Object
         * @param {string} event - The event name.
         * @param {object} receiver - The receiver object that owns the handler.
         * @param {function} handler - The event handler.
         */
        connect(event, receiver, handler)
        {
            connHub.connect(this, event, receiver, handler);
        }

        /**
         * Disconnects an object from the given event.
         * 
         * @memberof mid.Object
         * @param {string} event - The event name.
         * @param {object} receiver - The object to disconnect.
         */
        disconnect(event, receiver)
        {
            connHub.disconnect(this, event, receiver);
        }

        /**
         * Triggers the given event.
         * @deprecated Call the event name directly, e.g. `this.dataChanged();`
         * 
         * @memberof mid.Object
         * @param {string} event - The name of the event.
         * @param {...any} args - The event arguments.
         */
        trigger(event, args)
        {
            //console.log("Trigger Event: " + this.constructor.name + "." + event);
            try
            {
                connHub.trigger(this, event, args);
            }
            catch (err)
            {
                console.error(err);
            }
        }

        /**
         * Returns whether the given event has handlers connected currently.
         * 
         * @memberof mid.Object
         * @param {string} event - The name of the event.
         * @returns {bool} Whether the event has handlers connected.
         */
        hasConnections(event)
        {
            return connHub.has(this, event);
        }
        
        /**
         * Adds a HTML event listener and registers it for proper removal.
         */
        addHtmlEventListener(target, type, listener, options)
        {
            target.addEventListener(type, listener, options);
            d.get(this).htmlEventListeners.push({
                target, type, listener, options
            });
        }

        /**
         * Adds a child object to this object.
         * 
         * @memberof mid.Object
         * @param {mid.Object} child - The child object.
         */
        add(child)
        {
            if (child.get)
            {
               throw `Element '${this.constructor.name}' accepts only abstract children (${this.objectLocation}).`;
            }
            else
            {
                child.parent = this;
            }
        }
    };

})();
