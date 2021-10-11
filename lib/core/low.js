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
 * This module provides the low-level Shellfish API for working directly on the
 * HTML DOM and CSS.
 * 
 * When working with Shui or the high-level API, you normally do not have to
 * deal directly with this low-level API.
 * 
 * @example <caption>Importing in JavaScript</caption>
 * shRequire("shellfish/low", low =>
 * {
 *     ...
 * });
 * 
 * @example <caption>Importing in Shui</caption>
 * require "shellfish/low" as low;
 * 
 * Object {
 *     ...
 * }
 * 
 * @namespace low
 */

exports.__id = "shellfish/low";


/**
 * Escapes a text string for HTML output.
 * 
 * This function replaces certain characters in the text string by entities
 * (for example, "`<`" becomes "`&lt;`") so that the string may safely be output in
 * HTML.
 * 
 * @memberof low
 * 
 * @param {string} text - The text to escape.
 * @returns {string} The escaped text.
 */
function escapeHtml(text)
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
}
exports.escapeHtml = escapeHtml;

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
 * @example
 * const output = low.resolveIcons("This is an [icon:bug] icon.");
 * 
 * @memberof low
 * 
 * @param {string} text - The text to resolve.
 * @returns {string} HTML code containing the icons.
 */
function resolveIcons(text)
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
}
exports.resolveIcons = resolveIcons;

/**
 * Resolves inline markup in a text string. Use the character `\` to escape
 * the succeeding character.
 * 
 * Supported markups are:
 * * \**italic*\*
 * * \*\***bold**\*\*
 * * \__underlined_\_
 * 
 * @memberof low
 * 
 * @param {string} text - The text to resolve.
 * @returns {string} HTML code containing the formatting.
 */
function resolveMarkup(text)
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
}
exports.resolveMarkup = resolveMarkup;

/**
 * Converts pixels to rem units according to the current user settings.
 *
 * A CSS rem unit is the width of the character `m` in the document's
 * global font, font size, and display scale.
 * 
 * @see low.remToPx
 * 
 * @memberof low
 * 
 * @param {number} px - The pixel value to convert.
 * @return {number} The amount in rem units.
 */
function pxToRem(px)
{
    const fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return px / parseFloat(fontSize);
}
exports.pxToRem = pxToRem;

/**
 * Converts rem units to pixels according to the current user settings.
 * @see low.pxToRem
 * 
 * @memberof low
 * 
 * @param {number} rem - The rem units to convert.
 * @return {number} The amount of pixels.
 */
function remToPx(rem)
{
    const fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return rem * parseFloat(fontSize);
}
exports.remToPx = remToPx;

/**
 * Returns the current value of a CSS property.
 * 
 * @memberof low
 * 
 * @param {HTMLElement} target - The target DOM element.
 * @param {string} key - The CSS property key.
 * @returns {string} The current value.
 *//**
 * Sets the value of a CSS property.
 * 
  * @memberof low
 * 
 * @param {HTMLElement} target - The target DOM element.
 * @param {string} key - The CSS property key.
 * @param {string} value - The new value.
 */
function css(target, key, value)
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
}
exports.css = css;

/**
 * Creates a DOM element tree from a string of HTML code.
 * 
 * @memberof low
 * 
 * @example
 * low.createElementTree("&lt;div>&lt;h1>Title&lt;/h1>&lt;p>This is some text&lt;/p>&lt;/div>");
 * 
 * @param {string} html - The HTML code.
 * @returns {HTMLElement} The root node of the DOM element tree.
 */
function createElementTree(html)
{
    const node = document.createElement("div");
    node.innerHTML = html;

    return node.firstChild;
}
exports.createElementTree = createElementTree;


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
 * Class representing a HTML tag tree node.
 * 
 * The setter methods of this class return the tag object itself, which allows
 * for chaining multiple commands.
 * @see low.tag
 * 
 * @memberof low
 */
class Tag
{
    /**
     * This constructor is not exported. Use the function {@link low.tag} to
     * create a node instead.
     * 
     * @constructor
     * 
     * @param {string} t - The tag name.
     */
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
     * @param {string} key - The attribute key.
     * @param {string} value - The attribute value.
     * @returns {low.Tag} This object for chaining further commands.
     */
    attr(key, value)
    {
        d.get(this).attrs.push([key, value]);
        return this;
    }

    /**
     * Sets a CSS property.
     * 
     * @param {string} key - The CSS property key.
     * @param {string} value - The CSS property value.
     * @returns {low.blobTag} This object for chaining further commands.
     */
    style(key, value)
    {
        d.get(this).style.push([key, value]);
        return this;
    }

