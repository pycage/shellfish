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

shRequire([__dirname + "/../low.js", __dirname + "/object.js"], function (low, obj)
{
    /*
    class GeometryWatcher extends obj.Object
    {
        constructor()
        {
            super();
            this.registerEvent("change");

            const mutObs = new MutationObserver(() => { console.log("geometry changed"); this.change(); });
            const config = { attributes: true, childList: true, subtree: true };
            mutObs.observe(document.body, config);
        }
    }
    const geometryWatcher = new GeometryWatcher();
    */


    const d = new WeakMap();

    /**
     * Base class representing a visual mid-level object.
     * @class
     */
    exports.Item = class Item extends obj.Object
    {
        /**
         * @constructor
         */
        constructor()
        {
            super();
            d.set(this, {
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
                position: "inline",
                origin: "top-left",
                layout: "column",
                canFocus: false,
                x: 0,
                y: 0,
                opacity: 1,
                rotation: 0
            });

            this.notifyable("bbox");
            this.notifyable("visible");
            this.notifyable("enabled");
            this.notifyable("cursor");
            this.notifyable("width");
            this.notifyable("height");
            this.notifyable("minWidth");
            this.notifyable("minHeight");
            this.notifyable("fillWidth");
            this.notifyable("fillHeight");
            this.notifyable("marginTop");
            this.notifyable("marginBottom");
            this.notifyable("marginLeft");
            this.notifyable("marginRight");
            this.notifyable("position");
            this.notifyable("origin");
            this.notifyable("layout");
            this.notifyable("x");
            this.notifyable("y");
            this.notifyable("opacity");
            this.notifyable("rotation");
            this.notifyable("contentX");
            this.notifyable("contentY");
            this.notifyable("contentWidth");
            this.notifyable("contentHeight");
            this.notifyable("focus");
            this.notifyable("canFocus");

            this.transitionable("width");
            this.transitionable("height");
            this.transitionable("marginTop");
            this.transitionable("marginBottom");
            this.transitionable("marginLeft");
            this.transitionable("marginRight");
            this.transitionable("x");
            this.transitionable("y");

            this.registerEvent("keyDown");

            let firstInitialized = false;
            this.onInitialization = () =>
            {
                if (firstInitialized)
                {
                    return;
                }

                firstInitialized = true;

                this.updatePosition();
                this.updateLayout();

                const item = this.get();
                item.addEventListener("keydown", this.keyDown);
                item.addEventListener("focus", () => { this.focusChanged(); });
                item.addEventListener("blur", () => { this.focusChanged(); });

                this.canFocus = d.get(this).canFocus;

                let prevBbox = this.bbox;
                low.registerTopDownEvent(item, "sh-resize", (ev) =>
                {
                    const bbox = this.bbox;
                    if (bbox.width !== prevBbox.width ||
                        bbox.height !== prevBbox.height ||
                        bbox.x !== prevBbox.x ||
                        bbox.y !== prevBbox.y)
                    {
                        prevBbox = this.bbox;
                        //console.log("sh-resize: " + this.constructor.name + " " + JSON.stringify(prevBbox));
                        this.bboxChanged();

                        return true;
                    }
                    else
                    {
                        return false;
                    }
                });
            };
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
            low.triggerTopDownEvent(this.get(), "sh-resize");
        }

        get enabled() { return d.get(this).enabled; }
        set enabled(value)
        {
            d.get(this).enabled = value;
            const item = this.get();

            low.css(item, "pointer-events", value ? "" : "none");

            this.enabledChanged();
        }

        updatePosition()
        {
            const item = this.get();
            const position = d.get(this).position;
            const origin = d.get(this).origin;
            const fillWidth = d.get(this).fillWidth;
            const fillHeight = d.get(this).fillHeight;
            const x = d.get(this).x;
            const y = d.get(this).y;
            const width = d.get(this).width;
            const height = d.get(this).height;
            const minWidth = d.get(this).minWidth;
            const minHeight = d.get(this).minHeight;
            const marginTop = d.get(this).marginTop;
            const marginBottom = d.get(this).marginBottom;
            const marginLeft = d.get(this).marginLeft;
            const marginRight = d.get(this).marginRight;

            if (position === "free")
            {
                low.css(item, "position", "absolute");
            }
            else if (position === "global")
            {
                low.css(item, "position", "fixed");
            }
            else
            {
                low.css(item, "position", "relative");
            }

            low.css(item, "min-width", minWidth + "px");
            low.css(item, "min-height", minHeight + "px");
            

            if (position === "free" || position === "global")
            {
                low.css(item, "margin-left", "0");
                low.css(item, "margin-right", "0");
                low.css(item, "margin-top", "0");
                low.css(item, "margin-bottom", "0");

                if (fillWidth)
                {
                    low.css(item, "width", "calc(100% - " + marginLeft + "px - " + marginRight + "px)");
                    low.css(item, "left", marginLeft + "px");
                    low.css(item, "right", "");
                }
                else
                {
                    low.css(item, "width", width === -1 ? "auto" : width + "px");
                    low.css(item, "min-width", Math.max(width, minWidth) + "px");
                    switch (origin)
                    {
                        case "top-left":
                        case "bottom-left":
                            low.css(item, "left", x + marginLeft + "px");
                            low.css(item, "right", "");
                            break;
                        case "top-right":
                        case "bottom-right":
                            low.css(item, "left", "");
                            low.css(item, "right", x + marginRight + "px");
                            break;
                    }
                }

                if (fillHeight)
                {
                    low.css(item, "height", "calc(100% - " + marginTop + "px - " + marginBottom + "px)");
                    low.css(item, "top", marginTop + "px");
                    low.css(item, "bottom", "");
                }
                else
                {
                    low.css(item, "height", height === -1 ? "auto" : height + "px");
                    low.css(item, "min-height", Math.max(height, minHeight) + "px");
                    switch (origin)
                    {
                        case "top-left":
                        case "top-right":
                            low.css(item, "top", y + marginTop + "px");
                            low.css(item, "bottom", "");
                            break;
                        case "bottom-left":
                        case "bottom-right":
                            low.css(item, "top", "");
                            low.css(item, "bottom", y + marginBottom + "px");
                            break;
                    }
                }
            }
            else
            {
                low.css(item, "flex-grow", "0");
                low.css(item, "flex-shrink", "0");

                if (fillWidth)
                {
                    low.css(item, "width", "calc(100% - " + marginLeft + "px - " + marginRight + "px)");
                    low.css(item, "flex-grow", "0");
                    low.css(item, "flex-shrink", "1");
                    low.css(item, "margin-left", marginLeft + "px");
                    low.css(item, "margin-right", marginRight + "px");
                }
                else
                {
                    low.css(item, "width", width === -1 ? "auto" : width + "px");
                    low.css(item, "min-width", Math.max(width, minWidth) + "px");
                    low.css(item, "margin-left", marginLeft + "px");
                    low.css(item, "margin-right", marginRight + "px");
                }

                if (fillHeight)
                {
                    low.css(item, "height", "calc(100% - " + marginTop + "px - " + marginBottom + "px)");
                    low.css(item, "flex-grow", "0");
                    low.css(item, "flex-shrink", "1");
                    low.css(item, "margin-top", marginTop + "px");
                    low.css(item, "margin-bottom", marginBottom + "px");
                }
                else
                {
                    low.css(item, "height", height === -1 ? "auto" : height + "px");
                    low.css(item, "min-height", Math.max(height, minHeight) + "px");
                    low.css(item, "margin-top", marginTop + "px");
                    low.css(item, "margin-bottom", marginBottom + "px");
                }

                low.css(item, "top", "");
                low.css(item, "bottom", "");
                low.css(item, "left", "");
                low.css(item, "right", "");
            }

            low.triggerTopDownEvent(this.get(), "sh-resize");
        }

        updateLayout()
        {
            const item = this.get();

            if (! this.add)
            {
                return;
            }

            switch (d.get(this).layout)
            {
            case "column":
                low.css(item, "display", "flex");
                low.css(item, "flex-direction", "column");
                low.css(item, "justify-content", "flex-start");
                low.css(item, "align-items", "flex-start");
                break;
            case "row":
                low.css(item, "display", "flex");
                low.css(item, "flex-direction", "row");
                low.css(item, "justify-content", "flex-start");
                low.css(item, "align-items", "flex-start");
                break;
            case "center":
            case "center-column":
                low.css(item, "display", "flex");
                low.css(item, "flex-direction", "column");
                low.css(item, "justify-content", "center");
                low.css(item, "align-items", "center");
                break;
            case "center-row":
                low.css(item, "display", "flex");
                low.css(item, "flex-direction", "row");
                low.css(item, "justify-content", "center");
                low.css(item, "align-items", "center");
                break;
            default:
                throw "Invalid item layout strategy: " + d.get(this).layout;
            }
        }

        get bbox()
        {
            const rect = this.get().getBoundingClientRect();
            return {
                x: Math.floor(rect.left),
                y: Math.floor(rect.top),
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height)
            };
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

        get layout() { return d.get(this).layout; }
        set layout(l)
        {
            d.get(this).layout = l;
            this.updateLayout();
            this.layoutChanged();
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
        
        get contentWidth() { return this.get().scrollWidth; }
        get contentHeight() { return this.get().scrollHeight; }

        get cursor() { return d.get(this).cursor; }
        set cursor(c)
        {
            d.get(this).cursor = c;
            low.css(this.get(), "cursor", c);
            this.cursorChanged();
        }

        get opacity() { return d.get(this).opacity; }
        set opacity(value)
        {
            d.get(this).opacity = value;
            low.css(this.get(), "opacity", value);
            this.opacityChanged();
        }

        get rotation() { return d.get(this).rotation; }
        set rotation(deg)
        {
            d.get(this).rotation = deg;
            low.css(this.get(), "transform", "rotate(" + deg + "deg)");
            this.rotationChanged();
        }

        get style()
        {
            const item = this.get();
            const currentClasses = item.classList;
            let result = [];
            for (let i = 0; i < currentClasses.length; ++i)
            {
                result.push(currentClasses[i]);
            }
            return result;
        }

        set style(cssClasses)
        {
            if (typeof cssClasses === "string")
            {
                cssClasses = [cssClasses];
            }

            const item = this.get();
            const currentClasses = item.classList;
            let newClasses = [];
            let oldClasses = [];

            cssClasses.forEach(function (cls)
            {
                if (! currentClasses.contains(cls))
                {
                    // add class
                    newClasses.push(cls);
                }
            });

            for (let i = 0; i < currentClasses.length; ++i)
            {
                const cls = currentClasses[i];
                oldClasses.push(cls);
                if (cssClasses.indexOf(cls) !== -1)
                {
                    // keep class
                    newClasses.push(cls);
                }
            }

            currentClasses.remove(...oldClasses);
            currentClasses.add(...newClasses);            
        }

        get canFocus() { return d.get(this).canFocus; }
        set canFocus(v)
        {
            d.get(this).canFocus = v;
            if (v)
            {
                this.get().tabIndex = 0;
            }
            else
            {
                this.get().tabIndex = -1;
            }
            this.canFocusChanged();
        }
        
        get focus() { return document.activeElement === this.get(); }
        set focus(v)
        {
            let item = this.get();
            if (v)
            {
                item.focus();
            }
        }

        get()
        {
            return null;
        }
    };

});
