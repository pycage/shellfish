/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/object.js"], function (low, obj)
{
    const d = new WeakMap();

    exports.ParallelAnimation = class ParallelAnimation extends obj.Object
    {
        constructor()
        {
            super();
            this._sh_animation = true;
            d.set(this, {
                animations: []
            });

            this.registerEvent("finished");
        }

        start()
        {
            const animations = d.get(this).animations.slice();
            let counter = animations.length;

            animations.forEach((anim) =>
            {
                anim.finished = () =>
                {
                    anim.disconnect("onFinished", this);
                    --counter;
                    if (counter === 0)
                    {
                        this.finished();
                    }
                };
                anim.start();
            });
        }

        add(child)
        {
            if (child._sh_animation)
            {
                d.get(this).animations.push(child);
            }
            else
            {
                console.error("Only animations may be added to a ParallelAnimation.");
            }
        }
    };
});