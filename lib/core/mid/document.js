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
    const d = new WeakMap();

    /**
     * Class representing the root document.
     * @extends mid.Object
     * @memberof mid
     *
     * @property {object} bbox - [readonly] The current bounding box.
     * @property {string} color - The document's background color.
     * @property {number} contentHeight - [readonly] The current scrolling viewport height.
     * @property {number} contentWidth - [readonly] The current scrolling viewport width.
     * @property {number} contentX - (default: `0`) The current horizontal scrolling position.
     * @property {number} contentY - (default: `0`) The current vertical scrolling position.
     * @property {string} inputDevice - [readonly] The currently active input device: mouse|touch|pen
     * @property {bool} scrollbars - (default: `false`) Whether to show native scrollbars.
     * @property {bool} systemDarkMode - [readonly] Whether the system is in dark mode (Windows 10, MacOS, Android).
     * @property {string} title - The document's title.
     * @property {number} windowWidth - [readonly] The current width of the document window.
     * @property {number} windowHeight - [readonly] The current height of the document window.
     */
    exports.Document = class Document extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                inSizeUpdate: false,
                virginity: true,
                scrollbars: false,
                systemDarkMode: false,
                inputDevice: "mouse",
                fullscreenItem: null
            });

            this.notifyable("systemDarkMode");
            this.notifyable("inputDevice");
            this.notifyable("title");
            this.notifyable("color");
            this.notifyable("windowWidth");
            this.notifyable("windowHeight");
            this.notifyable("scrollbars");
            this.notifyable("contentX");
            this.notifyable("contentY");
            this.notifyable("contentWidth");
            this.notifyable("contentHeight");
            this.notifyable("bbox");
            this.notifyable("fullscreenItem");

            const that = this;

            document.documentElement.classList.add("sh-no-scrollbars");

            this.addHtmlEventListener(window, "resize", ev =>
            {
                that.windowWidthChanged();
                that.windowHeightChanged();
                this.updateSizeFrom(null, false);
            }, { passive: true });

            this.addHtmlEventListener(window, "scroll", ev =>
            {
                this.updateSizeFrom(null, false);

                that.contentXChanged();
                that.contentYChanged();
                that.contentWidthChanged();
                that.contentHeightChanged();
                that.trigger("scroll");
            }, { passive: true });

            // detect the operation mode (mouse vs touch)
            this.addHtmlEventListener(document, "pointerenter", ev =>
            {
                if (d.get(that).inputDevice !== ev.pointerType)
                {
                    d.get(that).inputDevice = ev.pointerType;
                    that.inputDeviceChanged();
                }
            }, { passive: true, capture: true });

            // and a workaround for Firefox which may have pointer events
            // disabled by default
            this.addHtmlEventListener(window, "touchstart", ev =>
            {
                if (d.get(that).inputDevice !== "touch")
                {
                    d.get(that).inputDevice = ev.pointerType;
                    that.inputDeviceChanged();
                }
            }, { passive: true, capture: true });

            this.addHtmlEventListener(document, "mozfullscreenchange", ev =>
            {
                if (! low.fullscreenStatus())
                {
                    d.get(this).fullscreenItem = null;
                    this.fullscreenItemChanged();
                }
            });

            this.addHtmlEventListener(document, "webkitfullscreenchange", ev =>
            {
                if (! low.fullscreenStatus())
                {
                    d.get(this).fullscreenItem = null;
                    this.fullscreenItemChanged();
                }
            });


            if (window.matchMedia)
            {
                const mql = window.matchMedia("(prefers-color-scheme: dark)");
                if (mql.matches)
                {
                    d.get(this).systemDarkMode = true;
                }

                mql.addListener(ev =>
                {
                    d.get(that).systemDarkMode = ev.matches;
                    that.systemDarkModeChanged();
                }, { passive: true });
            }

            this.onInitialization = () =>
            {
                console.log("Initializing Document.");
                window.requestAnimationFrame(() =>
                {
                    this.updateSizeFrom(null, false);
                });
            };
        }

        get systemDarkMode() { return d.get(this).systemDarkMode; }

        get inputDevice() { return d.get(this).inputDevice; }

        get title() { return document.title; }
        set title(t)
        {
            document.title = t;
            this.titleChanged();
        }

        get ancestorsEnabled() { return true; }
        get ancestorsVisible() { return true; }
        get enabled() { return true; }
        get visible() { return true; }

        get bbox()
        {
            return {
                x: 0,
                y: 0,
                width: window.innerWidth,
                height: window.innerHeight
            };
        }

        get color() { return low.css(document.body, "background-color"); }
        set color(c)
        {
            low.css(document.body, "background-color", c);
            this.colorChanged();
        }

        get windowWidth() { return window.innerWidth; }
        get windowHeight() { return window.innerHeight; }

        get contentX() { return window.scrollX; }
        set contentX(x)
        {
            window.scrollTo(x, window.scrollY);
        }
        get contentY() { return window.scrollY; }
        set contentY(y)
        {
            window.scrollTo(window.scrollX, y);
        }
        
        get contentWidth() { return document.body.scrollWidth; }
        get contentHeight() { return document.body.scrollHeight; }

        get scrollbars() { return d.get(this).scrollbars; }
        set scrollbars(value)
        {
            d.get(this).scrollbars = value;
            if (value)
            {
                document.documentElement.classList.remove("sh-no-scrollbars");
            }
            else
            {
                document.documentElement.classList.add("sh-no-scrollbars");
            }
            this.scrollbarsChanged();
        }

        get fullscreenItem() { return d.get(this).fullscreenItem; }
        set fullscreenItem(item)
        {
            if (! item)
            {
                low.fullscreenExit();
            }
            else
            {
                if (low.fullscreenStatus())
                {
                    low.fullscreenExit();
                }
                low.fullscreenEnter(item.get());
            }

            d.get(this).fullscreenItem = item;
            this.fullscreenItemChanged();
        }

        updateSizeFrom(item, fromChild)
        {
            if (d.get(this).inSizeUpdate)
            {
                return;
            }

            d.get(this).inSizeUpdate = true;
            if (item)
            {
                if (fromChild)
                {   
                    // may affect content size
                    this.contentWidthChanged();
                    this.contentHeightChanged();
                }
            }
            else
            {
                this.bboxChanged();
            }

            // notify children, excluding from where the update came
            this.children.forEach((c) =>
            {
                if (c !== item && c.updateSizeFrom)
                {
                    c.updateSizeFrom(this, false);
                }
            });
            d.get(this).inSizeUpdate = false;
        }

        detachChild(child)
        {
            if (child.get)
            {
                document.body.removeChild(child.get());
            }
            super.detachChild(child);
        }

        add(child)
        {
            child.parent = this;
            if (d.get(this).virginity)
            {
                document.body.innerHTML = "";
                d.get(this).virginity = false;
            }
            if (child.get)
            {
                if (document.fullscreenElement)
                {
                    document.fullscreenElement.appendChild(child.get());
                }
                else
                {
                    document.body.appendChild(child.get());
                }
            }
        }

        get()
        {
            return document.body;
        }
    };

});