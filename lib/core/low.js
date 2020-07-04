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
const Tag = function (t)
{
    const NON_CLOSE_TAGS = [
        "link",
        "meta",
        "br",
        "hr",
        "img",
        "input"
    ];

    var that = this;
    var m_tag = t;
    var m_attrs = [];
    var m_style = [];
    var m_content = [];

    /**
     * Sets an attribute value.
     * 
     * @memberof low.Tag
     * @param {string} key - The attribute key.
     * @param {string} value - The attribute value.
     * @returns {Tag} This object for chaining further commands.
     */
    this.attr = function (key, value)
    {
        m_attrs.push([key, value]);
        return that;
    };
    
    /**
     * Sets a CSS property.
     * 
     * @memberof low.Tag
     * @param {string} key - The CSS property key.
     * @param {string} value - The CSS property value.
     * @returns {Tag} This object for chaining further commands.
     */
    this.style = function (key, value)
    {
        m_style.push([key, value]);
        return that;
    };

    /**
     * Sets the HTML ID value. HTML IDs must be unique within a document.
     * 
     * @memberof low.Tag
     * @param {string} id - The ID value.
     * @returns {Tag} This object for chaining further commands.
     */
    this.id = function (id)
    {
        m_attrs.push(["id", id]);
        return that;
    };
    
    /**
     * Adds a CSS class to the node. Multiple classes may be set by calling
     * this method multiple times.
     * 
     * @memberof low.Tag
     * @param {string} c - The class name.
     * @returns {Tag} This object for chaining further commands.
     */
    this.class = function (c)
    {
        m_attrs.push(["class", c]);
        return that;
    };

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
    this.data = function (d, v)
    {
        m_attrs.push(["data-" + d, v]);
        return that;
    }

    /**
     * Sets a DOM event handler.
     * 
     * @memberof low.Tag
     * @param {string} ev - The event name, e.g. `click`.
     * @param {string} handler - The event callback as string.
     * @returns {Tag} This object for chaining further commands.
     */
    this.on = function (ev, handler)
    {
        m_attrs.push(["on" + ev, handler]);
        return that;
    };

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
    this.content = function (c)
    {
        if (typeof c === "string")
        {
            m_content.push(new Data(c));
        }
        else
        {
            m_content.push(c);
        }
        return that;
    };

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
    this.child = function (n)
    {
        if (n >= 0)
        {
            return m_content[n];
        }
        else
        {
            return m_content[m_content.length + n];
        }
    };

    /**
     * Creates the HTML code representation of the tag node tree.
     * Use with {@link low.createElementTree} for creating a DOM node tree.
     * 
     * @memberof low.Tag
     * @return {string} The HTML code.
     */
    this.html = function ()
    {
        var out = "";
        if (m_tag !== "")
        {
            out += "<" + m_tag;
            m_attrs.forEach(function (a)
            {
                out += " " + a[0] + "=\"" + escapeHtml(a[1]) + "\"";
            });
            if (m_style.length > 0)
            {
                out += " style = \"";
                m_style.forEach(function (s)
                {
                    out += s[0] + ": " + s[1] + "; ";
                });
                out += "\"";
            }
            out += ">";
        }
        m_content.forEach(function (c)
        {
            out += c.html();
        });
        if (m_tag !== "")
        {
            if (NON_CLOSE_TAGS.indexOf(m_tag) === -1)
            {
                out += "</" + m_tag + ">\n";
            }
        }
        return out;
    };
};

const Data = function (d)
{
    const m_data = d;

    this.html = function ()
    {
        return m_data;
    }
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
 * @return {object} The handle with a `cancel()` method.
 */
exports.addFrameHandler = function (handler)
{
    let handle = new Date().getTime() + "" + animationFrameHandlers.size;
    animationFrameHandlers.set(handle, handler);

    if (animationFrameHandlers.size === 1)
    {
        window.requestAnimationFrame(function callback(timestamp)
        {
            for (let key of animationFrameHandlers.keys())
            {
                animationFrameHandlers.get(key)(timestamp);
            }
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
