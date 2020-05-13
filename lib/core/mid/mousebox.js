/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/../low.js", __dirname + "/box.js"], function (low, box)
{
    const POINTER_EVENT = !! window.PointerEvent;

    let d = new WeakMap();

    function makeMouseEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            x: ev.offsetX,
            y: ev.offsetY,
            buttons: ev.buttons
        };
    }

    function makePointerEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            pointerType: POINTER_EVENT ? ev.pointerType : "mouse",
            x: ev.touches ? ev.touches[0].clientX - ev.target.getBoundingClientRect().left : ev.offsetX,
            y: ev.touches ? ev.touches[0].clientY - ev.target.getBoundingClientRect().top : ev.offsetY,
            buttons: ev.touches ? 1 : ev.buttons,
            pressure: POINTER_EVENT ? ev.pressure : 0.5,
            tiltX: POINTER_EVENT ? ev.tiltX : 0,
            tiltY: POINTER_EVENT ? ev.tiltY : 0
        };
    }

    function makeWheelEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            deltaX: ev.deltaX,
            deltaY: ev.deltaY,
            deltaZ: ev.deltaZ
        };
    }

    function makeDragEvent(ev, dx, dy)
    {
        return {
            original: ev,
            accepted: false,
            deltaX: dx,
            deltaY: dy
        };
    }

    /**
     * Class representing a box with mouse input.
     * @extends mid.Box
     * @memberof mid
     * 
     * @property {bool} containsMouse - [readonly] Whether the mouse pointer is over the box.
     * @property {bool} touched - [readonly] Whether the box is currently touched on a touch screen.
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
     * @emits pointerLeave
     * @emits pointerMove
     * @emits pointerOut
     * @emits pointerOver
     * @emits pointerUp
     * @emits wheel
     */
    exports.MouseBox = class MouseBox extends box.Box
    {
        constructor()
        {
            super();
            d.set(this, {
                containsMouse: false,
                touched: false
            });

            const item = this.get();
            item.style.touchAction = "none";

            let listeners = { };

            const ensureListener = (name, handler, makeEvent) =>
            {
                if (! listeners[name])
                {
                    const h = (ev) =>
                    {
                        const e = makeEvent(ev);
                        handler(e);
                        if (e.accepted)
                        {
                            ev.stopPropagation();
                            ev.preventDefault();
                        }
                    };
                    item.addEventListener(name, h, false);
                    listeners[name] = h;
                }
            };

            this.notifyable("containsMouse");
            this.notifyable("touched");

            /**
             * Is triggered when the mouse enters the item.
             * @event mouseOver
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseOver", () => ensureListener("mouseover", this.mouseOver, makeMouseEvent, true));
            /**
             * Is triggered when the mouse leaves the item.
             * @event mouseOut
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseOut", () => ensureListener("mouseout", this.mouseOut, makeMouseEvent));
            /**
             * Is triggered when a mouse button is pressed.
             * @event mouseDown
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseDown", () => ensureListener("mousedown", this.mouseDown, makeMouseEvent));
            /**
             * Is triggered when a mouse button is released.
             * @event mouseUp
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseUp", () => ensureListener("mouseup", this.mouseUp, makeMouseEvent));
            /**
             * Is triggered when the mouse is being moved.
             * @event mouseMove
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("mouseMove", () => ensureListener("mousemove", this.mouseMove, makeMouseEvent));
            
            /**
             * Is triggered when a mouse button was clicked.
             * @event click
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("click", () => ensureListener("click", this.click, makeMouseEvent));
            /**
             * Is triggered when a mouse button was double-clicked.
             * @event doubleClick
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("doubleClick", () => ensureListener("dblclick", this.doubleClick, makeMouseEvent));
            /**
             * Is triggered when the context menu is requested (usually upon clicking the right mouse button).
             * @event contextMenu
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("contextMenu", () => ensureListener("contextmenu", this.contextMenu, makeMouseEvent));
            /**
             * Is triggered when the mouse wheel is rolled.
             * @event wheel
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("wheel", () => ensureListener("wheel", this.wheel, makeWheelEvent));

            // NB: Firefox might need "dom.w3c_pointer_events_dispatch_by_pointer_messages = true" set in about:config
            //     for pen recognition to work. This may cause UI freezes, though.

            /**
             * Is triggered when a pointer device enters the item.
             * @event pointerOver
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerOver", () => ensureListener(POINTER_EVENT ? "pointerover" : "mouseover", this.pointerOver, makePointerEvent));
            /**
             * Is triggered when a pointer device leaves the item.
             * @event pointerOut
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerOut", () => ensureListener(POINTER_EVENT ? "pointerout" : "mouseout", this.pointerOut, makePointerEvent));
            /**
             * Is triggered when a pointer device gets out of reach, e.g. a pen is lifted.
             * @event pointerLeave
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerLeave", () => ensureListener(POINTER_EVENT ? "pointerleave" : "mouseout", this.pointerLeave, makePointerEvent));
            /**
             * Is triggered when a pointer device button is pressed.
             * @event pointerDown
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerDown", () =>
            {
                ensureListener(POINTER_EVENT ? "pointerdown" : "mousedown", this.pointerDown, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    ensureListener("touchstart", this.pointerDown, makePointerEvent);
                }
            });
            /**
             * Is triggered when a pointer device button is released.
             * @event pointerUp
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerUp", () => {
                ensureListener(POINTER_EVENT ? "pointerup" : "mouseup", this.pointerUp, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    ensureListener("touchend", this.pointerUp, makePointerEvent);
                }
            });
            /**
             * Is triggered when a pointer device is being moved.
             * @event pointerMove
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerMove", () =>
            {
                ensureListener(POINTER_EVENT ? "pointermove" : "mousemove", this.pointerMove, makePointerEvent);
                if (! POINTER_EVENT)
                {
                    ensureListener("touchmove", this.pointerMove, makePointerEvent);   
                }
            });

            let that = this;
            let originX = 0;
            let originY = 0;
            let pending = false;
            let pendingDx = 0;
            let pendingDy = 0;

            let drag = (event) =>
            {                
                console.log("drag on " + event.currentTarget);
                event.stopPropagation();
                event.preventDefault();
                let dx = event.clientX - originX;
                let dy = event.clientY - originY;
                pendingDx += dx;
                pendingDy += dy;

                if (! pending)
                {
                    pending = true;
                    var handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        pending = false;
                        
                        const e = makeDragEvent(event, pendingDx, pendingDy);
                        that.drag(e);
                        pendingDx = 0;
                        pendingDy = 0;
                    });
                }

                originX = event.clientX;
                originY = event.clientY;  
            };

            let touchDrag = (event) =>
            {
                event.stopPropagation();
                event.preventDefault();
                let dx = event.touches[0].clientX - originX;
                let dy = event.touches[0].clientY - originY;
                pendingDx += dx;
                pendingDy += dy;

                if (! pending)
                {
                    pending = true;
                    var handle = low.addFrameHandler(() =>
                    {
                        handle.cancel();
                        pending = false;
                        
                        const e = makeDragEvent(event, pendingDx, pendingDy);
                        that.drag(e);
                        pendingDx = 0;
                        pendingDy = 0;
                    });
                }

                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;
            };

            let stopDrag = (event) =>
            {
                window.removeEventListener(POINTER_EVENT ? "pointermove" : "mousemove", drag, true);
                window.removeEventListener(POINTER_EVENT ? "pointerup" : "mouseup", stopDrag, true);

                that.dragEnd();
            };

            let stopTouchDrag = (event) =>
            {
                window.removeEventListener("touchmove", touchDrag, true);
                window.removeEventListener("touchend", stopTouchDrag, true);

                that.dragEnd();
            };

            let startDrag = (event) =>
            {
                originX = event.clientX;
                originY = event.clientY;
                const e = makeDragEvent(event, 0, 0);
                that.drag(e);
                
                if (e.accepted)
                {
                    window.addEventListener(POINTER_EVENT ? "pointermove" : "mousemove", drag, true);
                    window.addEventListener(POINTER_EVENT ? "pointerup" : "mouseup", stopDrag, true);
    
                    event.stopPropagation();
                    event.preventDefault();
                }
            };
            
            let startTouchDrag = (event) =>
            {                               
                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;

                const e = makeDragEvent(event, 0, 0);
                that.drag(e);
                if (e.accepted)
                {
                    window.addEventListener("touchmove", touchDrag, { capture: true, passive: true });
                    window.addEventListener("touchend", stopTouchDrag, { capture: true });
    
                    event.stopPropagation();
                    event.preventDefault();
                }
            };

            /**
             * Is triggered when the item is being dragged.
             * @event drag
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("drag", () =>
            {
                if (! listeners["pointerdown-drag"])
                {
                    item.addEventListener(POINTER_EVENT ? "pointerdown" : "mousedown", startDrag, false);
                    listeners["pointerdown-drag"] = startDrag;
                }

                if (! POINTER_EVENT && ! listeners["touchstart-drag"])
                {
                    item.addEventListener("touchstart", startTouchDrag, { passive: true });
                    listeners["touchstart-drag"] = startTouchDrag;
                }
            });

            /**
             * Is triggered when the item is finished being dragged.
             * @event dragEnd
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("dragEnd");

            if (POINTER_EVENT)
            {
                item.addEventListener("pointerover", (ev) =>
                {
                    if (ev.pointerType === "mouse")
                    {
                        d.get(that).containsMouse = true;
                        that.containsMouseChanged();
                    }
                    else if (ev.pointerType === "touch")
                    {
                        d.get(that).touched = true;
                        that.touchedChanged();
                    }
                }, { passive: true });

                item.addEventListener("pointerout", () =>
                {
                    d.get(that).containsMouse = false;
                    that.containsMouseChanged();

                    d.get(that).touched = false;
                    that.touchedChanged();
                }, { passive: true });

                item.addEventListener("pointerleave", () =>
                {
                    d.get(that).containsMouse = false;
                    that.containsMouseChanged();

                    d.get(that).touched = false;
                    that.touchedChanged();
                }, { passive: true });

                item.addEventListener("pointercancel", () =>
                {
                    d.get(that).containsMouse = false;
                    that.containsMouseChanged();

                    d.get(that).touched = false;
                    that.touchedChanged();
                }, { passive: true });
            }
            else
            {
                item.addEventListener("mouseover", () =>
                {
                    d.get(that).containsMouse = true;
                    that.containsMouseChanged();
                }, { passive: true });
                
                item.addEventListener("mouseout", () =>
                {
                    d.get(that).containsMouse = false;
                    that.containsMouseChanged();
                }, { passive: true });

                item.addEventListener("touchstart", () =>
                {
                    d.get(that).touched = true;
                    that.touchedChanged();
                }, { passive: true });

                item.addEventListener("touchend", () =>
                {
                    d.get(that).touched = false;
                    that.touchedChanged();
                    d.get(that).containsMouse = false;
                    that.containsMouseChanged();
                }, { passive: true });
            }
        }

        get containsMouse() { return d.get(this).containsMouse; }
        get touched() { return d.get(this).touched; }
    };

});