    /**
     * Sets the HTML ID value. HTML IDs must be unique within a document.
     * 
     * @param {string} id - The ID value.
     * @returns {low.Tag} This object for chaining further commands.
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
     * @param {string} c - The class name.
     * @returns {low.Tag} This object for chaining further commands.
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
     * @param {string} name - The data attribute name.
     * @param {string} value - The data attribute value.
     * @returns {low.Tag} This object for chaining further commands. 
     */
    data(name, value)
    {
        d.get(this).attrs.push(["data-" + name, value]);
        return this;
    }

    /**
     * Sets a DOM event handler.
     * 
     * @param {string} ev - The event name, e.g. `click`.
     * @param {string} handler - The event callback as string.
     * @returns {low.Tag} This object for chaining further commands.
     */
    on(ev, handler)
    {
        d.get(this).attrs.push(["on" + ev, handler]);
        return this;
    }

    /**
     * Adds a child node.
     * 
     * @param {low.Tag} c - The child node.
     * @returns {low.Tag} This object for chaining further commands.
     *//**
     * Adds content text on the node.
     * 
     * @param {string} c - The content text.
     * @returns {low.Tag} This object for chaining further commands.
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
     * @param {number} n - The number of the child.
     * @return {low.Tag} The n-th child node.
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
 * Creates a new HTML tag tree node.
 * 
 * Node trees are built by chaining commands.
 * 
 * @example
 * const tree = low.tag("div").class("item")
 *              .style("background-color", "black")
 *              .content(
 *                  low.tag("ol")
 *                  .content(
 *                      low.tag("li")
 *                      .content("First Item")
 *                  )
 *                  .content(
 *                      low.tag("li")
 *                      .content("Second Item")
 *                  )
 *              );
 * 
 * @memberof low
 * 
 * @param {string} t - The tag name.
 * @returns {low.Tag} The new node.
 */
function tag(t)
{
    return new Tag(t);
}
exports.tag = tag;

/**
 * Returns a list of all focusable HTML elements in the document. An element
 * is focusable, if it has the data role `sh-focusable` and is visible and
 * not disabled.
 * 
 * @memberof low
 * 
 * @returns {HTMLElement[]} The focusable elements.
 */
function focusables()
{
    const selector = ":not([class~=\"sh-hidden\"])" +
                     ":not([class~=\"sh-disabled\"])" +
                     " " +
                     "[data-role=\"sh-focusable\"]" +
                     ":not([class~=\"sh-hidden\"])" +
                     ":not([class~=\"sh-disabled\"])";

    return document.querySelectorAll(selector);
}
exports.focusables = focusables;

/**
 * Moves the keyboard focus to the previous focusable element.
 * 
 * @memberof low
 */
function focusPrevious()
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
}
exports.focusPrevious = focusPrevious;

/**
 * Moves the keyboard focus to the next focusable element.
 * 
 * @memberof low
 */
function focusNext()
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
}
exports.focusNext = focusNext;

/**
 * Returns whether fullscreen mode is currently active.
 * 
 * @memberof low
 * 
 * @return {bool} Whether fullscreen mode is active.
 */
function fullscreenStatus()
{
    var state = document.webkitIsFullScreen || 
                document.mozFullScreen ||
                document.fullScreen;

    return (state === true);
}
exports.fullscreenStatus = fullscreenStatus;

/**
 * Enters fullscreen mode with the given target element.
 * 
 * @memberof low
 * 
 * @param {HTMLElement} target - The DOM element to show fullscreen.
 */
function fullscreenEnter(target)
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
}
exports.fullscreenEnter = fullscreenEnter;

/**
 * Leaves fullscreen mode.
 * 
 * @memberof low
 */
function fullscreenExit()
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
}
exports.fullscreenExit = fullscreenExit;

const animationFrameHandlers = new Map();
let duringFrameUpdate = false;

/**
 * A handle for controlling a frame handler.
 * @see low.addFrameHandler
 * 
 * @typedef {Object} FrameHandle
 * @memberof low
 * @property {function} cancel - Cancels the frame handler.
 */

/**
 * Adds a repeating frame handler and returns a handle for cancelation.
 * 
 * If the system load and the screen refresh rate permit, 60 frames are rendered
 * per second.
 * 
 * For handlers that should only run once, invoke `cancel()` in the handler
 * function itself.
 * 
 * Multiple frame handlers may be active at the same time.
 * 
 * **Note:** The HTML environment decides when to run the frame handlers.
 * Browser windows or tabs may not invoke frame handlers at all while being
 * invisible or without focus.
 * 
 * @example <caption>Adding a repeating frame handler</caption>
 * const handle = low.addFrameHandler(() =>
 * {
 *     console.log("next frame");
 * });
 *
* @example <caption>Running a one-shot frame handler</caption>
 * const handle = low.addFrameHandler(() =>
 * {
 *     handle.cancel(); // run only once
 *     console.log("the frame handler was called");
 * });
 * 
 * @memberof  low
 * 
 * @param {function} handler - The handler function.
 * @param {string} [annotation = "<no annotation>"] - An optional annotation for identifying the handler for debugging purposes.
 * @return {low.FrameHandle} The handle with a `cancel()` method.
 */
