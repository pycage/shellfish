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

shRequire(["shellfish/low", __dirname + "/item.js"], function (low, item)
{
    const HTML = low.createElementTree(
        low.tag("div")
        .class("sh-no-scrollbars sh-layout-column sh-overflowbehavior-none sh-type-box")
        .style("width", "auto")
        .style("height", "auto")
        .style("border-color", "black")
        .style("border-width", "0")
        .style("border-style", "solid")
        .style("border-radius", "0")
        .html()
    );

    const d = new WeakMap();

    /**
     * Class representing a box.
     * 
     * A box is a container item that holds and layouts child items.
     * 
     * @extends html.Item
     * @memberof html
     * 
     * @property {html.Color} borderColor - (default: `"black"`) The color of the border.
     * @property {number} borderRadius - (default: `0`) The border radius. The higher the value, the more round the corners are. A square with a border radius of half its width is a circle.
     * @property {number} borderStyle - (default: `solid`) The style of the border: `solid|dotted|dashed`
     * @property {number} borderWidth - (default: `0`) The border width.
     * @property {html.Color} color - (default: `"transparent"`) The background color.
     * @property {string} gradient - (default: `""`) The color gradient expression.
     * @property {string} layout - (default: `"column"`) The layout method for inlined children: `row|column|center|center-row|center-column`
     * @property {string} overflowBehavior - (default: `"none"`) The overflow behavior: `none|wrap|scroll`
     * @property {bool} scrollbars - (default: `false`) Whether to show native scrollbars for content overflow.
     */
    class Box extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                color: this.colorName("transparent"),
                borderColor: this.colorName("black"),
                borderWidth: 0,
                borderRadius: 0,
                borderStyle: "solid",
                gradient: "",
                layout: "column",
                overflowBehavior: "none",
                scrollbars: false,
                currentCssClass: "sh-layout-column",
                currentOverflowClass: "sh-overflowbehavior-none",
                layoutPending: true,
                item: HTML.cloneNode()
            });

            this.notifyable("color");
            this.notifyable("borderColor");
            this.notifyable("borderRadius", true);
            this.notifyable("borderStyle", true);
            this.notifyable("borderWidth", true);
            this.notifyable("gradient");
            this.notifyable("layout");
            this.notifyable("overflowBehavior");
            this.notifyable("scrollbars", true);

            this.onInitialization = () =>
            {
                if (this.visible && this.ancestorsVisible && d.get(this).layoutPending)
                {
                    d.get(this).layoutPending = false;
                    this.updateLayout();
                }
            };

            this.onVisibleChanged = () =>
            {
                if (this.visible && this.ancestorsVisible && d.get(this).layoutPending)
                {
                    d.get(this).layoutPending = false;
                    this.updateLayout();
                }
            };

            this.onAncestorsVisibleChanged = () =>
            {
                if (this.visible && this.ancestorsVisible && d.get(this).layoutPending)
                {
                    d.get(this).layoutPending = false;
                    this.updateLayout();
                }
            }
        }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            this.css("background-color", col.toCss());
            d.get(this).color = col;
            this.colorChanged();
        }

        get gradient() { return d.get(this).gradient; }
        set gradient(expression)
        {
            d.get(this).gradient = expression;
            this.css("background", expression);
            this.gradientChanged();
        }

        updateBorder()
        {
            const priv = d.get(this);
            this.css("border-style", priv.borderStyle);
            this.css("border-width", priv.borderWidth + "px");
            this.css("border-color", priv.borderColor.toCss());
        }

        get borderWidth() { return d.get(this).borderWidth; }
        set borderWidth(w)
        {
            d.get(this).borderWidth = w;
            this.updateBorder();
            this.borderWidthChanged();
        }

        get borderColor() { return d.get(this).borderColor; }
        set borderColor(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            d.get(this).borderColor = col;
            this.updateBorder();
            this.borderColorChanged();
        }

        get borderRadius() { return d.get(this).borderRadius; }
        set borderRadius(r)
        {
            this.css("border-radius", r + "px");
            d.get(this).borderRadius = r;
            this.borderRadiusChanged();
        }

        get borderStyle() { return d.get(this).borderStyle; }
        set borderStyle(s)
        {
            d.get(this).borderStyle = s;
            this.updateBorder();
            this.borderStyleChanged();
        }

        get layout() { return d.get(this).layout; }
        set layout(l)
        {
            d.get(this).layout = l;
            this.updateLayout();
            this.layoutChanged();
        }

        get overflowBehavior() { return d.get(this).overflowBehavior; }
        set overflowBehavior(b)
        {
            d.get(this).overflowBehavior = b;
            this.updateLayout();
            this.overflowBehaviorChanged();
        }

        get scrollbars() { return d.get(this).scrollbars; }
        set scrollbars(value)
        {
            d.get(this).scrollbars = value;
            if (value)
            {
                d.get(this).item.classList.remove("sh-no-scrollbars");
            }
            else
            {
                d.get(this).item.classList.add("sh-no-scrollbars");
            }
            this.scrollbarsChanged();
        }

        /**
         * Sets the CSS properties for layouting children.
         */
        updateLayout()
        {
            const priv = d.get(this);
            
            if (! this.visible || ! this.ancestorsVisible || this.lifeCycleStatus === "new")
            {
                priv.layoutPending = true;
                return;
            }

            const item = this.get();

            function setLayoutClass(newCls)
            {
                if (newCls !== priv.currentCssClass)
                {
                    item.classList.remove(priv.currentCssClass);
                    item.classList.add(newCls);
                    priv.currentCssClass = newCls;
                }
            }

            function setOverflowClass(newCls)
            {
                if (newCls !== priv.currentOverflowClass)
                {
                    item.classList.remove(priv.currentOverflowClass);
                    item.classList.add(newCls);
                    priv.currentOverflowClass = newCls;
                }
            }

            switch (priv.layout)
            {
            case "column":
                setLayoutClass("sh-layout-column");
                break;
            case "row":
                setLayoutClass("sh-layout-row");
                break;
            case "center":
            case "center-column":
                setLayoutClass("sh-layout-center-column");
                break;
            case "center-row":
                setLayoutClass("sh-layout-center-row");
                break;
            default:
                throw `Invalid value for layout (${this.objectLocation}): ${d.get(this).layout}`;
            }

            switch (d.get(this).overflowBehavior)
            {
            case "none":
                setOverflowClass("sh-overflowbehavior-none");
                /*
                this.css("flex-wrap", "nowrap");
                this.css("overflow", "hidden");
                */
                break;
            case "wrap":
                setOverflowClass("sh-overflowbehavior-wrap");
                /*
                this.css("flex-wrap", "wrap");
                this.css("overflow", "hidden");
                */
                break;
            case "scroll":
                setOverflowClass("sh-overflowbehavior-scroll");
                /*
                this.css("flex-wrap", "nowrap");
                this.css("overflow", "auto");
                */
                break;
            default:
                throw `Invalid value for overflowBehavior (${this.objectLocation}): ${d.get(this).overflowBehavior}`;
            }

            this.children.forEach(c =>
            {
                if (c.updateSizeFrom)
                {
                    c.updateSizeFrom(this, false, true);
                }
            });
        }

        /**
         * Adds a child element to the box.
         * 
         * @param {html.Object} child - The child item.
         * @param {html.Object} beforeChild - An optional child item before which to insert the child.
         */
        add(child, beforeChild)
        {
            super.add(child, beforeChild);
            if (child.get)
            {
                const priv = d.get(this);
                const f = () =>
                {
                    if (beforeChild !== undefined && beforeChild.get())
                    {
                        beforeChild.get().insertAdjacentElement("beforebegin", child.get());
                    }
                    else
                    {
                       priv.item.appendChild(child.get());
                    }
                };
                
                if (this.lifeCycleStatus === "new")
                {
                    this.withoutSizing(f);
                }
                else
                {
                    f();
                }
            }
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Box = Box;

});
