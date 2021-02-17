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

/**
 * **Module ID:** `shellfish/low`
 * 
 * This module provides the low-level Shellfish API.
 * 
 * The low-level API works directly on the HTML DOM and CSS and is usually used
 * by the classes of the mid-level API.
 * 
 * When working with Shui or the high-level API, you normally do not have to
 * deal directly with the low-level API.
 * 
 * @module low
 */

exports.__id = "shellfish/low";


/**
 * Escapes a text string for HTML output.
 * 
 * This function replaces certain characters in the text string by entities
 * (for example, "`<`" becomes "`&gt;`") so that the string can safely be output in
 * HTML.
 * 
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
exports.escapeHtml = function (text)
{
    return text.replace(/[\"'&<>]/g, function (a)
    {
        return {
            '"': '&quot;',
            '\'': '&apos;',
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        }[a];
    });
};
const escapeHtml = exports.escapeHtml;

/**
 * Resolves icons in a text string.
 * 
 * Icons are encoded by `[icon:<name>]` where `<name>` is the name of the icon
 * to show. See the Icon Gallery in the
 * [Shellfish UI-Gallery](https://pycage.github.io/shellfish/ui-gallery)
 * for the icons available.
 * 
 * The icons come from a web font and are rendered as font glyphs.
 * 
 * @param {string} text - The text to resolve.
 * @returns {string} HTML code containing the icons.
 */
exports.resolveIcons = function (text)
{
    var out = "";
    var lastPos = 0;
    var pos = text.indexOf("[icon:");
    while (pos !== -1)
    {
        // copy everything up to the icon
        out += text.substring(lastPos, pos);

        // find icon name
        var endPos = text.indexOf("]", pos);
        var iconName = text.substring(pos + 6, endPos);

        // make icon
        out += exports.tag("span").class("sh-fw-icon sh-icon-" + iconName).html();

        // advance
        lastPos = endPos + 1;
        pos = text.indexOf("[icon:", lastPos);
    }

    // copy what's left
    out += text.substring(lastPos);

    return out;
};

/**
 * Resolves formatting markup in a text string.
 * 
 * @param {string} text - The text to resolve.
 * @returns {string} HTML code containing the formatting.
 */
exports.resolveMarkup = function (text)
{
    const modeStack = ["normal"];
    let out = "";
    for (let i = 0; i < text.length; ++i)
    {
        const c = text[i];
        const mode = modeStack[modeStack.length - 1];
        if (c === "\\")
        {
            ++i;
            out += text[i];
        }
        else if (c === "<")
        {
            while (text[i] !== ">")
            {
                out += text[i];
                ++i;
            }
            out += text[i];
        }
        else if (c === "_")
        {
            if (mode === "underline")
            {
                out += "</span>";
                modeStack.pop();
            }
            else
            {
                out += "<span class=\"sh-underline\">";
                modeStack.push("underline");
            }
        }
        else if (c === "*")
        {
            if (text[i + 1] === "*")
            {
                if (mode === "bold")
                {
                    out += "</span>";
                    modeStack.pop();
                }
                else
                {
                    out += "<span class=\"sh-bold\">";
                    modeStack.push("bold");
                }
                ++i;
            }
            else
            {
                if (mode === "italic")
                {
                    out += "</span>";
                    modeStack.pop();
                }
                else
                {
                    out += "<span class=\"sh-italic\">";
                    modeStack.push("italic");
                }
            }
        }
        else
        {
            out += c;
        }
    }
    while (modeStack.length > 1)
    {
        modeStack.pop();
        out += "</span>";
    }
    return out;
};

/**
 * Converts pixels to rem units according to the current user settings.
 * 
 * @param {number} px - The pixel value to convert.
 * @return {number} The amount in rem units.
 */
exports.pxToRem = function (px)
{
    let fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return px / parseFloat(fontSize);
};

/**
 * Converts rem units to pixels according to the current user settings.
 * 
 * @param {number} rem - The rem units to convert.
 * @return {number} The amount of pixels.
 */
exports.remToPx = function (rem)
{
    let fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return rem * parseFloat(fontSize);
};

/**
 * Returns the current value of a CSS property.
 * 
 * @param {object} target - The target DOM element.
 * @param {string} key - The CSS property key.
 * @return {string} The current value.
 */
/**
 * Sets the value of a CSS property.
 * 
 * @param {object} target - The target DOM element.
 * @param {string} key - The CSS property key.
 * @param {string} value - The new value.
 * @returns {undefined} nothing
 */
exports.css = function (target, key, value)
{
    if (value !== undefined && target.style)
    {
        //console.log("set css property " + key + ": " + value);
        target.style.setProperty(key, String(value));
    }
    else
    {
        const computed = window.getComputedStyle(target);
        return computed ? String(computed.getPropertyValue(key)).trim() : "";
    }
};

