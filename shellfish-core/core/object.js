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

shRequire([__dirname + "/util/color.js", __dirname + "/util/vec.js"], (colUtil, vec) =>
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

            this.afterTriggerHandlers = [];
            this.depth = 0;
        }

        runAfterTrigger(f, force)
        {
            this.afterTriggerHandlers.push(f);

            if (force && this.handlers.size === 0)
            {
                this.trigger(null, "", []);
            }
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
            if (this.handlersOfEmitter.has(emitter))
            {
                ++this.depth;
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
                --this.depth;
            }

            if (this.depth === 0 && this.afterTriggerHandlers.length > 0)
            {
                ++this.depth;
                //console.log("processing " + this.afterTriggerHandlers.length + " after-trigger handlers after " + emitter.objectLocation + "." + event);
                let count = 0;
                while (this.afterTriggerHandlers.length > 0)
                {
                    const f = this.afterTriggerHandlers.shift();
                    f();
                    ++count;
                    if (count > 10)
                    {
                        //console.log("processing break, " + this.afterTriggerHandlers.length + " left");
                        setTimeout(() =>
                        {
                            this.trigger(null, "", []);
                        }, 1);
                        break;
                    }
                }               
                --this.depth;
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

    /**
     * Class representing a sparse matrix of infinite size.
     * @private
     */
    class SparseMatrix
    {
        constructor(zero)
        {
            this.data = new Map();
            this.zero = zero;
            this.edgeLength = n => n + 1;
            this.c = n => this.edgeLength(n) * this.edgeLength(n) - 1;
            this.indexAt = (y, x) =>
            {
                if (x > y) return this.c(x - 1) + 1 + y * 2;
                if (x < y) return this.c(y - 1) + 2 + x * 2;
                return this.c(x);
            };
        }

        valueAt(y, x)
        {
            const idx = this.indexAt(x, y);
            const v = this.data.get(idx);
            return v !== undefined ? v : this.zero;
        }

        setValue(y, x, v)
        {
            const idx = this.indexAt(x, y);
            if (v === this.zero)
            {
                this.data.delete(idx);
            }
            else
            {
                this.data.set(idx, v);
            }
        }

        cellOperation(y, x, op)
        {
            this.setValue(y, x, op(this.valueAt(y, x)));
        }

        rowOperation(a, b, rowsSet, op)
        {
            let i = 0;
            for (i of rowsSet)
            {
                this.setValue(a, i, op(this.valueAt(a, i), this.valueAt(b, i)));
            }
        }

        columnOperation(a, b, columnsSet, op)
        {
            let i = 0;
            for (i of columnsSet)
            {
                this.setValue(i, a, op(this.valueAt(i, a), this.valueAt(i, b)));
            }
        }
    }

    /**
     * Class representing a reference tracker with cycles detection.
     * @private
     */
    class RefsTracker
    {
        constructor()
        {
            this.matrix = new SparseMatrix(0);

            this.cyclesMatrix = new SparseMatrix(0);
            this.cyclesMap = new Map();
            this.participantsMap = new Map();
            this.indexSet = new Set();

            this.incrementF = v => v + 1;
            this.sumF = (a, b) => a + b;
        }

        dump()
        {
            let y = 0;
            let x = 0;
            for (y of this.indexSet)
            {
                const row = [];
                for (x of this.indexSet)
                {
                    row.push(this.matrix.valueAt(y, x));
                }
                console.log(y + " " + JSON.stringify(row));
            }
        }

        cycleAdd(closer, target)
        {
            console.log("Reference cycle detected between objects " + closer + " <-> " + target);

            // register cycle in cycles matrix
            this.cyclesMatrix.cellOperation(closer, target, v => v + 1);

            // find participants of the cycle
            const aRefs = [];
            const bRefedBy = [];

            let i = 0;
            for (i of this.indexSet)
            {
                if (this.matrix.valueAt(closer, i) > 0)
                {
                    aRefs.push(i);
                }
                if (this.matrix.valueAt(i, target) > 0)
                {
                    bRefedBy.push(i);
                }
            }

            const participants = aRefs.filter(i => bRefedBy.includes(i));
            participants.push(closer);
            participants.push(target);

            // build the cycle information object
            const cycleInfo = {
                closer: closer,
                target: target,
                participants: participants
            };

            // store the cycle information
            if (! this.cyclesMap.has(target))
            {
                this.cyclesMap.set(target, []);
            }
            this.cyclesMap.get(target).push(cycleInfo);

            participants.forEach(i =>
            {
                if (! this.participantsMap.has(i))
                {
                    this.participantsMap.set(i, []);
                }
                this.participantsMap.get(i).push(cycleInfo);
            });
        }

        cycleRemove(closer, target)
        {
            console.log("Reference cycle removed between objects " + closer + " <-> " + target);

            // unregister cycle in cycles matrix
            this.cyclesMatrix.cellOperation(closer, target, v => Math.max(0, v - 1));

            const cycleInfos = this.cyclesMap.get(target);
            const idx = cycleInfos.findIndex(info => info.closer === closer);
            const info = cycleInfos.splice(idx)[0];
            if (cycleInfos.length === 0)
            {
                this.cyclesMap.delete(target);
            }

            info.participants.forEach(i =>
            {
                const infos = this.participantsMap.get(i);
                const infoIdx = infos.findIndex(finfo => finfo === info);
                infos.splice(infoIdx);
                if (infos.length === 0)
                {
                    this.participantsMap.delete(i);
                }
            });
        }

        checkCycles(participant)
        {
            if (! this.participantsMap.has(participant))
            {
                return;
            }

            const cycles = this.participantsMap.get(participant);
            cycles.forEach(info =>
            {
                if (this.matrix.valueAt(info.target, info.closer) > 0)
                {
                    return;
                }

                //console.log("no longer a cycle: " + info.closer + " -> " + info.target);
                this.cycleRemove(info.closer, info.target);
                this.refAdd(info.closer, info.target);
            });
        }

        refAdd(objA, objB)
        {
            //console.log(objA.objectId + " " + objA.objectType + "@" + objA.objectLocation + " ref " + objB.objectId + " " + objB.objectType + "@" + objB.objectLocation);

            // test if this would create a cycle
            if (this.matrix.valueAt(objB, objA) > 0)
            {
                this.cycleAdd(objA, objB);
                return;
            }

            // set direct reference
            this.matrix.cellOperation(objA, objB, this.incrementF);

            // A gets all outgoing references of B
            this.matrix.rowOperation(objA, objB, this.indexSet, this.sumF);
            
            // all X referencing A n times get B (X,B += n) and all outgoing references of B (row X += n * B)
            let i = 0;
            for (i of this.indexSet)
            {
                const n = this.matrix.valueAt(i, objA);
                if (n > 0)
                {
                    this.matrix.cellOperation(i, objB, v => v + n);
                    this.matrix.rowOperation(i, objB, this.indexSet, (a, b) => a + n * b);
                }
            }
        }

        refRemove(objA, objB)
        {
            //console.log(objA.objectId + " " + objA.objectType + "@" + objA.objectLocation + " unref " + objB.objectId + " " + objB.objectType + "@" + objB.objectLocation);

            // test if we're touching a cycle
            if (this.cyclesMatrix.valueAt(objA, objB) > 0)
            {
                this.cycleRemove(objA, objB);
                return;
            }

            // every X that references A n times (A column) loses B (X,B -= n) and all outgoing references of B (row X -= n * B)
            let i = 0;
            for (i of this.indexSet)
            {
                const n = this.matrix.valueAt(i, objA);
                if (n > 0)
                {
                    this.matrix.cellOperation(i, objB, v => Math.max(0, v - n));
                    this.matrix.rowOperation(i, objB, this.indexSet, (a, b) => a - n * b);
                }
            }

            // A loses B (A,B -= 1) and all outgoing references of B (row A -= B)
            this.matrix.cellOperation(objA, objB, v => Math.max(0, v - 1));
            this.matrix.rowOperation(objA, objB, this.indexSet, (a, b) => a - b);
            
            this.checkCycles(objB);
        }

        refsCount(obj)
        {
            let count = 0;
            let y = 0;
            for (y of this.indexSet)
            {
                count += this.matrix.valueAt(y, obj);
            }

            // add cycle closers
            if (this.cyclesMap.has(obj))
            {
                count += this.cyclesMap.get(obj).length;
            }

            return count;
        }

        refHolders(obj)
        {
            const holders = [];
            let y = 0;
            for (y of this.indexSet)
            {
                if (this.matrix.valueAt(y, obj) !== 0)
                {
                    holders.push([y, this.matrix.valueAt(y, obj)]);
                }
            }

            // add cycle closers
            if (this.cyclesMap.has(obj))
            {
                this.cyclesMap.get(obj).forEach(info => holders.push([info.closer, 1]));
            }

            return holders;
        }

        cycles()
        {
            const objs = [];
            this.cyclesMap.forEach(entry =>
            {
                entry.forEach(info =>
                {
                    info.participants.forEach(i => objs.push(i));
                });
            });

            return objs;
        }
    }
    const refsTracker = new RefsTracker();  

    /**
     * Class representing named task queues.
     * @private
     */
    class TaskQueues
    {
        constructor()
        {
            this.queues = new Map();
            this.queuesBusy = new Map();
        }

        clear(qName)
        {
            if (this.queues.has(qName))
            {
                this.queues.set(qName, []);
            }
        }

        enqueue(qName)
        {
            if (! this.queues.has(qName))
            {
                this.queues.set(qName, []);
                this.queuesBusy.set(qName, false);
            }

            const next = () =>
            {
                this.queuesBusy.set(qName, false);

                const queue = this.queues.get(qName);
                if (queue.length > 0)
                {
                    const cb = queue.shift();
                    this.queuesBusy.set(qName, true);
                    cb();
                }
            };

            return new Promise((resolve, reject) =>
            {
                const queue = this.queues.get(qName);
                queue.push(() =>
                {
                    resolve(next);
                });

                if (! this.queuesBusy.get(qName))
                {
                    next();
                }
            });
        }
    }
    const taskQueues = new TaskQueues();

    const namedCallbacks = new Map();
    const waitAborters = new Map();

    /**
     * Class managing the custom object properties.
     * @private
     */
    class CustomPropertiesManager
    {
        constructor()
        {
            // map { object -> map }
            this.map = new Map();
        }

        addProperty(obj, name, getter, setter)
        {
            let item = this.map.get(obj);
            if (! item)
            {
                // map { name -> [getter, setter] }
                item = new Map();
                this.map.set(obj, item);
            }
            item.set(name, [getter, setter]);

            const pm = this;

            if (! ProtoObject.prototype.hasOwnProperty(name))
            {
                Object.defineProperty(ProtoObject.prototype, name, {
                    set(v)
                    {
                        return pm.set(this, name, v);
                    },
                    get()
                    {
                        return pm.get(this, name);
                    },
                    enumerable: false
                });
            }
        }

        removeProperty(obj, name)
        {
            const item = this.map.get(obj);
            if (item)
            {
                item.delete(name);
                if (item.size === 0)
                {
                    this.map.delete(obj);
                }
            }
        }

        hasProperty(obj, name)
        {
            const item = this.map.get(obj);
            if (item)
            {
                return item.has(name);
            }
            return false;
        }

        hasGetter(obj, name)
        {
            const item = this.map.get(obj);
            if (item)
            {
                const item2 = item.get(name);
                if (item2)
                {
                    return item2[0] !== null;
                }
            }
            return false;
        }

        hasSetter(obj, name)
        {
            const item = this.map.get(obj);
            if (item)
            {
                const item2 = item.get(name);
                if (item2)
                {
                    return item2[1] !== null;
                }
            }
            return false;
        }

        removeObject(obj)
        {
            this.map.delete(obj);
        }

        get(obj, name)
        {
            const item = this.map.get(obj);
            if (item)
            {
                const item2 = item.get(name);
                if (item2 && item2[0] !== null)
                {
                    const res = item2[0]();
                    return res;
                }
                else
                {
                    return undefined;
                }
            }
            return undefined;
        }

        set(obj, name, v)
        {
            const item = this.map.get(obj);
            if (item)
            {
                const item2 = item.get(name);
                if (item2 && item2[1] !== null)
                {
                    return item2[1](v);
                }
                else
                {
                    throw "Object " + obj.objectType + "@" + obj.objectLocation + " has no writable property '" + name + "'.";
                }
            }
            return undefined;
        }

        properties(obj)
        {
            const item = this.map.get(obj);
            if (item)
            {
                return Array.from(item.keys());
            }
            return [];
        }
    }
    const propsManager = new CustomPropertiesManager();

    let objCounter = 0;
    let idCounter = 0;
    const allInstances = new Set();
    const generatedUids = new Set();
    const d = new WeakMap();


    class ProtoObject {
        customProperties()
        {
            return propsManager.properties(this);
        }
    }

    const sharedResources = new Map();

    /**
     * Base class representing a mid-level object with support for
     * parent-child relations, reference counting, properties, events, and
     * lifecycle management. Unlike plain JavaScript objects, this class has the
     * concept of a destructor method.
     * 
     * @alias core.Object
     * 
     * @property {core.Object[]} children - [readonly] The child objects.
     * @property {string} lifeCycleStatus - [readonly] The current lifecycle status: `new|initialized|destroyed`
     * @property {number} objectId - [readonly] The unique ID of the object for debugging purposes.
     * @property {string} objectLocation - A string describing the object's location for debugging purposes.
     * @property {string} objectType - A string describing the object's type for debugging purposes.
     * @property {core.Object} parent - The parent object, or `null` if the object has no parent.
     * 
     */
    class Obj extends ProtoObject
    {
        constructor()
        {
            super();
            d.set(this, {
                lifeCycleStatus: "new",
                customProperties: [],
                parent: null,
                children: [],
                interpolators: { },
                objectId: idCounter++,
                objectLocation: "<?>",
                objectType: this.constructor.name,
                typeCache: { },
                connectionMonitors: { }
            });

            this.notifyable("children");
            this.notifyable("parent");

            /**
             * Is triggered after the object was initialized.
             * @event initialization
             * @memberof core.Object
             */
            this.registerEvent("initialization");

            /**
             * Is triggered immediately before the object will be destroyed.
             * The object is still intact at this place.
             * @event destruction
             * @memberof core.Object
             */
            this.registerEvent("destruction");

            /**
             * Is triggered after the object was destroyed.
             * The object is not intact anymore at this place.
             * @event termination
             * @memberof core.Object
             */
            this.registerEvent("termination");

            ++objCounter;
            allInstances.add(this);
            refsTracker.indexSet.add(this.objectId);
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
                    this.log("",
                             "warning",
                             "The object " +
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
            if (this.lifeCycleStatus !== "destroyed")
            {
                this.parentChanged();
            }
        }

        get children() { return d.get(this).children; }


        /**
         * Creates a color from RGBA values.
         * 
         * @param {number} r - The red value between 0.0 and 1.0.
         * @param {number} g - The green value between 0.0 and 1.0.
         * @param {number} b - The blue value between 0.0 and 1.0.
         * @param {number} a - The alpha value between 0.0 and 1.0.
         * @returns {core.Color} - The color.
         */
        rgba(r, g, b, a) { return colUtil.rgba(r, g, b, a); }
        /**
         * Creates a color from RGB values.
         * 
         * @param {number} r - The red value between 0.0 and 1.0.
         * @param {number} g - The green value between 0.0 and 1.0.
         * @param {number} b - The blue value between 0.0 and 1.0.
         * @returns {core.Color} - The color.
         */
        rgb(r, g, b) { return colUtil.rgb(r, g, b); }
        /**
         * Creates a color from a CSS color name.
         * 
         * @param {string} name - The color name.
         * @returns {core.Color} - The color.
         */
        colorName(name) { return colUtil.color(name); }

        /**
         * Creates a 3-component vector.
         * 
         * @param {number} x - The X component.
         * @param {number} y - The Y component.
         * @param {number} z - The Z component.
         * @returns {core.Vec3} The vector.
         */
        vec3(x, y, z)
        {
            return vec.vec3(x, y, z);
        }

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
            // not needed anymore
            d.get(this).typeCache = { };
            this.trigger("initialization");

            //console.log(`Initialized: ${this.constructor.name}:${this.objectId} (${this.objectLocation}), ${objCounter} objects remaining`);
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
                console.error(`Attempted to destroy an already destroyed object: #${this.objectId} ${this.constructor.name} (${this.objectLocation})`);
                return;
            }

            d.get(this).lifeCycleStatus = "destroyed";
            this.trigger("destruction");
            this.trigger("termination");

            connHub.removeReceiver(this);
            connHub.removeEmitter(this);

            if (d.get(this).parent)
            {
                d.get(this).parent.detachChild(this);
            }
            d.get(this).parent = null;

            propsManager.removeObject(this);

            d.get(this).interpolators = { };

            if (this.get)
            {
                // remove from DOM
                this.get().remove();
            }

            d.get(this).refCountMap = { };
            d.get(this).customProperties = [];
            d.get(this).connectionMonitors = { };
            d.get(this).children = [];

            // release orphaned named callbacks
            for (const key of namedCallbacks.keys())
            {
                if (key.startsWith(this.objectId + "#"))
                {
                    namedCallbacks.delete(key);
                }
            }

            --objCounter;
            allInstances.delete(this);
            refsTracker.indexSet.delete(this.objectId);
            //console.log(`Destroyed: ${this.constructor.name}:${this.objectId} (${this.objectLocation}), ${objCounter} objects remaining`);
        }

        /**
         * Releases this object from its parent at a later point when idle.
         */
        releaseLater()
        {
            this.wait(0)
            .then(() =>
            {
                //console.log("releaseLater " + this.objectId);
                this.parent = null;
            });
        }

        /**
         * Wraps a callback function to be safe, i.e. it will only be invoked
         * if a condition still holds. By default the condition checks if the
         * object is still alive.
         * This helps when working with asynchronous code.
         * 
         * @param {function} callback - The callback function.
         * @param {function} condition - An optional condition function that returns either `true` or `false`.
         * @returns {function} - The safe-made callback function.
         */
        safeCallback(callback, condition)
        {
            if (! condition)
            {
                condition = () =>
                {
                    return d.get(this).lifeCycleStatus !== "destroyed";
                };
            }

            return (...args) =>
            {
                if (condition())
                {
                    return callback(...args);
                }
            };
        }

        /**
         * Wraps a callback function to give it a name handle by which it may be
         * canceled before execution.
         * 
         * When setting multiple callbacks of the same name, only the last
         * one will be executed.
         * 
         * @see {@link core.Object#cancelNamedCallback cancelNamedCallback}
         * @see {@link core.Object#namedCallbackPending namedCallbackPending}
         * 
         * @param {function} callback - The callback function.
         * @param {string} name - The name.
         * @returns {function} - The wrapped callback function.
         */
        namedCallback(callback, name)
        {
            const cbName = this.objectId + "#" + name;
            namedCallbacks.set(cbName, callback);

            return (...args) =>
            {
                if (namedCallbacks.has(cbName))
                {
                    const cb = namedCallbacks.get(cbName);
                    namedCallbacks.delete(cbName);
                    return cb(...args);
                }
            }
        }

        /**
         * Returns if the given named callback is currently pending.
         * 
         * @see {@link core.Object#cancelNamedCallback cancelNamedCallback}
         * @see {@link core.Object#namedCallback namedCallback}
         * 
         * @param {string} name - The name.
         * @returns {bool} `true` if the callback is currently pending.
         */
        namedCallbackPending(name)
        {
            const cbName = this.objectId + "#" + name;
            return namedCallbacks.has(cbName);
        }

        /**
         * Cancels the given pending named callback before it gets executed.
         * 
         * @see {@link core.Object#namedCallback namedCallback}
         * @see {@link core.Object#namedCallbackPending namedCallbackPending}
         * 
         * @param {string} name - The name.
         */
        cancelNamedCallback(name)
        {
            const cbName = this.objectId + "#" + name;
            if (namedCallbacks.has(cbName))
            {
                namedCallbacks.delete(cbName);
            }
        }

        /**
         * Adds a reference to this object, which means that another object is
         * holding a reference to this object from then on. Objects are not
         * discarded while still being referenced.
         * 
         * The reference is removed automatically when the referencing object
         * gets discarded.
         * 
         * @param {core.Object} which - The referencing object.
         * @see {@link core.Object#referenceRemove referenceRemove}
         */
        referenceAdd(which)
        {
            if (which === this)
            {
                return;
            }

            /*
            console.log(this.constructor.name + "@" + this.objectLocation +
                        " is referenced by " + which.constructor.name + "@" + which.objectLocation +
                        " (" + d.get(this).referenceCount + " references)");
            */

            refsTracker.refAdd(which.objectId, this.objectId);
            //console.log(JSON.stringify(refsTracker.refHolders(this)));
            //console.log(this.objectLocation + " refs+ " + refsTracker.refsCount(this) + " vs " + d.get(this).referenceCount);

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

            which.connect("destruction", this, this.safeCallback(() =>
            {
                //console.log("Remove reference on destruction of " + this.objectLocation + " -> " + (d.get(this).referenceCount - 1));
                //console.log("referenceRemove on " + this.objectLocation + " by destruction of " + which.objectLocation);
                this.referenceRemove(which);
            }));
        }

        /**
         * Removes a reference from this object. When there are no references
         * left, the object will be discarded automatically.
         * 
         * @param {core.Object} which - The referencing object.
         * @see {@link core.Object#referenceAdd referenceAdd}
         */
        referenceRemove(which)
        {
            if (which === this)
            {
                return;
            }

            //console.log(this.objectLocation + " refs- before " + refsTracker.refsCount(this) + " vs " + d.get(this).referenceCount);
            //console.log("b4: " + JSON.stringify(refsTracker.refHolders(this)));
            refsTracker.refRemove(which.objectId, this.objectId);

            /*
            console.log(this.constructor.name + "@" + this.objectLocation +
                        " is unreferenced by " + which.constructor.name + "@" + which.objectLocation +
                        " (" + d.get(this).referenceCount + " references)");
            */

            which.disconnect("destruction", this);

            //console.log(this.objectId + " " + this.objectLocation + " unref " + refsTracker.refsCount(this) + " vs " + d.get(this).referenceCount + " " + JSON.stringify(refsTracker.refHolders(this)));
            //console.log(JSON.stringify(refsTracker.refHolders(this)));

            //if (d.get(this).referenceCount === 0)
            if (refsTracker.refsCount(this.objectId) === 0 && this.objectId > 0)
            {
                //console.log("Destroy on referenceRemove on " + this.objectLocation + ":" + this.objectId);
                //console.log("Refs -> 0 at " + this.objectId + " " + this.objectType + "@" + this.objectLocation);
                this.destroy();
            }
        }

        /**
         * Attaches a child object.
         * 
         * @private
         * @param {core.Object} child - The child to attach.
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
         * @param {core.Object} child - The child to detach.
         */
        detachChild(child)
        {
            //console.log("Detach Child: " +
            //            child.objectType + "@" + child.objectLocation + " from " +
            //            this.objectType + "@" + this.objectLocation);
            if (d.get(this).lifeCycleStatus !== "destroyed")
            {
                d.get(this).children = d.get(this).children.filter(c => c !== child);
                this.childrenChanged();
            }
        }

        /**
         * Tests if this object is an ancestor of the given object.
         * 
         * @param {core.Object} obj - The object to test.
         * @return {bool} Whether the object is an ancestor.
         */
        isAncestorOf(obj)
        {
            let p = obj.parent;
            while (p)
            {
                if (p === this)
                {
                    return true;
                }
                p = p.parent;
            }
            return false;
        }

        /**
         * Visits this object and its decendants recursively with a custom
         * function, while the function returns `true`. If the function returns
         * `false`, children are not visited.
         * 
         * @param {function} f - The visitor function. Takes the visited object as parameter and returns a boolean value.
         */
        visit(f)
        {
            if (f(this))
            {
                d.get(this).children.forEach(c => c.visit(f));
            }
        }

        /**
         * Makes the given property notifyable.
         * This adds a `<name>Changed` event to the object for watching the
         * property for changes.
         * @see {@link core.Object#connect connect}
         * 
         * @param {string} name - The name of the property.
         */
        notifyable(name)
        {
            if (! propsManager.hasProperty(this, name + "Changed"))
            {
                this.registerEvent(name + "Changed");
            }
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

            if (priv.customProperties.find(c => c === name))
            {
                priv.typeCache[name] = "property";
                return "property";
            }
            else if (propsManager.hasProperty(this, name))
            {
                if (propsManager.hasSetter(this, name))
                {
                    priv.typeCache[name] = "eventhandler";
                    return "eventhandler";
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
                const descr = Object.getOwnPropertyDescriptor(proto, name);
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
        addProperty(name, getter, setter, innate)
        {
            //console.log("register property " + this.objectType + "@" + this.objectLocation + "." + name);
            this.notifyable(name);

            const s = (v) =>
            {
                const prevV = getter();
                if (v === prevV)
                {
                    return;
                }
                if (prevV instanceof Obj && ! prevV.isAncestorOf(this))
                {
                    //console.log("referenceRemove on " + prevV.objectLocation + " by set " + name + " on " + this.objectLocation);
                    prevV.referenceRemove(this);
                }
                if (v instanceof Obj && ! v.isAncestorOf(this))
                {
                    v.referenceAdd(this);
                }
                setter(v);
                this[name + "Changed"]();
            };

            propsManager.addProperty(this, name, getter, s);
            d.get(this).customProperties.push(name);
        }

        /**
         * Makes the given property transitionable by adding a property
         * `<name>Transition` for defining a transition animation.
         * 
         * @param {string} name - The name of the property.
         * @param {function} interpolate - An optional interpolation function.
         * @see {@link core.Object#change change}
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
         * If the value is a Promise object, it will be changed when the Promise
         * resolves.
         * 
         * @param {string} name - The name of the property.
         * @param {any} newValue - The property's new value.
         * @see {@link core.Object#transitionable transitionable}
         */
        change(name, newValue)
        {
            const type = typeof newValue;
            if ((type === "string" || type === "number") && newValue === this[name])
            {
                return;
            }

            const f = (newValue) =>
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
            };

            if (type === "object" && newValue !== null && newValue.constructor.name === "Promise")
            {
                newValue
                .then(f)
                .catch(err => { console.error(err); });
            }
            else
            {
                f(newValue);
            }
        }

        /**
         * Registers the given event.
         * If `connectionMonitor` is specified, that callback will be invoked
         * whenever a connection to the event is made.
         * @see {@link core.Object#connect connect}
         * 
         * @param {string} name - The name of the event.
         * @param {function} connectionMonitor - The callback to invoke after each new connection.
         */
        registerEvent(name, connectionMonitor)
        {
            if (propsManager.hasProperty(this, name))
            {
                throw "The name " + name + " is already in use.";
            }
            //console.log("register event " + this.objectType + "@" + this.objectLocation + "." + name);

            const uname = name[0].toUpperCase() + name.substr(1);
            const onEvent = "on" + uname;

            if (propsManager.hasProperty(this, onEvent))
            {
                throw "The name " + onEvent + " is already in use.";
            }

            const s = (cb) =>
            {
                this.connect(name, this, cb);
            };

            const g = () => true;

            propsManager.addProperty(this, onEvent, g, s);

            const priv = d.get(this);
            let localRecursionDepth = 0;
            const getter = (...args) =>
            {
                if (localRecursionDepth > 3)
                {
                    this.log("", "warning", `Binding loop in ${this.constructor.name}.${name} (${this.objectLocation})`);
                    return;
                }

                ++localRecursionDepth;
                this.trigger(name, ...args);
                --localRecursionDepth;
            };

            propsManager.addProperty(this, name, () => getter, null);

            if (connectionMonitor)
            {
                priv.connectionMonitors[name] = connectionMonitor;
            }
        }

        /**
         * Connects a handler to the given event. The handler gets disconnected
         * automatically when the receiver object is discarded.
         * @see {@link core.Object#registerEvent registerEvent}
         * @see {@link core.Object#disconnect disconnect}
         * @see {@link core.Object#hasConnections hasConnections}
         * 
         * @param {string} event - The event name.
         * @param {core.Object} receiver - The receiver object that owns the handler.
         * @param {function} handler - The event handler.
         */
        connect(event, receiver, handler)
        {
            connHub.connect(this, event, receiver, handler);
            const mon = d.get(this).connectionMonitors[event];
            if (mon)
            {
                mon();
            }
        }

        /**
         * Disconnects an object from the given event.
         * @see {@link core.Object#connect connect}
         * 
         * @param {string} event - The event name.
         * @param {core.Object} receiver - The object to disconnect.
         */
        disconnect(event, receiver)
        {
            connHub.disconnect(this, event, receiver);
        }

        /**
         * Triggers the given event.
         * @private
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
         * @see {@link core.Object#connect connect}
         * 
         * @param {string} event - The name of the event.
         * @returns {bool} Whether the event has handlers connected.
         */
        hasConnections(event)
        {
            return connHub.has(this, event);
        }
        
        /**
         * Retrieves a shared resource identified by a key. If the resource did
         * not yet exist, it will be created using the supplied factory function.
         * 
         * The factory function may be omitted if you don't want to create the
         * resource at this place. In this case, this method will return `null`
         * if the resource did not exist.
         * 
         * @see {@link core.Object#freeSharedResource freeSharedResource}
         * @see {@link core.Object#awaitSharedResource awaitSharedResource}
         * 
         * @example
         * const res = this.sharedResource("mySharedResource", () =>
         * {
         *     return new BigResource();
         * });
         * 
         * @param {string} key - The resource key.
         * @param {function} [factory] - The factory function.
         * @return {any} The shared resource.
         */
        sharedResource(key, factory)
        {
            if (sharedResources.has(key))
            {
                const share = sharedResources.get(key);
                share.users.add(this);
                return share.res;
            }
            if (factory)
            {
                const res = factory();
                const share = {
                    users: new Set(),
                    res
                };
                share.users.add(this);
                sharedResources.set(key, share);

                const monitors = this.sharedResource(key + "-pending") || [];
                monitors.forEach(mon => mon());

                return res;
            }
            return null;
        }

        /**
         * Frees a shared resource identified by a key. If this was the last
         * user of the resource, it will be deleted using the supplied deleter
         * function.
         * 
         * The deleter function may be omitted if there is no special action
         * to be taken for deletion.
         * 
         * @see {@link core.Object#sharedResource sharedResource}
         * @see {@link core.Object#awaitSharedResource awaitSharedResource}
         * 
         * @example
         * this.freeSharedResource("mySharedResource", res =>
         * {
         *     res.cleanUp();
         * });
         * 
         * @param {string} key - The resource key.
         * @param {function} [deleter] - The deleter function.
         */
        freeSharedResource(key, deleter)
        {
            if (sharedResources.has(key))
            {
                const share = sharedResources.get(key);
                share.users.delete(this);
                if (share.users.size === 0)
                {
                    sharedResources.delete(key);
                    if (deleter)
                    {
                        deleter(share.res);
                    }
                }
            }
        }

        /**
         * Waits for a shared resource identified by a key to become available.
         * Once the resource is available, the given callback will be invoked.
         * If this method returns `true`, the shared resource must be created
         * first (it does not exist and this object is the first one waiting).
         * 
         * This method is useful for dealing with resources that are created
         * asynchronously.
         * 
         * @see {@link core.Object#sharedResource sharedResource}
         * @see {@link core.Object#freeSharedResource freeSharedResource}
         * 
         * @param {string} key - The resource key.
         * @param {function} callback - The callback function.
         * @returns {bool} - Whether the resource needs to be created or not.
         */
        awaitSharedResource(key, callback)
        {
            if (this.sharedResource(key))
            {
                callback();
                return false;
            }

            const pendingKey = key + "-pending";
            const monitors = this.sharedResource(pendingKey, () => []);

            if (monitors.length > 0)
            {
                monitors.push(() =>
                {
                    this.freeSharedResource(pendingKey);
                    callback();
                });
                return false;
            }
            monitors.push(() =>
            {
                this.freeSharedResource(pendingKey);
                callback();
            });

            return true;
        }

        /**
         * Accumulates the given callback function associated with a name.
         * 
         * Only the most recent one of the accumulated functions under a name
         * will be executed before the JavaScript engine finished executing its
         * current code.
         * 
         * @deprecated Use defer instead.
         * 
         * @param {function} f - The function to invoke.
         * @param {string} name - The accumulation name.
         */
        accumulateCallback(f, name)
        {
            this.wait(0).then(this.namedCallback(this.safeCallback(f), name));
        }

        /**
         * Defers the execution of the given function associated with a name.
         * 
         * Only the most recent one of the defered functions under a name
         * will be executed before the JavaScript engine finished executing its
         * current code.
         * 
         * @param {function} f - The function to invoke.
         * @param {string} name - The function name.
         */
        defer(f, name)
        {
            this.wait(0).then(this.namedCallback(f, name));
        }
        
        /**
         * Returns a Promise that resolves after a given amount of milliseconds.
         * 
         * If the milliseconds are set to `0`, the promise resolves immediately
         * after the JavaScript engine finished executing its current code,
         * without using a timer.
         * 
         * If the wait operation is given a name, it is abortable via the
         * {@link core.Object#abortWait} method. In this case, the promise
         * resolves to `false`.
         * 
         * @param {number} ms - The amount of milliseconds to wait.
         * @param {string} name - An optional name for aborting via {@link core.Object#abortWait}.
         * @returns {Promise} The Promise object.
         */
        wait(ms, name)
        {
            return new Promise((resolve, reject) =>
            {
                if (ms === 0)
                {
                    let aborted = false;
                    connHub.runAfterTrigger(this.safeCallback(() =>
                    {
                        if (name)
                        {
                            waitAborters.delete(this.objectId + "#" + name);
                        }
                        resolve(true);
                    }, () => ! aborted && this.lifeCycleStatus !== "destroyed"), true);

                    if (name)
                    {
                        waitAborters.set(this.objectId + "#" + name, () =>
                        {
                            aborted = true;
                            waitAborters.delete(this.objectId + "#" + name);
                            resolve(false);
                        });
                    }
                }
                else
                {
                    const handle = setTimeout(this.safeCallback(() =>
                    {
                        if (name)
                        {
                            waitAborters.delete(this.objectId + "#" + name);
                        }
                        resolve(true);
                    }), ms);

                    if (name)
                    {
                        waitAborters.set(this.objectId + "#" + name, () =>
                        {
                            clearTimeout(handle);
                            waitAborters.delete(this.objectId + "#" + name);
                            resolve(false);
                        });
                    }
                }
            });
        }

        /**
         * Returns a Promise that resolves after there has been any event
         * activity.
         * 
         * If the wait operation is given a name, it is abortable via the
         * {@link core.Object#abortWait} method. In this case, the promise
         * resolves to `false`.
         * 
         * @param {string} name - An optional name for aborting via {@link core.Object#abortWait}.
         * @returns {Promise} The Promise object.
         */
        waitForActivity(name)
        {
            return new Promise((resolve, reject) =>
            {
                let aborted = false;
                connHub.runAfterTrigger(this.safeCallback(() =>
                {
                    if (name)
                    {
                        waitAborters.delete(this.objectId + "#" + name);
                    }
                    resolve(true);
                }, () => ! aborted && this.lifeCycleStatus !== "destroyed"), false);

                if (name)
                {
                    waitAborters.set(this.objectId + "#" + name, () =>
                    {
                        aborted = true;
                        waitAborters.delete(this.objectId + "#" + name);
                        resolve(false);
                    });
                }
            });
        }

        /**
         * Aborts a named wait operation from {@link core.Object#wait}.
         * 
         * @param {string} name - The name of the wait operation.
         */
        abortWait(name)
        {
            const f = waitAborters.get(this.objectId + "#" + name);
            if (f)
            {
                f();
            }
        }

        /**
         * Waits in a named queue and returns a Promise that resolves to a
         * `next` function when it's the caller's turn. After the caller has
         * finished its turn, that `next` function must be invoked.
         *
         * @see {@link core.Object#clearQueue clearQueue}
         * 
         * @param {string} qName - The name of the queue.
         * @return {Promise<function>} The Promise object.
         */
        waitQueued(qName)
        {
            return taskQueues.enqueue(this.objectId + qName);
        }

        /**
         * Clears the given waiting queue.
         * 
         * @see {@link core.Object#waitQueued waitQueued}
         * 
         * @param {string} qName - The name of the queue.
         */
        clearQueue(qName)
        {
            taskQueues.clear(this.objectId + qName);
        }

        /** 
         * Imports a JavaScript or WASM module and returns a Promise that
         * resolves to the module.
         * 
         * @param {string} url - The address of the module.
         * @returns {Promise} The Promise object.
         */
        import(url, callback)
        {
            return new Promise((resolve, reject) =>
            {
                shRequire([url], mod =>
                {
                    if (mod)
                    {
                        resolve(mod);
                        if (callback) callback(mod);
                    }
                    else
                    {
                        reject("Failed to load module: " + url);
                        if (callback) callback(null);
                    }
                });
            });
        }

        /**
         * Sends a log message to the parent element if there is one.
         * Override this method to handle logging. By default, logging is not
         * handled in any way.
         * 
         * @param {string} domain - The name of the logging domain.
         * @param {string} level - The log level. One of `trace|debug|info|warning|error|fatal`
         * @param {string} message - The log message.
         */
        log(domain, level, message)
        {
            const priv = d.get(this);
            if (priv.parent && priv.parent.log)
            {
                priv.parent.log(domain, level, message);
            }
        }

        /**
         * Adds a child object to this object.
         * 
         * @param {core.Object} child - The child object.
         */
        add(child)
        {
            child.parent = this;
        }
    }
    exports.Object = Obj;

    /**
     * Generates a random UID string. The UID is unique within the Shellfish
     * environment where it was generated.
     * 
     * @memberof core
     * 
     * @return {string} The generated UID.
     */
    function generateUid()
    {
        let uid = "";
        do
        {
            uid = Math.floor(Math.random() * 16777216).toString(16) + "-" +
                  Math.floor(Math.random() * 16777216).toString(16) + "-" +
                  Math.floor(Math.random() * 16777216).toString(16);
        }
        while (generatedUids.has(uid));
        generatedUids.add(uid);

        return uid;
    }
    exports.generateUid = generateUid;

    /**
     * Formats a bytes number to a string.
     * 
     * @memberof core
     * 
     * @param {number} bytes - The bytes number to format.
     * @returns {string} The formatted string.
     */
    function formatBytes(bytes)
    {
        let size = Math.ceil(bytes / 1024);
        const units = ["K", "M", "G", "T"];

        let sizeText = "";
        for (let i = 0; i < units.length; ++i)
        {
            const unit = units[i];
            if (size < 1024)
            {
                sizeText = (i === 0 ? size : size.toFixed(1)) + unit;
                break;
            }
            size /= 1024;
        }
        return sizeText;
    }
    exports.formatBytes = formatBytes;

    function formatSeconds(seconds, detailed)
    {
        let centis = "" + Math.floor((seconds - Math.floor(seconds)) * 100);
        let t = seconds;
        const secs = Math.floor(t) % 60;
        t /= 60;
        const minutes = Math.floor(t) % 60;
        t /= 60;
        const hours = Math.floor(t);

        let h = hours.toFixed(0);
        let m = minutes.toFixed(0);
        let s = secs.toFixed(0);

        if (h.length === 1) h = "0" + h;
        if (m.length === 1) m = "0" + m;
        if (s.length === 1) s = "0" + s;
        if (centis.length === 1) centis = "0" + centis;

        if (detailed)
        {
            return (hours > 0 ? h + ":" : "") + m + ":" + s + "." + centis;
        }
        else
        {
            return (hours > 0 ? h + ":" : "") + m + ":" + s;
        }
    }
    exports.formatSeconds = formatSeconds;

    /**
     * Returns the current amount of objects of type {@link core.Object}.
     * 
     * @returns {number} The amount.
     */
    function objectCount()
    {
        return objCounter;
    }
    exports.objectCount = objectCount;

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
     * console.log(core.dumpStatus());
     * 
     * @example <caption>Dump as string (Warning: the output could become very long!)</caption>
     * console.log(JSON.stringify(core.dumpStatus()));
     * 
     * @example <caption>Setup dumping on pressing Ctrl+D in a Shui document</caption>
     * Document {
     *     onKeyDown: (ev) =>
     *     {
     *         if (ev.key === "d" && ev.ctrlKey)
     *         {
     *             console.log(core.dumpStatus());
     *             ev.accepted = true;  // this key-press was handled and should not bubble up further
     *         }
     *     }
     * }
     * 
     * @memberof core
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
                references: refsTracker.refsCount(obj.objectId),
                referenceHolders: refsTracker.refHolders(obj.objectId),
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
            const loc = obj.objectType + "@" + obj.objectLocation;
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
            //frameHandlers: low.activeFrameHandlers(),
            byId: idMap,
            byLocation: locationMap,
            byType: typeMap,
            byLifeCycleStatus: statusMap,
            byReferences: refCountMap,
            focusedNode: document.activeElement,
            namedCallbacks,
            cycles: refsTracker.cycles().map(id => idMap[id])
        };
    }
    exports.dumpStatus = dumpStatus;
});

// internal debug context for giving helpful error messages
exports.dbgctx = "<no information>";
