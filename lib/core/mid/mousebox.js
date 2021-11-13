/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

/*
Working with input can be quite tricky as there are three browser APIs which may
not all be supported at the same time.

The PointerEvent API covers mouse, pen, and (multiple) touch points and should
be the way to go on modern browers. Some versions of Firefox don't support this
API, however.

The MouseEvent API is the oldest of the APIs and supported everywhere. Touch and
pen input are mapped to mouse events if not prevented by "preventDefault()".

The TouchEvent API supports the detection of multiple touch points and must be
used where the PointerEvent API is not available for this task.
*/

"use strict";

shRequire([__dirname + "/../low.js", __dirname + "/box.js"], function (low, box)
{
    const POINTER_EVENT = !! window.PointerEvent;

    let d = new WeakMap();

    /**
     * A pointer event.
     * @typedef PointerEvent
     * @memberof mid.MouseBox
     */
    function makePointerEvent(ev, item)
    {
        let touchPoint = null;
        if (ev.touches)        
        {
            touchPoint = ev.touches[0] ? ev.touches[0] : ev.changedTouches[0];
        }

        let itemX = 0;
        let itemY = 0;
        if (item)
        {
            const bbox = item.getBoundingClientRect();
            itemX = bbox.left;
            itemY = bbox.top;
        }

        return {
            original: ev,
            accepted: false,
            pointerId: POINTER_EVENT ? ev.pointerId : 0,
            pointerType: POINTER_EVENT ? ev.pointerType : "mouse",
            x: touchPoint ? touchPoint.clientX - itemX //ev.target.getBoundingClientRect().left
                          : ev.clientX - itemX, // ev.offsetX,
            y: touchPoint ? touchPoint.clientY - itemY //ev.target.getBoundingClientRect().top
                          : ev.clientY - itemY, // ev.offsetY,
            buttons: touchPoint ? 1 : ev.buttons,
            pressure: POINTER_EVENT ? ev.pressure : 0.5,
            tiltX: POINTER_EVENT ? ev.tiltX : 0,
            tiltY: POINTER_EVENT ? ev.tiltY : 0
        };
    }

    /**
     * A wheel event.
     * @typedef WheelEvent
     * @memberof mid.MouseBox
     */
    function makeWheelEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            deltaX: ev.deltaX,
            deltaY: ev.deltaY,
            deltaZ: ev.deltaZ,
            x: ev.offsetX,
            y: ev.offsetY
        };
    }

    /**
     * A drag event. This is not related to drag-and-drop functionality.
     * @typedef DragEvent
     * @memberof mid.MouseBox
     */
    function makeDragEvent(ev, dx, dy)
    {
        return {
            original: ev,
            accepted: false,
            deltaX: dx,
            deltaY: dy,
            buttons: ev.buttons || 1
        };
    }

    /**
     * Class representing a box that accepts input from mouse, touch screen, or
     * a pen. Multitouch input is supported.
     * 
     * @extends mid.Box
     * @memberof mid
     * 
     * @property {bool} containsMouse - [readonly] Whether the mouse pointer is over the box.
     * @property {number} hoverDelay - (default: `500`) The hover delay in ms.
     * @property {bool} hovered - [readonly] Whether the mouse pointer is hovering over the box.
     *                            This is similar to `containsMouse` but has a delay.
     * @property {bool} pressed - [readonly] Whether the box is currently pressed.
     * @property {number} touchPoints - [readonly] The current amount of touch points.
     * 
     * @emits doubleClick
     * @emits drag
     * @emits dragEnd
     * @emits click
     * @emits mouseDown
     * @emits mouseMove
     * @emits mouseOut
     * @emits mouseOver
     * @emits mouseUp
     * @emits pointerDown
     * @emits pointerEnter
     * @emits pointerLeave
     * @emits pointerMove
     * @emits pointerOut
     * @emits pointerUp
     * @emits wheel
     */
    class MouseBox extends box.Box
    {
        constructor()
        {
            super();
            d.set(this, {
                containsMouse: false,
                hoverDelay: 500,
                hovered: false,
                pressed: false,
                dragging: false,
                listeners: { },
                touchPoints: [],
                passiveEvent: null,
                clickAccepted: false
            });

            const item = this.get();
            const priv = d.get(this);
            
            item.classList.add("sh-interactive");

            this.notifyable("containsMouse");
            this.notifyable("hoverDelay");
            this.notifyable("hovered");
            this.notifyable("pressed");
            this.notifyable("touchPoints");

            this.onDestruction = () =>
            {
                priv.listeners = { };
            };

            let hoverDetection = null;
            this.onContainsMouseChanged = () =>
            {
                if (priv.containsMouse)
                {
                    // start hover detection
                    if (! hoverDetection)
                    {
                        hoverDetection = setTimeout(this.safeCallback(() =>
                        {
                            priv.hovered = true;
                            this.hoveredChanged();
                            hoverDetection = null;
                        }), priv.hoverDelay);
                    }
                }
                else
                {
                    // stop hover detection and end hover status
                    if (hoverDetection)
                    {
                        clearTimeout(hoverDetection);
                        hoverDetection = null;
                    }
                    priv.hovered = false;
                    this.hoveredChanged();
                }
            };


            let haveClickDetection = false;
            let haveDragDetection = false;

            /**
             * Is triggered when the mouse enters the item.
             * @event mouseOver
             * @deprecated Use the pointer events instead.
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseOver", () => this.ensureListener("mouseover", this.mouseOver, makePointerEvent, true));
            /**
             * Is triggered when the mouse leaves the item.
             * @event mouseOut
             * @deprecated Use the pointer events instead.
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseOut", () => this.ensureListener("mouseout", this.mouseOut, makePointerEvent));
            /**
             * Is triggered when a mouse button is pressed.
             * @event mouseDown
             * @deprecated Use the pointer events instead.
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseDown", () => this.ensureListener("mousedown", this.mouseDown, makePointerEvent));
            /**
             * Is triggered when a mouse button is released.
             * @event mouseUp
             * @deprecated Use the pointer events instead.
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseUp", () => this.ensureListener("mouseup", this.mouseUp, makePointerEvent));
            /**
             * Is triggered when the mouse is being moved.
             * @event mouseMove
             * @deprecated Use the pointer events instead.
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseMove", () => this.ensureListener("mousemove", this.mouseMove, makePointerEvent));
            
            /**
             * Is triggered when a mouse button was clicked.
             * @event click
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("click", () =>
            {
                if (! haveClickDetection)
                {
                    this.setupClickDetection();
                    haveClickDetection = true;
                }
            });
            /**
             * Is triggered when a mouse button was double-clicked.
             * @event doubleClick
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("doubleClick", () =>
            {
                if (! haveClickDetection)
                {
                    this.setupClickDetection();
                    haveClickDetection = true;
                }
            });
            /**
             * Is triggered when the context menu is requested (usually upon clicking the right mouse button).
             * @event contextMenu
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("contextMenu", () => this.ensureListener("contextmenu", this.contextMenu, makePointerEvent));
            /**
             * Is triggered when the mouse wheel is rolled.
             * @event wheel
             * @param {mid.MouseBox.WheelEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("wheel", () => this.ensureListener("wheel", this.wheel, makeWheelEvent));

            // NB: Firefox might need "dom.w3c_pointer_events_dispatch_by_pointer_messages = true" set in about:config
            //     for pen recognition to work. This may cause UI freezes, though.

            /**
             * Is triggered when a pointer device enters the item.
             * @event pointerEnter
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerEnter", () => this.ensureListener(POINTER_EVENT ? "pointerenter" : "mouseenter", this.pointerEnter, makePointerEvent));
            /**
             * Is triggered when a pointer device leaves the item.
             * @event pointerOut
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerOut", () => this.ensureListener(POINTER_EVENT ? "pointerout" : "mouseout", this.pointerOut, makePointerEvent));
            /**
             * Is triggered when a pointer device gets out of reach, e.g. a pen is lifted.
             * @event pointerLeave
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerLeave", () => this.ensureListener(POINTER_EVENT ? "pointerleave" : "mouseout", this.pointerLeave, makePointerEvent));
            /**
             * Is triggered when a pointer device button is pressed.
             * @event pointerDown
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerDown", () =>
            {
                this.ensureListener(POINTER_EVENT ? "pointerdown" : "mousedown", this.pointerDown, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    this.ensureListener("touchstart", (ev) =>
                    {
                        ev.pointerType = "touch";
                        this.pointerDown(ev);
                    }, makePointerEvent);
                }
            });
            /**
             * Is triggered when a pointer device button is released.
             * @event pointerUp
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerUp", () =>
            {
                this.ensureListener(POINTER_EVENT ? "pointerup" : "mouseup", this.pointerUp, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    this.ensureListener("touchend", (ev) =>
                    {
                        ev.pointerType = "touch";
                        this.pointerUp(ev);
                    }, makePointerEvent);
                }
            });
            /**
             * Is triggered when a pointer device is being moved.
             * @event pointerMove
             * @param {mid.MouseBox.PointerEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerMove", () =>
            {
                // disable disturbing browser touch actions
                this.css("touch-action", "none");

                this.ensureListener(POINTER_EVENT ? "pointermove" : "mousemove", this.pointerMove, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    this.ensureListener("touchmove", (ev) =>
                    {
                        ev.pointerType = "touch";
                        this.pointerMove(ev);
                    }, makePointerEvent);
                }
            });

            /**
             * Is triggered when the item is being dragged.
             * @event drag
             * @param {mid.MouseBox.DragEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("drag", () =>
            {
                if (! haveDragDetection)
                {
                    item.style.touchAction = "none";
                    this.setupDragDetection();
                    haveDragDetection = true;
                }
            });

            /**
             * Is triggered when the item is finished being dragged.
             * @event dragEnd
             * @param {mid.MouseBox.DragEvent} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("dragEnd");


            // use passive event handlers for monitoring status and touch points
            if (POINTER_EVENT)
            {
                this.addHtmlEventListener(item, "pointerdown", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointer down, type " + ev.pointerType + " " + this.objectLocation);
                    priv.passiveEvent = makePointerEvent(ev, item);
                    if (ev.pointerType === "touch")
                    {
                        priv.touchPoints.push(ev);
                        this.touchPointsChanged();
                    }

                    priv.pressed = true;
                    this.pressedChanged();
                }, { passive: true });

                this.addHtmlEventListener(item, "pointerup", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointerup " + this.objectLocation);
                    if (ev.pointerType === "touch")
                    {
                        priv.touchPoints = priv.touchPoints.filter(tp => tp.pointerId !== ev.pointerId);
                        this.touchPointsChanged();
                    }

                    priv.clickAccepted = ev.sh_clickAccepted || false;

                    priv.pressed = false;
                    this.pressedChanged();

                    if (priv.clickAccepted)
                    {
                        // manually prevent the click from bubbling up,
                        // while the pointerup shall bubble up
                        ev.sh_clickAccepted = true;
                    }
                }, { passive: true });

                this.addHtmlEventListener(item, "pointermove", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointermove " + this.objectLocation);
                    if (ev.pointerType === "touch" && priv.touchPoints.length > 0)
                    {
                        priv.touchPoints = priv.touchPoints.filter(tp => tp.pointerId !== ev.pointerId);
                        priv.touchPoints.push(ev);
                    }
                }, { passive: true });

                this.addHtmlEventListener(item, "pointerenter", () =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointerenter " + this.objectLocation);
                    priv.containsMouse = true;
                    this.containsMouseChanged();
                }, { passive: true });

                this.addHtmlEventListener(item, "pointerover", () =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointerover " + this.objectLocation);
                    priv.containsMouse = true;
                    this.containsMouseChanged();
                }, { passive: true });

                this.addHtmlEventListener(item, "pointerout", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointerout " + this.objectLocation + " " + ev.buttons);
                    
                    if (ev.pointerType === "touch")
                    {
                        //priv.passiveEvent = null;

                        priv.touchPoints = priv.touchPoints.filter(tp => tp.pointerId !== ev.pointerId);
                        this.touchPointsChanged();
                    }

                    /*
                    priv.containsMouse = false;
                    this.containsMouseChanged();

                    priv.pressed = ev.buttons !== 0;
                    this.pressedChanged();
                    */
                }, { passive: true });

                this.addHtmlEventListener(item, "pointerleave", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointerleave " + this.objectLocation);
                    priv.passiveEvent = null;

                    if (ev.pointerType === "touch")
                    {
                        priv.touchPoints = priv.touchPoints.filter(tp => tp.pointerId !== ev.pointerId);
                        this.touchPointsChanged();
                    }

                    priv.containsMouse = false;
                    this.containsMouseChanged();

                    priv.pressed = false;
                    this.pressedChanged();
                }, { passive: true });

                this.addHtmlEventListener(item, "pointercancel", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive pointercancel " + this.objectLocation);
                    priv.passiveEvent = null;

                    if (ev.pointerType === "touch")
                    {
                        priv.touchPoints = priv.touchPoints.filter(tp => tp.pointerId !== ev.pointerId);
                        this.touchPointsChanged();
                    }

                    priv.containsMouse = false;
                    this.containsMouseChanged();

                    priv.pressed = false;
                    this.pressedChanged();
                }, { passive: true });
            }
            else
            {
                let legacyPointerType = "mouse";

                this.addHtmlEventListener(item, "mousedown", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive mousedown " + this.objectLocation);

                    if (legacyPointerType === "mouse")
                    {
                        legacyPointerType = "mouse";
                        priv.passiveEvent = makePointerEvent(ev, item);
                        priv.pressed = true;
                        this.pressedChanged();
                    }
                }, { passive: true });

                this.addHtmlEventListener(item, "mouseup", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive mouseup " + this.objectLocation);

                    if (legacyPointerType === "mouse")
                    {
                        priv.clickAccepted = ev.sh_clickAccepted || false;;

                        priv.pressed = false;
                        this.pressedChanged();

                        if (priv.clickAccepted)
                        {
                            // manually prevent the click from bubbling up,
                            // while the mouseup shall bubble up
                            ev.sh_clickAccepted = true;
                        }
                    }
                }, { passive: true });

                this.addHtmlEventListener(item, "mouseover", () =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive mouseover " + this.objectLocation);

                    if (legacyPointerType === "mouse")
                    {
                        priv.containsMouse = true;
                        this.containsMouseChanged();
                    }
                }, { passive: true });
                
                this.addHtmlEventListener(item, "mouseout", () =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive mouseout " + this.objectLocation);

                    if (legacyPointerType === "mouse")
                    {
                        priv.containsMouse = false;
                        this.containsMouseChanged();
                    }
                }, { passive: true });

                this.addHtmlEventListener(item, "touchstart", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    //console.log("passive touch down");
                    legacyPointerType = "touch";
                    priv.passiveEvent = makePointerEvent(ev, item);

                    priv.containsMouse = true;
                    this.containsMouseChanged();

                    priv.pressed = true;
                    this.pressedChanged();

                    priv.touchPoints = [];
                    for (let i = 0; i < ev.touches.length; ++i)
                    {
                        const tp = ev.touches[i];
                        priv.touchPoints.push({
                            clientX: tp.clientX,
                            clientY: tp.clientY,
                            pointerId: tp.identifier
                        });
                    }
                    this.touchPointsChanged();
                }, { passive: true });

                this.addHtmlEventListener(item, "touchmove", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    priv.touchPoints = [];
                    for (let i = 0; i < ev.touches.length; ++i)
                    {
                        const tp = ev.touches[i];
                        priv.touchPoints.push({
                            clientX: tp.clientX,
                            clientY: tp.clientY,
                            pointerId: tp.identifier
                        });
                    }      
                }, { passive: true });

                this.addHtmlEventListener(item, "touchend", (ev) =>
                {
                    if (priv.dragging)
                    {
                        return;
                    }

                    priv.touchPoints = [];
                    for (let i = 0; i < ev.touches.length; ++i)
                    {
                        const tp = ev.touches[i];
                        priv.touchPoints.push({
                            clientX: tp.clientX,
                            clientY: tp.clientY,
                            pointerId: tp.identifier
                        });
                    }
                    this.touchPointsChanged();

                    priv.containsMouse = false;
                    this.containsMouseChanged();

                    priv.clickAccepted = ev.sh_clickAccepted || false;

                    priv.pressed = false;
                    this.pressedChanged();

                    if (priv.clickAccepted)
                    {
                        // manually prevent the click from bubbling up,
                        // while the touchend shall bubble up
                        ev.sh_clickAccepted = true;
                    }
                }, { passive: true });
            }
        }

        get containsMouse() { return d.get(this).containsMouse; }
        get hovered() { return d.get(this).hovered; }
        get pressed() { return d.get(this).pressed; }
        get touchPoints() { return d.get(this).touchPoints.length; }

        get hoverDelay() { return d.get(this).hoverDelay; }
        set hoverDelay(n)
        {
            d.get(this).hoverDelay = n;
            this.hoverDelayChanged();
        }

        ensureListener(name, handler, makeEvent)
        {
            const priv = d.get(this);
            if (! priv.listeners[name])
            {
                const item = this.get();

                const h = (ev) =>
                {
                    //console.log("Event: " + name);
                    const e = makeEvent(ev, item);
                    handler(e);
                    if (e.accepted)
                    {
                        ev.stopPropagation();
                    }
                    ev.preventDefault();
                };

                this.addHtmlEventListener(item, name, h, false);
                priv.listeners[name] = h;
            }
        }

        setupClickDetection()
        {
            const priv = d.get(this);
            let clicks = 0;
            let prevEventTime = 0;
            let pressedState = false;

            this.onPressedChanged = () =>
            {
                if (this.pressed === pressedState)
                {
                    return;
                }
                pressedState = this.pressed;

                const now = Date.now();

                if (this.pressed)
                {
                    if (now - prevEventTime > 300)
                    {
                        clicks = 0;
                    }
                    prevEventTime = now;
                }
                else if (! priv.clickAccepted /* was accepted by an above element already */)
                {
                    if (now - prevEventTime > 300)
                    {
                        clicks = 0;
                    }
                    else
                    {
                        ++clicks;
                    }
                    
                    const ev = priv.passiveEvent;
                    if (ev)
                    {
                        if (clicks === 1)
                        {
                            this.click(ev);
                        }
                        else if (clicks === 2)
                        {
                            this.doubleClick(ev);
                            clicks = 0;
                        }
                        priv.clickAccepted = ev.accepted;
                    }

                    prevEventTime = now;
                }
            };
        }

        setupDragDetection()
        {
            const item = this.get();
            const priv = d.get(this);

            let originX = 0;
            let originY = 0;
            let pending = false;
            let pendingDx = 0;
            let pendingDy = 0;

            const drag = (event) =>
            {                
                event.stopPropagation();
                event.preventDefault();

                const dx = event.clientX - originX;
                const dy = event.clientY - originY;
                pendingDx += dx;
                pendingDy += dy;

                if (! pending)
                {
                    pending = true;
                    const handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        pending = false;
                        
                        if (priv.dragging)
                        {
                            const e = makeDragEvent(event, pendingDx, pendingDy);
                            this.drag(e);
                            pendingDx = 0;
                            pendingDy = 0;
                        }
                    }, this.objectType + "@" + this.objectLocation);
                }

                originX = event.clientX;
                originY = event.clientY;  
            };

            const touchDrag = (event) =>
            {
                event.stopPropagation();
                event.preventDefault();

                const dx = event.touches[0].clientX - originX;
                const dy = event.touches[0].clientY - originY;
                pendingDx += dx;
                pendingDy += dy;

                if (! pending)
                {
                    pending = true;
                    const handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        pending = false;
                        
                        if (priv.dragging)
                        {
                            const e = makeDragEvent(event, pendingDx, pendingDy);
                            this.drag(e);
                            pendingDx = 0;
                            pendingDy = 0;
                        }
                    }, this.objectType + "@" + this.objectLocation);
                }

                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;
            };

            const stopDrag = (event) =>
            {
                window.removeEventListener(POINTER_EVENT ? "pointermove" : "mousemove", drag, true);
                window.removeEventListener(POINTER_EVENT ? "pointerup" : "mouseup", stopDrag, true);
                
                priv.containsMouse = false;
                this.containsMouseChanged();

                priv.clickAccepted = false;

                priv.pressed = false;
                this.pressedChanged();

                priv.dragging = false;
                this.dragEnd();

                event.stopPropagation();
                event.preventDefault();
            };

            const stopTouchDrag = (event) =>
            {
                window.removeEventListener("touchmove", touchDrag, true);
                window.removeEventListener("touchend", stopTouchDrag, true);
                
                priv.containsMouse = false;
                this.containsMouseChanged();

                prev.clickAccepted = false;

                priv.pressed = false;
                this.pressedChanged();

                priv.dragging = false;
                this.dragEnd();

                event.stopPropagation();
                event.preventDefault();
            };

            const startDrag = (event) =>
            {
                originX = event.clientX;
                originY = event.clientY;
                const e = makeDragEvent(event, 0, 0);
                this.drag(e);
                
                if (e.accepted)
                {
                    priv.dragging = true;

                    window.addEventListener(POINTER_EVENT ? "pointermove" : "mousemove", drag, true);
                    window.addEventListener(POINTER_EVENT ? "pointerup" : "mouseup", stopDrag, true);

                    event.stopPropagation();
                    event.preventDefault();
                }
            };
            
            const startTouchDrag = (event) =>
            {                               
                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;

                const e = makeDragEvent(event, 0, 0);
                this.drag(e);
                if (e.accepted)
                {
                    priv.dragging = true;

                    window.addEventListener("touchmove", touchDrag, true);
                    window.addEventListener("touchend", stopTouchDrag, true);
    
                    event.stopPropagation();
                    // don't synthesize mouse events
                    event.preventDefault();
                }
            };

            this.addHtmlEventListener(item, POINTER_EVENT ? "pointerdown" : "mousedown", startDrag, false);
            priv.listeners["pointerdown-drag"] = startDrag;
            
            if (! POINTER_EVENT)
            {
                this.addHtmlEventListener(item, "touchstart", startTouchDrag, false);
                priv.listeners["touchstart-drag"] = startTouchDrag;
            }
        }

        /**
         * Returns the n-th touch point.
         * 
         * @param {number} n - The index of the touch point to return.
         * @return {object} The touch point, or `null` if the touch point does not exist.
         */
        touchPoint(n)
        {
            if (n >= 0 && n < d.get(this).touchPoints.length)
            {
                const tp = d.get(this).touchPoints[n];
                return {
                    id: tp.pointerId,
                    x: tp.clientX - this.bbox.x,
                    y: tp.clientY - this.bbox.y
                };
            }
            else
            {
                return null;
            }
        }
    }
    exports.MouseBox = MouseBox;

});