/**
 * Creates a DOM element tree from HTML code.
 * 
 * @param {string} html - The HTML code.
 * @returns {object} The root node of the DOM element tree.
 */
exports.createElementTree = function (html)
{
    const node = document.createElement("div");
    node.innerHTML = html;

    return node.firstChild;
};

const d = new WeakMap();

const NON_CLOSE_TAGS = [
    "link",
    "meta",
    "br",
    "hr",
    "img",
    "input"
];

/**
 * Class representing a tag tree node.
 * 
 * This constructor is not exported. Use the function {@link low.tag} to
 * create a node.
 * 
 * @constructor
 * @memberof low
 * 
 * @param {string} t - The tag name.
 */
class Tag
{
    constructor(t)
    {
        d.set(this, {
            tag: t,
            attrs: [],
            style: [],
            content: []
        });
    }

    /**
     * Sets an attribute value.
     * 
     * @memberof low.Tag
     * @param {string} key - The attribute key.
     * @param {string} value - The attribute value.
     * @returns {Tag} This object for chaining further commands.
     */
    attr(key, value)
    {
        d.get(this).attrs.push([key, value]);
        return this;
    }

    /**
     * Sets a CSS property.
     * 
     * @memberof low.Tag
     * @param {string} key - The CSS property key.
     * @param {string} value - The CSS property value.
     * @returns {Tag} This object for chaining further commands.
     */
    style(key, value)
    {
        d.get(this).style.push([key, value]);
        return this;
    }

    /**
     * Sets the HTML ID value. HTML IDs must be unique within a document.
     * 
     * @memberof low.Tag
     * @param {string} id - The ID value.
     * @returns {Tag} This object for chaining further commands.
     */
    id(id)
    {
        d.get(this).attrs.push(["id", id]);
        return this;
    }

    /**
     * Adds a CSS class to the node. Multiple classes may be set by calling
     * this method multiple times.
     * 
     * @memberof low.Tag
     * @param {string} c - The class name.
     * @returns {Tag} This object for chaining further commands.
     */
    class(c)
    {
        d.get(this).attrs.push(["class", c]);
        return this;
    }

    /**
     * Sets a data attribute.
     * 
     * Calling `tag.data("role", "page")` is the same as calling
     * `tag.attr("data-role", "page")`.
     * 
     * @memberof low.Tag
     * @param {string} d - The data attribute name.
     * @param {string} v - The data attribute value.
     * @returns {Tag} This object for chaining further commands. 
     */
    data(dat, v)
    {
        d.get(this).attrs.push(["data-" + dat, v]);
        return this;
    }

    /**
     * Sets a DOM event handler.
     * 
     * @memberof low.Tag
     * @param {string} ev - The event name, e.g. `click`.
     * @param {string} handler - The event callback as string.
     * @returns {Tag} This object for chaining further commands.
     */
    on(ev, handler)
    {
        d.get(this).attrs.push(["on" + ev, handler]);
        return this;
    }

    /**
     * Adds a child node.
     * 
     * @memberof low.Tag
     * @param {low.Tag} c - The child node.
     * @returns {Tag} This object for chaining further commands.
     */
    /**
     * Adds content text on the node.
     * 
     * @memberof low.Tag
     * @param {string} c - The content text.
     * @returns {Tag} This object for chaining further commands.
     */
    content(c)
    {
        if (typeof c === "string")
        {
            d.get(this).content.push(new Data(c));
        }
        else
        {
            d.get(this).content.push(c);
        }
        return this;
    }

    /**
     * Returns the n-th child of the node.
     * 
     * Negative values for `n` may be used to count from the end of the
     * list of children. For example, `-1` returns the last child.
     * 
     * @memberof low.Tag
     * @param {number} n - The number of the child.
     * @return {Tag} The n-th child node.
     */
    child(n)
    {
        if (n >= 0)
        {
            return d.get(this).content[n];
        }
        else
        {
            return d.get(this).content[d.get(this).content.length + n];
        }
    }

    /**
     * Creates the HTML code representation of the tag node tree.
     * Use with {@link low.createElementTree} for creating a DOM node tree.
     * 
     * @memberof low.Tag
     * @return {string} The HTML code.
     */
    html()
    {
        const priv = d.get(this);
        const tag = priv.tag;
        const attrs = priv.attrs;
        const style = priv.style;

        let out = "";
        if (tag !== "")
        {
            out += "<" + tag;
            attrs.forEach(a =>
            {
                out += " " + a[0] + "=\"" + escapeHtml(a[1]) + "\"";
            });
            if (style.length > 0)
            {
                out += " style = \"";
                style.forEach(s =>
                {
                    out += s[0] + ": " + s[1] + "; ";
                });
                out += "\"";
            }
            out += ">";
        }
        priv.content.forEach(c =>
        {
            out += c.html();
        });
        if (tag !== "")
        {
            if (! NON_CLOSE_TAGS.includes(tag))
            {
                out += "</" + tag + ">\n";
            }
        }
        return out;
    }
}

