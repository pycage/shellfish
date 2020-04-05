/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/../low.js", __dirname + "/item.js"], function (low, item)
{
    const d = new WeakMap();

    /* Class representing a camera view finder.
     */
    exports.CameraView = class CameraView extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                item: low.createElementTree(
                    low.tag("video")
                    .html()
                )
            });

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
            {
                navigator.mediaDevices.getUserMedia({ video: true })
                .then((stream) =>
                {
                    const video = d.get(this).item;
                    video.srcObject = stream;
                });
            }
        }

        play()
        {
            const video = d.get(this).item;
            video.play();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});