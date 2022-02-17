/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2020 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/fengshui.js"], (fengshui) =>
{
    if (typeof document !== "undefined")
    {
        let haveShui = false;
    
        const resolver = (name) =>
        {
            return undefined;
        };
    
        // load from data-shui, if specified
        const scripts = document.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; ++i)
        {
            const script = scripts[i];
    
            const shui = script.getAttribute("data-shui");
            if (shui && shui !== "")
            {
                fengshui.load(shui, resolver)
                .then(o =>
                {
                    o.get().init();
                });
                haveShui = true;
                break;
            }
        }
    
        if (! haveShui)
        {
            const s = window.location.search.substring(1);
            const parts = s.split("&");
            parts.forEach((p) =>
            {
                if (! haveShui)
                {
                    const item = p.split("=");
                    if (item[0] === "shui")
                    {
                        fengshui.load(item[1], resolver)
                        .then(o =>
                        {
                            o.get().init();
                        });
                        haveShui = true;
                    }
                }
            });
        }
    
        if (! haveShui)
        {
            document.write(`
                <h1>Failed to Load Shui Document</h1>
                <p>
                Please specify an entry point Shui document in the URL parameters, e.g.
                <p>
                <tt>https://example.com/index.html?shui=main.shui</tt>
                <hr>
                <i>Shellfish UI toolkit &copy; 2019 - 2022 Martin Grimme</i>
            `);
        }
    }

    exports.load = (url) =>
    {
        const resolver = (name) =>
        {
            return undefined;
        };

        fengshui.load(url, resolver)
        .then(o =>
        {
            o.get().init();
        })
        .catch (err =>
        {
            console.error("Failed to load Shui module: " + url + " " + err);
        });
    };
});
