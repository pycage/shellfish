/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", "shellfish/core"], function (low, core)
{
    const POINTER_EVENT = !! window.PointerEvent;

    /**
     * A generic event.
     * @typedef Event
     * @memberof html.Document
     */
    function makeEvent(ev)
    {
        return {
            original: ev,
            accepted: false
        };
    }

    /**
     * A keyboard event.
     * @typedef KeyEvent
     * @memberof html.Document
     */
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

    function restoreFocusWithin(target)
    {
        let maxTime = -1;
        let focusable = null;
        
        target.visit(obj =>
        {
            //console.log("visiting " + obj.objectType + "@" + obj.objectLocation + " " + obj.enabled);
            if (obj.canFocus && obj.visible && obj.enabled)
            {
                const focusTime = Number.parseFloat(obj.get().dataset.shFocusTime) || 0;
                if (focusTime > maxTime)
                {
                    focusable = obj;
                    maxTime = focusTime;
                }
            }

            // only visit children of visible and enabled objects
            return obj.visible && obj.enabled;
        });

        if (focusable)
        {
            console.log("Restored focus to " + focusable.objectType + "@" + focusable.objectLocation + ", last focused " + maxTime);
            focusable.get().focus({ preventScroll: true });
        }
    }

    const d = new WeakMap();

    /**
     * Class representing the root document.
     * 
     * @extends core.Object
     * @memberof html
     *
     * @property {bool} active - [readonly] Whether the document is currently active (the window and tab have focus).
     * @property {object} bbox - [readonly] The current bounding box.
     * @property {string} color - The document's background color.
     * @property {number} contentHeight - [readonly] The current scrolling viewport height.
     * @property {number} contentWidth - [readonly] The current scrolling viewport width.
     * @property {number} contentX - (default: `0`) The current horizontal scrolling position.
     * @property {number} contentY - (default: `0`) The current vertical scrolling position.
     * @property {html.Item} fullscreenItem - (default: `null`) The current item shown in fullscreen mode.
     * @property {string} inputDevice - [readonly] The currently active input device: mouse|touch|pen|keyboard
     * @property {bool} scrollbars - (default: `false`) Whether to show native scrollbars.
     * @property {bool} systemDarkMode - [readonly] Whether the system is in dark mode (Windows 10, MacOS, Android).
     * @property {string} title - The document's title.
     * @property {number} windowWidth - [readonly] The current width of the document window.
     * @property {number} windowHeight - [readonly] The current height of the document window.
     */
    class Document extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                active: true,
                inSizeUpdate: false,
                virginity: true,
                scrollbars: false,
                systemDarkMode: false,
                color: this.colorName("white"),
                inputDevice: "mouse",
                fullscreenItem: null,
                pointerX: 0,
                pointerY: 0
            });

            low.css(document.body, "background-color", "white");

            this.notifyable("active");
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
            this.notifyable("bboxX");
            this.notifyable("bboxY");
            this.notifyable("bboxWidth");
            this.notifyable("bboxHeight");
            this.notifyable("fullscreenItem");

            /**
             * Is triggered when the browser context menu is requested.
             * Binding to this event and accepting it prevents the default context menu from showing up.
             * @event contextMenu
             * @param {html.Document.Event} event - The event object.
             * @memberof html.Document
             */
            this.registerEvent("contextMenu");

            /**
             * Is triggered when a key is pressed while the document has keyboard
             * focus.
             * @event keyDown
             * @param {html.Document.KeyEvent} event - The event object.
             * @memberof html.Document
             */
            this.registerEvent("keyDown");

            /**
             * Is triggered when a key is released while the item has keyboard
             * focus.
             * @event keyUp
             * @param {html.Document.KeyboardEvent} event - The event object.
             * @memberof html.Document
             */
             this.registerEvent("keyUp");

            document.documentElement.classList.add("sh-no-scrollbars");

            this.addHtmlEventListener(window, "resize", ev =>
            {
                this.windowWidthChanged();
                this.windowHeightChanged();
                this.updateSizeFrom(null, false);
            }, { passive: true });

            this.addHtmlEventListener(window, "scroll", ev =>
            {
                this.updateSizeFrom(null, false);

                this.contentXChanged();
                this.contentYChanged();
                this.trigger("scroll");
            }, { passive: true });

            // detect the operation mode (mouse vs touch)
            if (POINTER_EVENT)
            {
                this.addHtmlEventListener(document, "pointermove", ev =>
                {
                    const priv = d.get(this);
                    priv.pointerX = ev.clientX;
                    priv.pointerY = ev.clientY;
                    if (priv.inputDevice !== ev.pointerType)
                    {
                        priv.inputDevice = ev.pointerType;
                        this.inputDeviceChanged();
                    }
                }, { passive: true, capture: true });
            }
            else
            {
                this.addHtmlEventListener(document, "mousemove", ev =>
                {
                    const priv = d.get(this);
                    priv.pointerX = ev.clientX;
                    priv.pointerY = ev.clientY;
                    if (priv.inputDevice !== "mouse")
                    {
                        priv.inputDevice = "mouse";
                        this.inputDeviceChanged();
                    }
                }, { passive: true, capture: true });
            }

            // and a workaround for Firefox which may have pointer events
            // disabled by default
            this.addHtmlEventListener(window, "touchstart", ev =>
            {
                if (d.get(this).inputDevice !== "touch")
                {
                    d.get(this).inputDevice = ev.pointerType;
                    this.inputDeviceChanged();
                }
            }, { passive: true, capture: true });

            this.addHtmlEventListener(document.body, "contextmenu", (ev) =>
            {
                const e = makeEvent(ev);
                this.contextMenu(e);
                if (e.accepted)
                {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            });

            this.addHtmlEventListener(window, "keydown", (ev) =>
            {
                if (d.get(this).inputDevice !== "keyboard")
                {
                    d.get(this).inputDevice = "keyboard";
                    this.inputDeviceChanged();
                }

                const e = makeKeyEvent(ev);
                this.keyDown(e);
                if (e.accepted)
                {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            });

            this.addHtmlEventListener(window, "keyup", (ev) =>
            {
                const e = makeKeyEvent(ev);
                this.keyUp(e);
                if (e.accepted)
                {
                    ev.stopPropagation();
                    ev.preventDefault();
                }
            });

            this.addHtmlEventListener(window, "focus", (ev) =>
            {
                d.get(this).active = true;
                this.activeChanged();
            });

            this.addHtmlEventListener(window, "blur", (ev) =>
            {
                d.get(this).active = false;
                this.activeChanged();
            });

            this.addHtmlEventListener(window, "focusin", (ev) =>
            {
                // activate focus trap
                if (ev.target !== document.body)
                {
                    const focusEv = new CustomEvent("sh-focusChanged", { detail: document.activeElement });
                    document.dispatchEvent(focusEv);
                }
            });

            this.addHtmlEventListener(window, "focusout", (ev) =>
            {
                this.wait(100)
                .then(() =>
                {
                    if (document.activeElement === document.body)
                    {
                        restoreFocusWithin(this);
                    }
                });
            });

            // monitor focus changes
            this.addHtmlEventListener(document, "sh-focusChanged", ev =>
            {
                const activeTraps = [];
                
                // call out for focus traps
                const trapEv = new CustomEvent("sh-trapFocus", {
                    detail: {
                        target: ev.detail,
                        trap: (which) => { activeTraps.push(which); }
                    }
                });
                document.dispatchEvent(trapEv);

                // trigger most recent focus trap
                if (activeTraps.length > 0)
                {
                    //console.log("Found " + activeTraps.length + " focus traps.");
                    const focusTrap = activeTraps[activeTraps.length - 1];
                    if (focusTrap)
                    {
                        console.log("Activated focus trap: " + focusTrap.objectType + "@" + focusTrap.objectLocation);
                        restoreFocusWithin(focusTrap);
                    }
                }
            });

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
                    d.get(this).systemDarkMode = ev.matches;
                    this.systemDarkModeChanged();
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

            // make sure the reference count of document does not reach 0
            this.referenceAdd(null);
        }

        get systemDarkMode() { return d.get(this).systemDarkMode; }

        get inputDevice() { return d.get(this).inputDevice; }

        get title() { return document.title; }
        set title(t)
        {
            document.title = t;
            this.titleChanged();
        }

        get active() { return d.get(this).active; }

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

        get bboxX() { return this.bbox.x; }
        get bboxY() { return this.bbox.y; }
        get bboxWidth() { return this.bbox.width; }
        get bboxHeight() { return this.bbox.height; }

        get color() { return d.get(this).color; }
        set color(c)
        {
            const col = typeof c === "string" ? this.colorName(c) : c;
            low.css(document.body, "background-color", col.toCss());
            d.get(this).color = col;
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

        get pointerX() { return d.get(this).pointerX; }
        get pointerY() { return d.get(this).pointerY; }

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
                this.bboxWidthChanged();
                this.bboxHeightChanged();
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
                const node = child.get();
                if (node.parentNode)
                {
                    node.parentNode.removeChild(node);
                }
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
    }
    exports.Document = Document;

});