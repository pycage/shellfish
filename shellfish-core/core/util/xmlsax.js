/*******************************************************************************
This file is part of the Shellfish toolkit.
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

exports.__id = "shellfish/core/xmlsax";

/**
 * Class representing a XML SAX parser using the given handler for
 * invoking callbacks.
 */
class Parser
{
    constructor(handler)
    {
        this.handler = handler;
    }

    throwError(pos, description)
    {
        throw { "pos": pos, "description": description };
    }

    /**
     * Parses the given string.
     */
    parseString(data)
    {
        try
        {
            this.parseDocument(data, 0);
        }
        catch (err)
        {
            this.handler.error(err.pos, err.description);
        }
    }

    eatWhitespace(data, pos)
    {
        while (pos < data.length && " \n\r\t".indexOf(data[pos]) !== -1)
        {
            ++pos;
        }
        return pos;
    }

    accept(data, pos, s)
    {
        if (pos >= data.length || data.substring(pos, pos + s.length) !== s)
        {
            this.throwError(pos, s + " expected: " + data.substring(pos, pos + 16));
        }
        return pos + s.length;
    }

    parseDocument(data, pos)
    {
        pos = this.eatWhitespace(data, pos);

        if (pos < data.length && data.substring(pos, pos + 2) === "<?")
        {
            pos = this.parseHeader(data, pos);
        }

        pos = this.eatWhitespace(data, pos);

        while (pos < data.length)
        {
            if (data.substring(pos, pos + 4) === "<!--")
            {
                pos = this.parseComment(data, pos);
            }
            else if (data.substring(pos, pos + 8) === "<![CDATA[")
            {
                pos = this.parseCData(data, pos);
            }
            else if (data[pos] === "<")
            {
                pos = this.parseTag(data, pos);
            }
            else
            {
                pos = this.parsePCData(data, pos);
            }
            pos = this.eatWhitespace(data, pos);
        }

        this.handler.end();
    }

    parseHeader(data, pos)
    {
        pos = this.accept(data, pos, "<?");
        pos = this.eatWhitespace(data, pos);

        let res = this.parseName(data, pos);
        const name = res.name;
        pos = res.pos;
        //console.log("header name: " + name);

        pos = this.eatWhitespace(data, pos);

        while (pos < data.length && data.substring(pos, pos + 2) !== "?>")
        {
            res = this.parseAttribute(data, pos);
            const attrName = res.name;
            const attrValue = res.value;
            pos = res.pos;
            pos = this.eatWhitespace(data, pos);
        }

        pos = this.accept(data, pos, "?>");
        return pos;
    }

    parseTag(data, pos)
    {
        let isOpening = true;
        let isClosing = false;

        pos = this.accept(data, pos, "<");
        if (pos < data.length && data[pos] === "/")
        {
            pos = this.accept(data, pos, "/");
            isOpening = false;
            isClosing = true;
        }
        pos = this.eatWhitespace(data, pos);
        let res = this.parseName(data, pos);
        const name = res.name;
        pos = res.pos;

        pos = this.eatWhitespace(data, pos);

        const attrs = { };

        while (pos < data.length && data[pos] !== "/" && data[pos] !== ">")
        {
            res = this.parseAttribute(data, pos);
            const attrName = res.name;
            const attrValue = res.value;
            attrs[attrName] = attrValue;
            pos = res.pos;
            pos = this.eatWhitespace(data, pos);
        }

        if (data[pos] === "/")
        {
            pos = this.accept(data, pos, "/");
            isClosing = true;
        }

        pos = this.eatWhitespace(data, pos);
        pos = this.accept(data, pos, ">");

        this.handler.tag(name, attrs, isOpening, isClosing);

        return pos;
    }

    parseComment(data, pos)
    {
        pos = this.accept(data, pos, "<!--");

        let comment = "";
        while (pos < data.length && data.substring(pos, pos + 3) !== "-->")
        {
            comment += data[pos];
            ++pos;
        }

        pos = this.accept(data, pos, "-->");

        this.handler.comment(comment);

        return pos;
    }

    parseCData(data, pos)
    {
        pos = this.accept(data, pos, "<![CDATA[");
        let cdata = "";
        while (pos < data.length && data.substring(pos, pos + 3) !== "]]>")
        {
            cdata += data[pos];
            ++pos;
        }

        pos = this.accept(data, pos, "]]>");

        this.handler.cdata(cdata);

        return pos;
    }

    parsePCData(data, pos)
    {
        let pcdata = "";
        while (pos < data.length && data[pos] !== "<")
        {
            pcdata += data[pos];
            ++pos;
        }

        this.handler.pcdata(pcdata);

        return pos;
    }

