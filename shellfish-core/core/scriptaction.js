/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/action.js"], act =>
{
    const d = new WeakMap();

    /**
     * Class representing an action that runs a function script.
     * 
     * @memberof core
     * @extends core.Action
     * 
     * @property {function} script - The function to execute.
     */
    class ScriptAction extends act.Action
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
            this.wait(0).then(async () =>
            {
                if (this.enabled)
                {
                    try
                    {
                        const r = d.get(this).script();
                        if (r.constructor && r.constructor.name === "Promise")
                        {
                            await r;
                        }
                    }
                    catch (err)
                    {
    
                    }
                }
                this.finish();
            });

            return super.start();
        }
    }
    exports.ScriptAction = ScriptAction;
});