class Data
{
    constructor(dat)
    {
        d.set(this, {
            data: dat
        });
    }
    html() { return d.get(this).data; }
}

/**
 * Creates a new tag tree node.
 * 
 * Node trees are built by chaining commands.
 * 
 * #### Example:
 * 
 *     const tree = low.tag("div").class("item")
 *                  .style("background-color", "black")
 *                  .content(
 *                      low.tag("ol")
 *                      .content(
 *                          low.tag("li")
 *                          .content("First Item")
 *                      )
 *                      .content(
 *                          low.tag("li")
 *                          .content("Second Item")
 *                      )
 *                  );
 * 
 * @param {string} t - The tag name.
 * @returns {Tag} The new node.
 */
exports.tag = function (t)
{
    return new Tag(t);
};

exports.focusables = function ()
{
    const selector = ":not([class~=\"sh-hidden\"])" +
                     ":not([class~=\"sh-disabled\"])" +
                     " " +
                     "[data-role=\"sh-focusable\"]" +
                     ":not([class~=\"sh-hidden\"])" +
                     ":not([class~=\"sh-disabled\"])";

    return document.querySelectorAll(selector);
};

exports.focusPrevious = function ()
{
    const whence = document.activeElement;
    const focusables = exports.focusables();
    let pos = -1;
    for (let i = 0; i < focusables.length; ++i)
    {
        if (focusables[i] === whence)
        {
            pos = i;
            break;
        }
    }
    if (pos > 0)
    {
        focusables[pos - 1].focus({ preventScroll: false });
    }
};

exports.focusNext = function ()
{
    const whence = document.activeElement;
    const focusables = exports.focusables();
    let pos = -1;
    for (let i = 0; i < focusables.length; ++i)
    {
        if (focusables[i] === whence)
        {
            pos = i;
            break;
        }
    }
    if (pos !== -1 && pos + 1 < focusables.length)
    {
        focusables[pos + 1].focus({ preventScroll: false });
    }
};

/**
 * Returns whether fullscreen mode is currently active.
 * 
 * @return {bool} Whether fullscreen mode is active.
 */
exports.fullscreenStatus = function ()
{
    var state = document.webkitIsFullScreen || 
                document.mozFullScreen ||
                document.fullScreen;

    return (state === true);
};

/**
 * Enters fullscreen mode with the given target element.
 * 
 * @param {object} target - The DOM element to show fullscreen.
 */
