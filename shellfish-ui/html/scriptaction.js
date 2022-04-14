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
     * Class representing a script action during an animation.
     * 
     * @memberof mid
     * @extends html.Animation
     * 
     * @property {function} script - The function to execute.
     */
    class ScriptAction extends anim.Animation
    {
        constructor()
        {
            super();
            d.set(this, {
                script: () => { }
            });
        }

        get script() { return d.get(this).script; }
        set script(f)
        {
            d.get(this).script = f;
        }

        start()
        {
            const doRun = () =>
            {
                d.get(this).script();
                while (this.repeat)
                {
                    d.get(this).script();
                }
                this.finish();                
            };

            const handle = low.addFrameHandler(() =>
            {
                handle.cancel();
                doRun();
            });
            return super.start();
        }
    }
    exports.ScriptAction = ScriptAction;
});