    parseName(data, pos)
    {
        let name = "";
        while (pos < data.length && data[pos].match(/[a-zA-Z0-9:]/))
        {
            name += data[pos];
            ++pos;
        }

        if (name === "")
        {
            this.throwError(pos, "unexpected character");
        }

        return { "name": name, "pos": pos };
    }

    parseAttribute(data, pos)
    {
        let res = this.parseName(data, pos);
        const name = res.name;
        let value = null;
        pos = res.pos;
        pos = this.eatWhitespace(data, pos);
        if (pos < data.length && data[pos] === "=")
        {
            pos = this.accept(data, pos, "=");
            pos = this.eatWhitespace(data, pos);
            res = this.parseValue(data, pos);
            value = res.value;
            pos = res.pos;
        }

        return { "name": name, "value": value, "pos": pos };
    }

    parseValue(data, pos)
    {
        let value = "";

        if (data[pos] === "'")
        {
            pos = this.accept(data, pos, "'");
            while (pos < data.length && data[pos] !== "'")
            {
                value += data[pos];
                ++pos;
            }
            pos = this.accept(data, pos, "'");
        }
        else if (data[pos] === "\"")
        {
            pos = this.accept(data, pos, "\"");
            while (pos < data.length && data[pos] !== "\"")
            {
                value += data[pos];
                ++pos;
            }
            pos = this.accept(data, pos, "\"");
        }
        else
        {
            while (pos < data.length && data[pos].match(/^[ \r\n\t/>]/))
            {
                value += data[pos];
                ++pos;
            }
        }

        return { "value": value, "pos": pos };
    }
}
exports.Parser = Parser;

class Handler
{
    constructor()
    {
        this.xmlDocument = null;
        this.stack = [];
    }

    resolveNamespace(name, attrs)
    {
        let ns = "";
        if (name.indexOf(":") !== -1)
        {
            const parts = name.split(":");
            ns = parts[0];
            name = parts[1];
        }

        if (ns === "" && attrs["xmlns"])
        {
            return attrs["xmlns"] + ":" + name;
        }
        else if (attrs["xmlns:" + ns])
        {
            return attrs["xmlns:" + ns] + ":" + name;
        }

        for (let i = this.stack.length - 1; i >= 0; --i)
        {
            if (ns === "" && this.stack[i].attributes["xmlns"])
            {
                return this.stack[i].attributes["xmlns"] + ":" + name;
            }
            else if (this.stack[i].attributes["xmlns:" + ns])
            {
                return this.stack[i].attributes["xmlns:" + ns] + ":" + name;
            }
        }
        return name;
    }

    tag(name, attrs, isOpening, isClosing)
    {
        const resolvedAttrs = {};
        for (let key in attrs)
        {
            if (attrs.hasOwnProperty(key))
            {
                if (key.indexOf("xmlns") === 0)
                {
                    resolvedAttrs[key] = attrs[key];
                }
                else
                {
                    resolvedAttrs[this.resolveNamespace(key, attrs)] = attrs[key];
                }
            }
        }

        const tagObj = {
            "type": "tag",
            "name": this.resolveNamespace(name, attrs),
            "attributes": resolvedAttrs,
            "children": []
        };

        if (this.xmlDocument === null)
        {
            this.xmlDocument = tagObj;
            this.stack.push(tagObj);
        }
        else
        {
            if (isOpening)
            {
                const parent = this.stack[this.stack.length - 1];
                parent.children.push(tagObj);
                this.stack.push(tagObj);
            }
            if (isClosing)
            {
                const current = this.stack[this.stack.length - 1];
                if (tagObj.name === current.name)
                {
                    this.stack.pop();
                }
                else
                {
                    console.log("nesting error: " + tagObj.name);
                }
            }
        }
    }

    pcdata(pcdata)
    {
        const obj = {
            "type": "pcdata",
            "data": pcdata
        };
        const parent = this.stack[this.stack.length - 1];
        parent.children.push(obj);
    }

    cdata(cdata)
    {
        const obj = {
            "type": "cdata",
            "data": cdata
        };
        const parent = this.stack[this.stack.length - 1];
        parent.children.push(obj);
    }

    comment(comment)
    {
        //console.log("Comment: " + comment);
    }

    end()
    {
        //console.log("Finished: " + JSON.stringify(this.xmlDocument));
    }

    error(pos, description)
    {
        console.log("Parse error at position " + pos + ": " + description);
        this.xmlDocument = null;
    }

    document() { return this.xmlDocument; }
}
exports.Handler = Handler;
