/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2019 Martin Grimme <martin.grimme@gmail.com>

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
        /**
         * @constructor
         */
        constructor()
        {
            this.keyCounter = 0;

            // map { source -> { target } }
            this.targetsOfSource = new Map();
            // map { target -> { source } }
            this.sourcesOfTarget = new Map();

            // map { target -> { handlerKey } }
            this.handlersOfTarget = new Map();
            // map { source -> { handlerKey } }
            this.handlersOfSource = new Map();

            // map { handlerKey -> event }
            this.eventOfHandler = new Map();

            // map { handlerKey -> handler }
            this.handlers = new Map();
        }

        connect(target, event, source, handler)
        {
            const handlerKey = "handler-" + this.keyCounter;
            ++this.keyCounter; 

            this.handlers.set(handlerKey, handler);

            if (! this.targetsOfSource.has(source))
            {
                this.targetsOfSource.set(source, new Set());
            }
            this.targetsOfSource.get(source).add(target);

            if (! this.sourcesOfTarget.has(target))
            {
                this.sourcesOfTarget.set(target, new Set());
            }
            this.sourcesOfTarget.get(target).add(source);

            if (! this.handlersOfSource.has(source))
            {
                this.handlersOfSource.set(source, new Set());
            }
            this.handlersOfSource.get(source).add(handlerKey);

            if (! this.handlersOfTarget.has(target))
            {
                this.handlersOfTarget.set(target, new Set());
            }
            this.handlersOfTarget.get(target).add(handlerKey);
            this.eventOfHandler.set(handlerKey, event);
        }

        disconnect(disconnectTarget, event, source)
        {
            if (! this.targetsOfSource.has(source))
            {
                return;
            }

            for (let target of this.targetsOfSource.get(source).keys())
            {
                if (disconnectTarget !== target)
                {
                    continue;
                }
                this.sourcesOfTarget.get(target).delete(source);

                for (let handlerKey of this.handlersOfSource.get(source).keys())
                {
                    if (this.eventOfHandler.get(handlerKey) === event)
                    {
                        this.handlers.delete(handlerKey);
                        this.eventOfHandler.delete(handlerKey);
                        this.handlersOfTarget.get(target).delete(handlerKey);
                    }
                }
            }
        }

        removeTarget(target)
        {
            if (! this.sourcesOfTarget.has(target))
            {
                return;
            }

            for (let source of this.sourcesOfTarget.get(target).keys())
            {
                this.targetsOfSource.get(source).delete(target);

                for (let handlerKey of this.handlersOfTarget.get(target).keys())
                {
                    this.handlers.delete(handlerKey);
                    this.eventOfHandler.delete(handlerKey);
                    this.handlersOfSource.get(source).delete(handlerKey);
                }
            }

            this.sourcesOfTarget.delete(target);
            this.handlersOfTarget.delete(target);
        }

        removeSource(source)
        {
            if (! this.targetsOfSource.has(source))
            {
                return;
            }

            for (let target of this.targetsOfSource.get(source).keys())
            {
                this.sourcesOfTarget.get(target).delete(source);

                for (let handlerKey of this.handlersOfSource.get(source).keys())
                {
                    this.handlers.delete(handlerKey);
                    this.eventOfHandler.delete(handlerKey);
                    this.handlersOfTarget.get(target).delete(handlerKey);
                }
            }

            this.targetsOfSource.delete(source);
            this.handlersOfSource.delete(source);
        }

        trigger(target, event, args)
        {
            if (! this.handlersOfTarget.has(target))
            {
                return;
            }

            for (let handlerKey of this.handlersOfTarget.get(target))
            {
                if (this.eventOfHandler.get(handlerKey) === event)
                {
                    try
                    {
                        this.handlers.get(handlerKey).apply(null, args || []);
                    }
                    catch (err)
                    {
                        console.error("Error triggering event '" + target.constructor.name + "." + event + "': " + err);
                    }
                }
            }    
        }

        has(target, event)
        {
            if (! this.handlersOfTarget.has(target))
            {
                return false;
            }

            for (let handlerKey of this.handlersOfTarget.get(target))
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
     * @property {string} lifeCycleStatus - [readonly] The current life cycle status: new|initialized|destroyed
     */
    exports.Object = class Obj
    {
        /**
         * @constructor
         */
        constructor()
        {
            d.set(this, {
                lifeCycleStatus: "new",
                onDestruction: null,
            });

            this.registerEvent("initialization");
            this.registerEvent("destruction");
            this.registerEvent("dataChange");

            ++objCounter;
            //console.log("objCounter: " + objCounter + " +" + this.constructor.name);
        }

        get lifeCycleStatus() { return d.get(this).lifeCycleStatus; }

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
            this.trigger("destruction");
            connHub.removeSource(this);
            connHub.removeTarget(this);
            if (this.get)
            {
                this.get().remove();
            }

            --objCounter;
            //console.log("objCounter: " + objCounter + " -" + this.constructor.name);
        }

        /**
         * Makes the given property notifyable. This adds a <name>Changed event
         * for listening to changes.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         * @param {bool} triggerInitially - Whether to trigger the <name>Changed event initially.
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
                if (typeof this[name] === "object" || this[name] !== priv["(notifyable)" + name])
                {
                    this.trigger(nameChanged, ...args);
                    priv["(notifyable)" + name] = this[name];
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
         * <name>Transition for defining the transition animation.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the property.
         */
        transitionable(name)
        {
            let transition = null;
            this.addProperty(name + "Transition", () => transition, t => { transition = t });
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
                transition.start((value) => { this[name] = value; });
            }
            else
            {
                this[name] = newValue;
            }
        }

        /**
         * Registers the given event.
         * If connectionCb is specified, that callback will be invoked whenever
         * a connection to the event is made.
         * 
         * @memberof mid.Object
         * @param {string} name - The name of the event.
         * @param {function} connectionCb - The callback to invoke after each new connection.
         */
        registerEvent(name, connectionCb)
        {
            const uname = name[0].toUpperCase() + name.substr(1);
            const onEvent = "on" + uname;
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
         * automatically when the source object is discarded.
         * 
         * @memberof mid.Object
         * @param {string} event - The event name.
         * @param {object} source - The source of the handler.
         * @param {function} handler - The event handler.
         */
        connect(event, source, handler)
        {
            connHub.connect(this, event, source, handler);
        }

        /**
         * Disconnects an object from the given event.
         * 
         * @memberof mid.Object
         * @param {string} event - The event name.
         * @param {object} source - The object to disconnect.
         */
        disconnect(event, source)
        {
            connHub.disconnect(this, event, source);
        }

        /**
         * Triggers the given event.
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
         * Returns whether the given event has handlers connected.
         * 
         * @memberof mid.Object
         * @param {string} event - The name of the event.
         * @returns {bool} Whether the event has handlers connected.
         */
        hasConnections(event)
        {
            return connHub.has(this, event);
        }
        
    };

})();
