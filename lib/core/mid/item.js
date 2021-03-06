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

shRequire([__dirname + "/../low.js",
           __dirname + "/object.js",
           __dirname + "/util/matrix.js",
           __dirname + "/util/vec.js"], (low, obj, mat, vec) =>
{
    function makeKeyEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            key: ev.key,
            char: ev.char,
            altKey: ev.altKey,
            ctrlKey: ev.ctrlKey,
            metaKey: ev.metaKey,
            shiftKey: ev.shiftKey,
            location: ev.location,
            repeat: ev.repeat
        };
    }


    const d = new WeakMap();

    let sizingCalculationsFrozen = false;

    /**
     * Base class representing a visual mid-level object.
     * @extends mid.Object
     * @memberof mid
     * 
     * @property {bool} ancestorsEnabled - [readonly] Whether all ancestors are enabled.
     * @property {bool} ancestorsVisible - [readonly] Whether all ancestors are visible.
     * @property {object} bbox - [readonly] The item's bounding box in window coordinates `{ x, y, width, height }`.
     * @property {bool} canFocus - (default: `false`) Whether the item may accept keyboard focus.
     * @property {number} contentHeight - [readonly] The current scrolling viewport height.
     * @property {number} contentWidth - [readonly] The current scrolling viewport width.
     * @property {number} contentX - (default: `0`) The current horizontal scrolling position.
     * @property {number} contentY - (default: `0`) The current vertical scrolling position.
     * @property {string} cursor - The mouse cursor shape over the item.
     * @property {bool} enabled - (default: `true`) Whether the item accepts user input.
     * @property {bool} fillHeight - (default: `false`) Whether to fill the parent's height in "free" and "global" position mode. Ignores the "height" parameter.
     * @property {bool} fillWidth - (default: `false`) Whether to fill the parent's width. Ignores the "width" parameter.
     * @property {bool} focus - (default: `false`) Whether the item has the keyboard focus. Setting this will move the focus to the item.
     * @property {number} height - (default: `-1`) The nominal height. Set to -1 for auto-height.
     * @property {number} marginBottom - (default: `0`) The bottom margin's width.
     * @property {number} marginLeft - (default: `0`) The left margin's width.
     * @property {number} marginRight - (default: `0`) The right margin's width.
     * @property {number} marginTop - (default: `0`) The top margin's width.
     * @property {number} minHeight - (default: `0`) The item's minimum height. It will not shrink further.
     * @property {number} minWidth - (default: `0`) The item's minimum width. It will not shrink further.
     * @property {number} opacity - (default: `1`) The item's opacity between 0 (invisible) and 1 (fully opaque).
     * @property {string} origin - (default: `"top-left"`) The corner of the coordinates origin in "free" and "global" position mode: `top-left|top-right|bottom-right|bottom-left`
     * @property {number} perspective - (default: `1000`) The distance of the viewer to the z = 0 plane for rotations in 3-dimensional space. Use `0` to disable perspective projection.
     * @property {string} position - (default: `"inline"`) The positioning mode: `inline|free|global`
     * @property {number} rotationAngle - (default: `0`) The rotation angle in degrees.
     * @property {vec3} rotationAxis - (default: `vec3(0, 1, 0)`) The rotation axis. Rotations are counter-clockwise.
     * @property {mid.Ruler} ruler - (default: `null`) The ruler object to use.
     * @property {string[]} style - (default: `[]`) A list of custom CSS class names.
     * @property {bool} visible - (default: `true`) Whether the item is visible. To check if the item is really
     *                                              visible, you also have to check for `ancestorsVisible`.
     * @property {number} width -  (default: `-1`) The nominal width. Set to -1 for auto-width.
     * @property {number} x - (default: `0`) The X coordinate value.
     * @property {number} y - (default: `0`) The Y coordinate value.
     */
    exports.Item = class Item extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                inSizeUpdate: false,
                mayUpdateSize: false,
                prevBbox: { x: 0, y: 0, width: 0, height: 0 },
                cachedBbox: null,
                // cache for accumulating CSS operations while the item is not shown;
                // will be null while the item is shown and the cache not in use
                cssCache: { },
                // cache for live CSS values to avoid setting the same value twice
                cssLiveCache: { },
                visible: true,
                enabled: true,
                cursor: "undefined",
                width: -1,
                height: -1,
                minWidth: 0,
                minHeight: 0,
                fillWidth: false,
                fillHeight: false,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                perspective: 1000,
                position: "inline",
                origin: "top-left",
                canFocus: false,
                hasFocus: false,
                trapFocus: false,
                x: 0,
                y: 0,
                opacity: 1,
                rotationAxis: this.vec3(0, 0, 1),
                rotationAngle: 0,
                rotationQuaternion: [0, 0, 0, 0],
                style: []
            });
            
            this.notifyable("ancestorsEnabled");
            this.notifyable("ancestorsVisible");
            this.notifyable("bbox");
            this.notifyable("canFocus");
            this.notifyable("contentHeight");
            this.notifyable("contentWidth");
            this.notifyable("contentX");
            this.notifyable("contentY");
            this.notifyable("cursor");
            this.notifyable("enabled");
            this.notifyable("fillHeight");
            this.notifyable("fillWidth");
            this.notifyable("focus");
            this.notifyable("height");
            this.notifyable("marginBottom");
            this.notifyable("marginLeft");
            this.notifyable("marginRight");
            this.notifyable("marginTop");
            this.notifyable("minHeight");
            this.notifyable("minWidth");
            this.notifyable("opacity");
            this.notifyable("origin");
            this.notifyable("perspective");
            this.notifyable("position");
            this.notifyable("rotationAxis");
            this.notifyable("rotationAngle");
            this.notifyable("style");
            this.notifyable("trapFocus");
            this.notifyable("visible");
            this.notifyable("width");
            this.notifyable("x");
            this.notifyable("y");

            this.transitionable("contentX");
            this.transitionable("contentY");
            this.transitionable("height");
            this.transitionable("marginBottom");
            this.transitionable("marginLeft");
            this.transitionable("marginRight");
            this.transitionable("marginTop");
            this.transitionable("opacity");
            this.transitionable("perspective");
            this.transitionable("rotationAngle");
            this.transitionable("width");
            this.transitionable("x");
            this.transitionable("y");

            /**
             * Is triggered when a key is pressed while the item has keyboard
             * focus.
             * @event keyDown
             * @param {object} event - The event object.
             * @memberof mid.Item
             */
            this.registerEvent("keyDown");

            const priv = d.get(this);

            this.onInitialization = () =>
            {
                const item = this.get();

                item.dataset.shObjectType = this.objectType;
                item.dataset.shObjectLocation = this.objectLocation;

                this.addHtmlEventListener(item, "keydown", (ev) =>
                {
                    const e = makeKeyEvent(ev);
                    this.keyDown(e);
                    if (e.accepted)
                    {
                        ev.stopPropagation();
                        ev.preventDefault();
                    }
                });

                this.addHtmlEventListener(item, "focus", (ev) =>
                {
                    if (priv.hasFocus)
                    {
                        // nothing to do
                        return;
                    }

                    if (! this.canFocus)
                    {
                        console.log("cannot receive focus: " + this.objectLocation);
                        //item.blur();
                    }
                    else
                    {
                        //console.log("received focus: " + this.objectLocation);
                        priv.hasFocus = true;
                        this.focusChanged();
                    }
                });

                this.addHtmlEventListener(item, "blur", () =>
                {
                    if (document.activeElement === this.get())
                    {
                        // not really lost focus
                        return;
                    }

                    //console.log("lost focus: " + this.objectLocation + ", to: " + document.activeElement);
                    priv.hasFocus = false;
                    this.focusChanged();
                });

                this.addHtmlEventListener(item, "scroll", () =>
                {
                    this.contentXChanged();
                    this.contentYChanged();

                    this.children.forEach((c) =>
                    {
                        if (c !== item && c.updateSizeFrom)
                        {
                            c.updateSizeFrom(null, false);
                        }
                    });
                }, { passive: true });

                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.updateSizeFrom(null, false);
                }, this.objectType + "@" + this.objectLocation);
            };

            this.onAncestorsEnabledChanged = () =>
            {
                this.children.forEach(child =>
                {
                    if (child.ancestorsEnabledChanged)
                    {
                        child.ancestorsEnabledChanged();
                    }
                });
                this.updateTabIndex();
            };

            this.onAncestorsVisibleChanged = () =>
            {
                this.children.forEach(child =>
                {
                    if (child.ancestorsVisibleChanged)
                    {
                        child.ancestorsVisibleChanged();
                    }
                });

                if (! this.ancestorsVisible)
                {
                    priv.mayUpdateSize = false;
                    priv.hasFocus = false;
                    this.focusChanged();

                    if (! priv.cssCache)
                    {
                        priv.cssCache = { };
                    }
                }
                else
                {
                    if (priv.cssCache)
                    {
                        const item = this.get();
                        for (let key in priv.cssCache)
                        {
                            low.css(item, key, priv.cssCache[key]);
                        }
                        priv.cssCache = null;
                    }

                    priv.mayUpdateSize = true;
                    this.updatePosition();
                }
            };

            this.onEnabledChanged = () => { this.updateTabIndex(); };

            this.onParentChanged = () =>
            {
                this.ancestorsVisibleChanged();
                this.ancestorsEnabledChanged();
                this.updatePosition();

                if (priv.trapFocus && this.parent)
                {
                    // trying to focus the parent will activate the focus trap
                    //this.parent.get().focus();
                    const focusEv = new CustomEvent("sh-focusChanged", { detail: document.activeElement });
                    document.dispatchEvent(focusEv);
                }
            };
        }

        get ancestorsEnabled()
        {
            if (this.parent)
            {
                return this.parent.enabled && this.parent.ancestorsEnabled;
            }
            else
            {
                return true;
            }
        }

        get ancestorsVisible()
        {
            if (this.parent)
            {
                return this.parent.visible && this.parent.ancestorsVisible;
            }
            else
            {
                return false;
            }
        }

        get visible() { return d.get(this).visible; }
        set visible(v)
        {
            d.get(this).visible = v;

            if (v)
            {
                this.get().classList.remove("sh-hidden");
            }
            else
            {
                this.get().classList.add("sh-hidden");
            }

            this.visibleChanged();
            this.updateSizeFrom(null, false);

            this.children.forEach(child =>
            {
                if (child.ancestorsVisibleChanged)
                {
                    child.ancestorsVisibleChanged();
                }
            });
        }

        get enabled() { return d.get(this).enabled; }
        set enabled(value)
        {
            d.get(this).enabled = value;
            if (value)
            {
                this.get().classList.remove("sh-disabled");
            }
            else
            {
                this.get().classList.add("sh-disabled");
            }

            this.enabledChanged();
            this.children.forEach(child =>
            {
                if (child.ancestorsEnabledChanged)
                {
                    child.ancestorsEnabledChanged();
                }
            });
        }

        updatePosition()
        {
            if (! d.get(this).mayUpdateSize)
            {
                return;
            }

            const priv = d.get(this);

            const item = this.get();
            const position = priv.position;
            const origin = priv.origin;
            const fillWidth = priv.fillWidth;
            const fillHeight = priv.fillHeight;
            const x = priv.x;
            const y = priv.y;
            const width = priv.width;
            const height = priv.height;
            const minWidth = priv.minWidth;
            const minHeight = priv.minHeight;
            const marginTop = priv.marginTop;
            const marginBottom = priv.marginBottom;
            const marginLeft = priv.marginLeft;
            const marginRight = priv.marginRight;

            if (position === "free")
            {
                this.css("position", "absolute");
            }
            else if (position === "global")
            {
                this.css("position", "fixed");
            }
            else
            {
                this.css("position", "relative");
            }

            this.css("min-width", minWidth + "px");
            this.css("min-height", minHeight + "px");
            

            if (position === "free" || position === "global")
            {
                this.css("margin-top", "0");
                this.css("margin-left", "0");
                this.css("margin-right", "0");
                this.css("margin-bottom", "0");

                if (fillWidth)
                {
                    this.css("width", "calc(100% - " + marginLeft + "px - " + marginRight + "px)");
                    this.css("left", marginLeft + "px");
                    this.css("right", "");
                }
                else
                {
                    this.css("width", width === -1 ? "auto" : width + "px");
                    this.css("min-width", Math.max(width, minWidth) + "px");
                    switch (origin)
                    {
                        case "top-left":
                        case "bottom-left":
                            this.css("left", x + marginLeft + "px");
                            this.css("right", "");
                            break;
                        case "top-right":
                        case "bottom-right":
                            this.css("left", "");
                            this.css("right", x + marginRight + "px");
                            break;
                    }
                }

                if (fillHeight)
                {
                    this.css("height", "calc(100% - " + marginTop + "px - " + marginBottom + "px)");
                    this.css("top", marginTop + "px");
                    this.css("bottom", "");
                }
                else
                {
                    this.css("height", height === -1 ? "auto" : height + "px");
                    this.css("min-height", Math.max(height, minHeight) + "px");
                    switch (origin)
                    {
                        case "top-left":
                        case "top-right":
                            this.css("top", y + marginTop + "px");
                            this.css("bottom", "");
                            break;
                        case "bottom-left":
                        case "bottom-right":
                            this.css("top", "");
                            this.css("bottom", y + marginBottom + "px");
                            break;
                    }
                }
            }
            else
            {
                this.css("flex-grow", "0");
                this.css("flex-shrink", "0");
                this.css("flex-basis", "auto");

                if (fillWidth)
                {
                    this.css("width", "calc(100% - " + marginLeft + "px - " + marginRight + "px)");
                    this.css("margin-left", marginLeft + "px");
                    this.css("margin-right", marginRight + "px");
                    if (this.parent && (this.parent.layout === "row" || this.parent.layout === "center-row"))
                    {
                        this.css("flex-shrink", "1");
                    }
                }
                else
                {
                    this.css("width", width === -1 ? "auto" : width + "px");
                    this.css("min-width", Math.max(width, minWidth) + "px");
                    this.css("margin-left", marginLeft + "px");
                    this.css("margin-right", marginRight + "px");
                }

                if (fillHeight)
                {
                    this.css("height", "calc(100% - " + marginTop + "px - " + marginBottom + "px)");
                    this.css("margin-top", marginTop + "px");
                    this.css("margin-bottom", marginBottom + "px");
                    
                    if (this.parent && (this.parent.layout === "column" || this.parent.layout === "center-column" || this.parent.layout === "center"))
                    {
                        this.css("flex-shrink", "1");
                    }
                }
                else
                {
                    this.css("height", height === -1 ? "auto" : height + "px");
                    this.css("min-height", Math.max(height, minHeight) + "px");
                    this.css("margin-top", marginTop + "px");
                    this.css("margin-bottom", marginBottom + "px");
                }

                this.css("top", "");
                this.css("bottom", "");
                this.css("left", "");
                this.css("right", "");
            }

            this.updateSizeFrom(null, false);
        }

        get bbox()
        {
            const priv = d.get(this);

            if (this.lifeCycleStatus !== "initialized" || ! priv.mayUpdateSize || ! priv.visible)
            {
                return {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0
                };
            };

            if (priv.cachedBbox)
            {
                return priv.cachedBbox;
            }

            const rect = this.get().getBoundingClientRect();
            priv.cachedBbox = {
                x: Math.round(rect.left),
                y: Math.round(rect.top),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
            //console.log("getBoundingClientRect() of " + this.objectId + "." + this.objectType + "@" + this.objectLocation + ": " + JSON.stringify(priv.cachedBbox));
            //console.log("get bbox of " + this.objectType + "@" + this.objectLocation + " " + JSON.stringify(priv.cachedBbox));
            return priv.cachedBbox;
        }

        get fillWidth() { return d.get(this).fillWidth; }
        set fillWidth(value)
        {
            d.get(this).fillWidth = value;
            this.updatePosition();
            this.fillWidthChanged();
        }

        get fillHeight() { return d.get(this).fillHeight; }
        set fillHeight(value)
        {
            d.get(this).fillHeight = value;
            this.updatePosition();
            this.fillHeightChanged();
        }

        get width() { return d.get(this).width; }
        set width(w)
        {
            d.get(this).width = w;
            this.updatePosition();
            this.widthChanged();
        }

        get height() { return d.get(this).height; }
        set height(h)
        {
            d.get(this).height = h;
            this.updatePosition();
            this.heightChanged();
        }

        get minWidth() { return d.get(this).minWidth; }
        set minWidth(w)
        {
            d.get(this).minWidth = w;
            this.updatePosition();
            this.minWidthChanged();
        }

        get minHeight() { return d.get(this).minHeight; }
        set minHeight(h)
        {
            d.get(this).minHeight = h;
            this.updatePosition();
            this.minHeightChanged();
        }

        set ruler(r)
        {
            if (! r)
            {
                return;
            }
            
            this.onBboxChanged = () =>
            {
                r.request(this.bbox);
            };

            this.onInitialization = () =>
            {
                r.request(this.bbox);
            };
            r.request(this.bbox);
        }

        get marginTop() { return d.get(this).marginTop; }
        set marginTop(s)
        {
            d.get(this).marginTop = s;
            this.updatePosition();
            this.marginTopChanged();
        }

        get marginBottom() { return d.get(this).marginBottom; }
        set marginBottom(s)
        {
            d.get(this).marginBottom = s;
            this.updatePosition();
            this.marginBottomChanged();
        }

        get marginLeft() { return d.get(this).marginLeft; }
        set marginLeft(s)
        {
            d.get(this).marginLeft = s;
            this.updatePosition();
            this.marginLeftChanged();
        }

        get marginRight() { return d.get(this).marginRight; }
        set marginRight(s)
        {
            d.get(this).marginRight = s;
            this.updatePosition();
            this.marginRightChanged();
        }

        get position() { return d.get(this).position; }
        set position(pos)
        {
            d.get(this).position = pos;
            this.updatePosition();
            this.positionChanged();
        }

        get origin() { return d.get(this).origin; }
        set origin(o)
        {
            d.get(this).origin = o;
            this.updatePosition();
            this.originChanged();
        }

        get x() { return d.get(this).x; }
        set x(x)
        {
            d.get(this).x = x;
            this.updatePosition();
            this.xChanged();
        }

        get y() { return d.get(this).y; }
        set y(y)
        {
            d.get(this).y = y;
            this.updatePosition();
            this.yChanged();
        }

        get contentX() { return this.get().scrollLeft; }
        set contentX(x)
        {
            let item = this.get();
            if (item.scrollTo)
            {
                item.scrollTo(x, item.scrollTop);
            }
            else
            {
                item.scrollLeft = x;
            }
        }
        get contentY() { return this.get().scrollTop; }
        set contentY(y)
        {
            let item = this.get();
            if (item.scrollTo)
            {
                item.scrollTo(item.scrollLeft, y);
            }
            else
            {
                item.scrollTop = y;
            }
        }
        
        get contentWidth() { return Math.ceil(this.get().scrollWidth); }
        get contentHeight() { return Math.ceil(this.get().scrollHeight); }

        get cursor() { return d.get(this).cursor; }
        set cursor(c)
        {
            d.get(this).cursor = c;
            this.css("cursor", c);
            this.cursorChanged();
        }

        get opacity() { return d.get(this).opacity; }
        set opacity(value)
        {
            d.get(this).opacity = value;
            this.css("opacity", value);
            this.opacityChanged();
        }

        get perspective() { return d.get(this).perspective; }
        set perspective(p)
        {
            d.get(this).perspective = p;
            this.updateTransformation();
            this.perspectiveChanged();
        }

        get rotationAngle() { return d.get(this).rotationAngle; }
        set rotationAngle(deg)
        {
            d.get(this).rotationAngle = deg;
            this.updateTransformation();
            this.rotationAngleChanged();
        }

        get rotationAxis() { return d.get(this).rotationAxis; }
        set rotationAxis(v)
        {
            d.get(this).rotationAxis = v;
            this.updateTransformation();
            this.rotationAxisChanged();
        }

        get style() { return d.get(this).style; }
        set style(newStyle)
        {
            if (typeof newStyle === "string")
            {
                newStyle = [newStyle];
            }
            
            const priv = d.get(this);
            const item = this.get();
            
            // remove all from CSS classes that are in priv.style but not in newStyle
            const toRemove = priv.style.filter(cls => ! newStyle.includes(cls));
            // add to CSS classes all that are in newStyle but not in priv.style
            const toAdd = newStyle.filter(cls => ! priv.style.includes(cls));

            item.classList.remove(...toRemove);
            item.classList.add(...toAdd);

            priv.style = newStyle;
            this.styleChanged();
         }

        get canFocus() { return d.get(this).canFocus; }
        set canFocus(v)
        {
            d.get(this).canFocus = v;
            if (v)
            {
                this.get().dataset.role = "sh-focusable";
            }
            else
            {
                delete this.get().dataset.role;
            }
            this.updateTabIndex();
            this.canFocusChanged();
        }

        get trapFocus() { return d.get(this).trapFocus; }
        set trapFocus(v)
        {
            d.get(this).trapFocus = v;
            if (v)
            {
                this.addHtmlEventListener(document, "sh-trapFocus", this.applyFocusTrap.bind(this));
                if (this.parent)
                {
                    // trying to focus the parent will activate the focus trap
                    this.parent.get().focus();
                }
            }
            else
            {
                this.removeHtmlEventListener(document, "sh-trapFocus", this.applyFocusTrap.bind(this));
            }
            this.trapFocusChanged();
        }
        
        get focus() { return d.get(this).hasFocus; }
        set focus(v)
        {
            let item = this.get();
            if (v)
            {
                item.focus();
            }
        }

        /**
         * Creates a 3-component vector.
         * 
         * @memberof shf3d
         * @param {number} x - The X component.
         * @param {number} y - The Y component.
         * @param {number} z - The Z component.
         * @returns {vec3} The vector.
         */
        vec3(x, y, z)
        {
            return vec.vec3(x, y, z);
        }

        /**
         * Applies a CSS property to this item's HTML element.
         * This method makes use of caching in order to minimize operations on
         * the DOM. Do not use CSS shortcuts, such as `margin`.
         * 
         * @param {string} prop - The CSS property.
         * @param {string} value - The value to set.
         */
        css(prop, value)
        {
            const priv = d.get(this);

            if (priv.cssLiveCache[prop] === value)
            {
                return;
            }
            priv.cssLiveCache[prop] = value;

            const item = this.get();
            if (priv.cssCache)
            {
                // cache for later in order to minimize DOM operations
                priv.cssCache[prop] = value;
            }
            else
            {
                // we want to get here as seldom as possible as DOM operations
                // are expensive
                low.css(item, prop, value);
            }
        }

        applyFocusTrap(ev)
        {
            if (! (this.visible && this.ancestorsVisible && this.enabled && this.ancestorsEnabled))
            {
                return;
            }

            // check if the currently focused item is a descendant of the trap
            let isDescendant = false;
            let p = ev.detail.target;
            while (p)
            {
                if (p === this.get())
                {
                    isDescendant = true;
                    break;
                }
                p = p.parentNode;
            }
            //console.log("check focus trap " + this.objectLocation + ": " + isDescendant);

            if (! isDescendant)
            {
                // trap focus
                ev.detail.trap(this);
            }
            else
            {
                // focused item is in the trap; no trapping needed
                ev.detail.trap(null);
            }
        }

        updateTabIndex()
        {
            //console.log(this.objectLocation + ": " + this.canFocus + " " + this.visible + " " + this.enabled + " " + this.ancestorsVisible + " " + this.ancestorsEnabled);
            if (this.canFocus &&
                this.enabled &&
                this.ancestorsEnabled)
            {
                //console.log("update tabIndex of " + this.objectLocation + " -> 0");
                this.get().tabIndex = 0;
            }
            else
            {
                //console.log("update tabIndex of " + this.objectLocation + " -> -1");
                this.get().tabIndex = -1;
            }
        }

        updateSizeFrom(item, fromChild)
        {
            const priv = d.get(this);

            if (sizingCalculationsFrozen || ! priv.mayUpdateSize)
            {
                return;
            }

            if (priv.inSizeUpdate)
            {
                return;
            }

            priv.cachedBbox = null

            const prevBbox = priv.prevBbox;
            const bbox = this.bbox;
            const bboxHasChanged = bbox.x !== prevBbox.x ||
                                   bbox.y !== prevBbox.y ||
                                   bbox.width !== prevBbox.width ||
                                   bbox.height !== prevBbox.height;

            if (bboxHasChanged)
            {
                priv.prevBbox = bbox;
            }

            //console.log("update size from " + JSON.stringify(bbox));

            //console.log("updateSizeFrom " + fromChild + ": " + this.constructor.name);
            priv.inSizeUpdate = true;
            if (item)
            {
                if (fromChild)
                {   
                    if (bboxHasChanged)
                    {
                        this.bboxChanged();
                    }

                    // may affect content size, if child is positioned "inline" or
                    // "free"
                    if (item.position === "inline" || item.position === "free")
                    {
                        this.contentWidthChanged();
                        this.contentHeightChanged();
                    }
                }
                else
                {
                    if (bboxHasChanged)
                    {
                        this.bboxChanged();
                    }
                }
            }
            else
            {
                if (bboxHasChanged)
                {
                    this.bboxChanged();
                }
            }

            // notify parent and children, excluding from where the update came
            if (bboxHasChanged)
            {
                if (this.parent && this.parent !== item && this.parent.updateSizeFrom)
                {
                    this.parent.updateSizeFrom(this, true);
                }
                if (bbox.width * bbox.height > 0)
                {
                    this.children.forEach((c) =>
                    {
                        if (c !== item && c.updateSizeFrom)
                        {
                            c.updateSizeFrom(this, false);
                        }
                    });
                }
            }
            priv.inSizeUpdate = false;
        }

        updateTransformation()
        {
            const priv = d.get(this);

            const phi = priv.rotationAngle / 180 * Math.PI;
            const c = Math.cos(phi / 2);
            const s = Math.sin(phi / 2);
            const len = priv.rotationAxis.length();
            const normalizedAxis = len !== 0 ? priv.rotationAxis.scale(1 / len)
                                             : priv.rotationAxis;

            priv.rotationQuaternion = [
                c,
                normalizedAxis.x * s,
                normalizedAxis.y * s,
                normalizedAxis.z * s
            ];

            const m = mat.mul(
                mat.rotationMByQuaternion(priv.rotationQuaternion),
                mat.perspectiveM(priv.perspective)
            );
            this.css("transform", "matrix3d(" + mat.flat(m).join(",") + ")");
            // transformations may change the size
            this.updateSizeFrom(null, false);
        }

        detachChild(child)
        {
            if (child.get)
            {
                const node = child.get();
                if (node.parentNode)
                {
                    node.parentNode.removeChild(node);
                }
            }
            super.detachChild(child);
        }

        /**
         * Returns the item's DOM element.
         * Subclasses must override this method.
         * 
         * @memberof mid.Item
         * @abstract
         * @return {object} The DOM element.
         */
        get()
        {
            throw "Subclasses must override Item.get()."
            return null;
        }

        /**
         * Runs the given function without doing the rather expensive sizing
         * calculations inbetween.
         *
         * @param {function} f - The function to run in frozen mode.
         */
        withoutSizing(f)
        {
            const priv = d.get(this);

            if (sizingCalculationsFrozen)
            {
                f();
            }
            else
            {
                sizingCalculationsFrozen = true;
                f();
                sizingCalculationsFrozen = false;
            }
        }
    };

});
