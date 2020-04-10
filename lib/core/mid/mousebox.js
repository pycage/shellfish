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
            dx: dx,
            dy: dy
        };
    }

    /* Class representing a box with mouse input.
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

            this.registerEvent("mouseOver", () => ensureListener("mouseover", this.mouseOver, makeMouseEvent));
            this.registerEvent("mouseOut", () => ensureListener("mouseout", this.mouseOut, makeMouseEvent));
            this.registerEvent("mouseDown", () => ensureListener("mousedown", this.mouseDown, makeMouseEvent));
            this.registerEvent("mouseUp", () => ensureListener("mouseup", this.mouseUp, makeMouseEvent));
            this.registerEvent("mouseMove", () => ensureListener("mousemove", this.mouseMove, makeMouseEvent));
            
            this.registerEvent("click", () => ensureListener("click", this.click, makeMouseEvent));
            this.registerEvent("doubleClick", () => ensureListener("dblclick", this.doubleClick, makeMouseEvent));
            this.registerEvent("contextMenu", () => ensureListener("contextmenu", this.contextMenu, makeMouseEvent));
            this.registerEvent("wheel", () => ensureListener("wheel", this.wheel, makeWheelEvent));

            // NB: Firefox might need "dom.w3c_pointer_events_dispatch_by_pointer_messages = true" set in about:config
            //     for pen recognition to work.

            this.registerEvent("pointerOver", () => ensureListener("pointerover", this.pointerOver, makePointerEvent));
            this.registerEvent("pointerOut", () => ensureListener("pointerout", this.pointerOut, makePointerEvent));
            this.registerEvent("pointerLeave", () => ensureListener("pointerleave", this.pointerLeave, makePointerEvent));
            this.registerEvent("pointerDown", () => ensureListener("pointerdown", this.pointerDown, makePointerEvent));
            this.registerEvent("pointerUp", () => ensureListener("pointerup", this.pointerUp, makePointerEvent));
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

                let dx = event.touches[0].screenX - originX;
                let dy = event.touches[0].screenY - originY;
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

                originX = event.touches[0].screenX;
                originY = event.touches[0].screenY;
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
                originX = event.touches[0].screenX;
                originY = event.touches[0].screenY;
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
        }

        get containsMouse() { return d.get(this).containsMouse; }
        get touched() { return d.get(this).touched; }
    };

});