function addFrameHandler(handler, annotation)
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
}
exports.addFrameHandler = addFrameHandler;

/**
 * Returns the annotations of the currently active frame handlers.
 * @see low.addFrameHandler
 * 
 * @memberof low
 * 
 * @returns {string[]} The annotations of the frame handlers.
 */
function activeFrameHandlers()
{
    const result = [];
    animationFrameHandlers.forEach((v, k) => result.push(v.annotation));
    return result;
}
exports.activeFrameHandlers = activeFrameHandlers;

/**
 * Returns if a frame update is currently ongoing, i.e. the program execution is
 * currently in the context of a frame handler.
 * @see low.addFrameHandler
 * 
 * @memberof low
 */
function isFrameUpdate()
{
    return duringFrameUpdate;
}
exports.isFrameUpdate = isFrameUpdate;

/**
 * Returns a Promise object that resolves when idle. You may use this to have
 * UI updates processed inbetween.
 * @returns {Promise} A Promise object.
 */
function later()
{
    return new Promise((resolve, reject) =>
    {
        setTimeout(() =>
        {
            resolve();
        }, 0);
    });
}
exports.later = later;

/**
 * Registers a custom topdown-event handler on the given DOM node.
 * 
 * A top-down event trickles down from parent to children, instead of
 * bubbling up from child to parent.
 * 
 * @memberof low
 * 
 * @param {object} node - The DOM node.
 * @param {string} name - The name of the event.
 * @param {function} cb - The callback function.
 */
function registerTopDownEvent(node, name, cb)
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
}
exports.registerTopDownEvent = registerTopDownEvent;

/**
 * Triggers the given custom topdown-event on a DOM node.
 * 
 * @memberof low
 * 
 * @param {object} node - The DOM node.
 * @param {string} name - The name of the event.
 */
function triggerTopDownEvent(node, name)
{
    let ev = new Event(name);
    node.dispatchEvent(ev);
}
exports.triggerTopDownEvent = triggerTopDownEvent;

/**
 * Offers the given blob for saving. This function may only be triggered by a
 * user action.
 * Depending on the browser settings, a file dialog may or may not appear for
 * the user to choose a filename, even if you provided a filename.
 * 
 * @memberof low
 * 
 * @param {Blob} blob - The blob to save.
 * @param {string} filename - The filename to save to.
 */
function saveBlob(blob, filename)
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
}
exports.saveBlob = saveBlob;

/**
 * Class for managing fetch requests.
 * 
 * Some platforms may bail out if a `fetch` operation is taking too long, which
 * can easily happen if there are requests waiting for their turn in the network
 * queue.
 * 
 * The `FetchManager` stores waiting requests in an internal queue to keep the
 * network queue clear of waiting requests in order to prevent certain platforms
 * from bailing out.
 * 
 * It also allows you to abort all pending requests at once on platforms
 * providing the AbortController API.
 * 
 * @memberof low
 * 
 * @param {number} [concurrencyLimit = 4] - The maximum amount of simultaneous fetch requests.
 */
class FetchManager
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

    /**
     * Fetches data from the given URL.
     * 
     * @param {string} url - The URL from where to fetch from.
     * @param {object} [options] - Optional options to the HTML5 `fetch` command.
     * @returns {Promise} The fetch Promise object.
     */
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

    /**
     * Fetches data from the given URL. The difference to {@link low.FetchManager.fetch}
     * is that the fetch operation is handled priorized by being prepended to
     * the front of the fetch queue.
     * 
     * @param {string} url - The URL from where to fetch from.
     * @param {object} [options] - Optional options to the HTML5 `fetch` command.
     * @returns {Promise} The fetch Promise object.
     */
    fetchPriorized(url, options)
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
            priv.queue.unshift({ url, options, resolve, reject });
            if (priv.queue.length === 1)
            {
                this.next();
            }
        });
    }

    /**
     * Aborts all ongoing and queued fetch requests issued by this `FetchManager`.
     * 
     * Ongoing requests are only abortable if the environment supports the
     * HTML5 AbortController API.
     */
    abort()
    {
        const priv = d.get(this);

        // abort the queued requests
        priv.queue.forEach(item => item.reject("aborted"));
        priv.queue.length = 0;

        // abort the active requests
        if (priv.aborter)
        {
            priv.aborter.abort();
            // can't reuse the old abort controller
            priv.aborter = new AbortController();
        }
    }
}
exports.FetchManager = FetchManager;
