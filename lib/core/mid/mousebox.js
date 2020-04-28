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
            pointerType: ev.pointerType,
            x: ev.offsetX,
            y: ev.offsetY,
            buttons: ev.buttons,
            pressure: ev.pressure,
            tiltX: ev.tiltX,
            tiltY: ev.tiltY
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
            //item.style.touchAction = "none";

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
            this.registerEvent("mouseOver", () => ensureListener("mouseover", this.mouseOver, makeMouseEvent));
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
            this.registerEvent("pointerOver", () => ensureListener("pointerover", this.pointerOver, makePointerEvent));
            /**
             * Is triggered when a pointer device leaves the item.
             * @event pointerOut
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerOut", () => ensureListener("pointerout", this.pointerOut, makePointerEvent));
            /**
             * Is triggered when a pointer device gets out of reach, e.g. a pen is lifted.
             * @event pointerLeave
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerLeave", () => ensureListener("pointerleave", this.pointerLeave, makePointerEvent));
            /**
             * Is triggered when a pointer device button is pressed.
             * @event pointerDown
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerDown", () => ensureListener("pointerdown", this.pointerDown, makePointerEvent));
            /**
             * Is triggered when a pointer device button is released.
             * @event pointerUp
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerUp", () => ensureListener("pointerup", this.pointerUp, makePointerEvent));
            /**
             * Is triggered when a pointer device is being moved.
             * @event pointerMove
             * @param {object} event - The event object.
             * @memberof mid.MouseBox
             */
            this.registerEvent("pointerMove", () => ensureListener("pointermove", this.pointerMove, makePointerEvent));

            let that = this;
            let originX = 0;
            let originY = 0;
            let pending = false;
            let pendingDx = 0;
            let pendingDy = 0;
            let touchIsClick = false;

            let drag = (event) =>
            {                
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
                        if (e.accepted)
                        {
                            event.stopPropagation();
                            event.preventDefault();
                        }
                        pendingDx = 0;
                        pendingDy = 0;
                    });
                }

                originX = event.clientX;
                originY = event.clientY;  
            };

            let touchDrag = (event) =>
            {
                //event.stopPropagation();

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
                        
                        if (Math.abs(pendingDx) > 10 || Math.abs(pendingDy) > 10)
                        {
                            //console.log(pendingDx + ", " + pendingDy);
                            touchIsClick = false;
                        }

                        const e = makeDragEvent(event, pendingDx, pendingDy);
                        that.drag(e);
                        if (e.accepted)
                        {
                            event.stopPropagation();
                            event.preventDefault();
                        }
                        pendingDx = 0;
                        pendingDy = 0;
                    });
                }

                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;
            };

            let stopDrag = (event) =>
            {
                window.removeEventListener("mousemove", drag, false);
                window.removeEventListener("mouseup", stopDrag, false);

                that.dragEnd();
            };

            let stopTouchDrag = (event) =>
            {
                //event.stopPropagation();
                //event.preventDefault();

                window.removeEventListener("touchmove", touchDrag, false);
                window.removeEventListener("touchend", stopTouchDrag, false);

                that.dragEnd();

                /*
                if (touchIsClick)
                {
                    that.click(event);
                }
                */
            };

            let startDrag = (event) =>
            {
                originX = event.clientX;
                originY = event.clientY;
                window.addEventListener("mousemove", drag, { capture: false });
                window.addEventListener("mouseup", stopDrag, { capture: false });

                const e = makeDragEvent(event, 0, 0);
                that.drag(e);
                if (e.accepted)
                {
                    event.stopPropagation();
                    event.preventDefault();
                }
            };
            
            let startTouchDrag = (event) =>
            {                               
                originX = event.touches[0].clientX;
                originY = event.touches[0].clientY;
                touchIsClick = true;
                window.addEventListener("touchmove", touchDrag, { capture: false, passive: true });
                window.addEventListener("touchend", stopTouchDrag, { capture: false });

                const e = makeDragEvent(event, 0, 0);
                that.drag(e);
                if (e.accepted)
                {
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
                if (! listeners["mousedown-drag"])
                {
                    item.addEventListener("mousedown", startDrag, false);
                    listeners["mousedown-drag"] = startDrag;
                }

                if (! listeners["touchstart-drag"])
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

            item.addEventListener("pointerleave", () =>
            {
                d.get(that).touched = false;
                that.touchedChanged();
                d.get(that).containsMouse = false;
                that.containsMouseChanged();
            }, { passive: true });

            item.addEventListener("pointercancel", () =>
            {
                d.get(that).touched = false;
                that.touchedChanged();
                d.get(that).containsMouse = false;
                that.containsMouseChanged();
            }, { passive: true });
        }

        get containsMouse() { return d.get(this).containsMouse; }
        get touched() { return d.get(this).touched; }
    };

});