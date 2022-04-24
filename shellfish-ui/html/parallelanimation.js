/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/animation.js"], function (low, anim)
{
    const d = new WeakMap();

    /**
     * Class representing a parallel animation.
     * 
     * The parallel animation runs its child animations in parallel.
     * 
     * @memberof html
     * @extends html.Animation
     */
    class ParallelAnimation extends anim.Animation
    {
        constructor()
        {
            super();
            d.set(this, {
                animations: []
            });
        }

        start()
        {
            const doRun = () =>
            {
                const animations = d.get(this).animations.slice();
                const promises = animations.map(a => a.start());
    
                Promise.all(promises)
                .then(() =>
                {
                    if (this.repeat)
                    {
                        const handle = low.addFrameHandler(() =>
                        {
                            handle.cancel();
                            doRun();
                        });
                    }
                    else
                    {
                        this.finish();
                    }
                });
            };

            const handle = low.addFrameHandler(() =>
            {
                handle.cancel();
                doRun();
            });
            return super.start();
        }

        add(child)
        {
            if (child._sh_animation)
            {
                child.parent = this;
                d.get(this).animations.push(child);
            }
            else
            {
                console.error("Only animations may be added to a ParallelAnimation.");
            }
        }
    }
    exports.ParallelAnimation = ParallelAnimation;
});