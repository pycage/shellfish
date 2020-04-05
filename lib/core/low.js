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

exports.__id = "shellfish/low";


/**
 * Escapes the given text for HTML output.
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
 * Resolves icons in the given text.
 * Icons are encoded by [icon:<name>].
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
        out += tag("span").class("sh-fw-icon sh-icon-" + iconName).html();

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
 * Converts pixels to rem units.
 * 
 * @param {number} px - The pixel value to convert.
 * @return {number} The amount in rem units.
 */
function pxToRem(px)
{
    let fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return px / parseFloat(fontSize);
}
exports.pxToRem = pxToRem;

/**
 * Converts rem units to pixels.
 * 
 * @param {number} rem - The rem units to convert.
 * @return {number} The amount of pixels.
 */
function remToPx(rem)
{
    let fontSize = window.getComputedStyle(document.querySelector("html"))["font-size"];
    return rem * parseFloat(fontSize);
}
exports.remToPx = remToPx;

/**
 * Sets or returns the value of the given CSS property.
 * 
 * @param {object} target - The target DOM element.
 * @param {string} key - The CSS property key.
 * @param {string} value - The new value. Leave undefined to return the current value.
 * 
 * @return {string} The current value or undefined if setting the value.
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
 * Creates a DOM element tree from the given HTML code.
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


var tag;
(function ()
{
    /**
     * Class representing a tag tree node.
     * @constructor
     * 
     * @param {string} t - The tag name.
     */
    var Tag = function (t)
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
    
        this.attr = function (key, value)
        {
            m_attrs.push([key, value]);
            return that;
        };
        
        this.style = function (key, value)
        {
            m_style.push([key, value]);
            return that;
        };
    
        this.id = function (s)
        {
            m_attrs.push(["id", s]);
            return that;
        };
        
        this.class = function (c)
        {
            m_attrs.push(["class", c]);
            return that;
        };
    
        this.data = function (d, v)
        {
            m_attrs.push(["data-" + d, v]);
            return that;
        }
    
        this.on = function (ev, handler)
        {
            m_attrs.push(["on" + ev, handler]);
            return that;
        };
    
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
    
    var Data = function (d)
    {
        var m_data = d;
    
        this.html = function ()
        {
            return m_data;
        }
    }
    
    /**
     * Creates a new tag tree node.
     * 
     * @param {string} t - The tag name.
     * @returns {object} The new node.
     */
    tag = function (t)
    {
        return new Tag(t);
    }
    exports.tag = tag;
})();

/* Returns if fullscreen mode is currently active.
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
 * @param {object} target - The DOM element to show fullscreen.
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

/**
 * Registers a repeating animation frame handler and returns a handle for
 * removing.
 * 
 * @param {function} handler - The handler function.
 * @return {string} The handle.
 */
exports.registerAnimationFrameHandler = function (handler)
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

    return handle;
};

/**
 * Removes the given animation frame handler.
 * 
 * @param {string} handle - The handle of the handler to remove.
 */
exports.removeAnimationFrameHandler = function (handle)
{
    animationFrameHandlers.delete(handle);
};

/**
 * Registers a topdown-event on the given DOM node.
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
 * Triggers the given topdown-event on a DOM node.
 * 
 * @param {object} node - The DOM node.
 * @param {string} name - The name of the event.
 */
exports.triggerTopDownEvent = function (node, name)
{
    let ev = new Event(name);
    node.dispatchEvent(ev);
};