exports.fullscreenEnter = function (target)
{
    var e = target;
    if (e.webkitRequestFullscreen)
    {
        e.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.mozRequestFullScreen)
    {
        e.mozRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.msRequestFullscreen)
    {
        e.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
    else if (e.requestFullscreen)
    {
        e.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
};

/**
 * Leaves fullscreen mode.
 */
exports.fullscreenExit = function ()
{
    if (document.webkitExitFullscreen)
    {
        document.webkitExitFullscreen();
    }
    else if (document.mozCancelFullScreen)
    {
        document.mozCancelFullScreen();
    }
    else if (document.msExitFullscreen)
    {
        document.msExitFullscreen();
    }
    else if (document.exitFullscreen)
    {
        document.exitFullscreen();
    }
};

const animationFrameHandlers = new Map();
let duringFrameUpdate = false;

/**
 * Adds a repeating frame handler and returns a handle for cancelation.
 * 
 * If the system load and the screen refresh rate permit, 60 frames are rendered
 * per second.
 * 
 * #### Example:
 * 
 *     const handle = low.addFrameHandler(() =>
 *     {
 *         console.log("next frame");
 *     });
 *     
 *     ...
 *     
 *     handle.cancel();
 * 
 * For handlers that should only run once, invoke `cancel()` in the handler
 * function itself.
 * 
 *     const handle = low.addFrameHandler(() =>
 *     {
 *         handle.cancel();
 *         console.log("this runs only once");
 *     });
 * 
 * Multiple frame handlers may be active at the same time.
 * 
 * @param {function} handler - The handler function.
 * @param {string} annotation - An optional annotation to identify the handler.
 * @return {object} The handle with a `cancel()` method.
 */
exports.addFrameHandler = function (handler, annotation)
{
    let handle = Date.now() + "" + animationFrameHandlers.size;
    animationFrameHandlers.set(handle, { callback: handler, annotation: annotation || "<no annotation>" });

    if (animationFrameHandlers.size === 1)
    {
        /*
        let runCount = 0;
        let runHandle = handle;
        */
        window.requestAnimationFrame(function callback(timestamp)
        {
            /*
            const firstHandle = animationFrameHandlers.keys().next().value;
            if (firstHandle === runHandle)
            {
                ++runCount;
                if (runCount > 3000)
                {
                    const h = animationFrameHandlers.get(firstHandle);
                    const a = h.annotation;
                    console.warn(`The frame handler is continuously busy with the same callback (${firstHandle}, ${a}).`);
                    runCount = 0;
                }
            }
            else
            {
                runHandle = firstHandle;
                runCount = 0;
            }
            */

            //console.log(animationFrameHandlers.size + " handlers");
            duringFrameUpdate = true;
            for (let key of animationFrameHandlers.keys())
            {
                animationFrameHandlers.get(key).callback(timestamp);
            }
            duringFrameUpdate = false;
            if (animationFrameHandlers.size > 0)
            {
                window.requestAnimationFrame(callback);
            }
        });
    }

    return {
        cancel: () => { animationFrameHandlers.delete(handle); }
    };
};

/**
 * Returns the annotations of the currently active frame handlers.
 * 
 * @returns {string[]} The annotations of the frame handlers.
 */
exports.activeFrameHandlers = function ()
{
    const result = [];
    animationFrameHandlers.forEach((v, k) => result.push(v.annotation));
    return result;
};

/**
 * Returns if a frame update is currently ongoing.
 */
exports.isFrameUpdate = function ()
{
    return duringFrameUpdate;
};

/**
 * Registers a custom topdown-event handler on the given DOM node.
 * 
 * A top-down event trickles down from parent to children, instead of
 * bubbling up from child to parent.
 * 
 * @param {object} node - The DOM node.
 * @param {string} name - The name of the event.
 * @param {function} cb - The callback function.
 */
exports.registerTopDownEvent = function (node, name, cb)
{
    node.addEventListener(name, function ()
    {
        let ev = new Event(name);
        if (cb(ev))
        {
            for (let i = 0; i < node.children.length; ++i)
            {
                node.children[i].dispatchEvent(ev);
            }
        }
    });
};

/**
 * Triggers the given custom topdown-event on a DOM node.
 * 
 * @param {object} node - The DOM node.
 * @param {string} name - The name of the event.
 */
exports.triggerTopDownEvent = function (node, name)
{
    let ev = new Event(name);
    node.dispatchEvent(ev);
};

/**
 * Offers the given blob for saving. This function may only be triggered by a
 * user action.
 * Depending on the browser settings, a file dialog may or may not appear.
 * 
 * @param {Blob} blob - The blob to save.
 * @param {string} filename - The filename to save to.
 */
exports.saveBlob = function (blob, filename)
{
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Class for managing fetch requests.
 * 
 * Some platforms may bail out if a fetch operation is taking too long, which
 * can easily happen if there are requests waiting for their turn in the network
 * queue.
 * The FetchManager stores waiting requests in an internal queue to keep the
 * network queue clear of waiting requests in order to prevent certain platforms
 * from bailing out.
 * It also allows you to abort all pending requests at once on platforms
 * providing the AbortController API.
 */
exports.FetchManager = class FetchManager
{
    constructor(concurrencyLimit)
    {
        d.set(this, {
            concurrencyLimit: concurrencyLimit || 4,
            fetchCount: 0,
            queue: [],
            aborter: null
        });

        if (typeof AbortController !== "undefined")
        {
            d.get(this).aborter = new AbortController();
        }
    }

    next()
    {
        const priv = d.get(this);
        if (priv.queue.length > 0 && priv.fetchCount < priv.concurrencyLimit)
        {
            const item = priv.queue.shift();

            ++priv.fetchCount;
            fetch(item.url, item.options)
            .then(response =>
            {
                --priv.fetchCount;
                item.resolve(response);
                this.next();
            })
            .catch(err =>
            {
                --priv.fetchCount;
                item.reject(err);
                this.next();
            });
        }
    }

    fetch(url, options)
    {
        const priv = d.get(this);

        return new Promise((resolve, reject) =>
        {
            if (priv.aborter && options)
            {
                options.signal = priv.aborter.signal;
            }
            else
            {
                options = { signal: priv.aborter.signal };
            }
            priv.queue.push({ url, options, resolve, reject });
            if (priv.queue.length === 1)
            {
                this.next();
            }
        });
    }

    abort()
    {
        const priv = d.get(this);
        if (priv.aborter)
        {
            priv.queue.length = 0;
            priv.aborter.abort();
            // can't reuse the old abort controller
            priv.aborter = new AbortController();
        }
    }
};
