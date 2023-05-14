/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2020 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", "shellfish/core", __dirname + "/object.js"], function (low, core, obj)
{
    let d = new WeakMap();

    /**
     * A list model enumerating all connected gamepads.
     * 
     * Each game pad is represented by an item `{ index, name }`.
     * 
     * @extends core.ListModel
     * @memberof html
     */
    class GamepadModel extends core.ListModel
    {
        constructor()
        {
            super();

            const uiObj = new obj.Object();
            this.add(uiObj);

            uiObj.addHtmlEventListener(window, "gamepadconnected", (ev) =>
            {
                this.update();
            });

            uiObj.addHtmlEventListener(window, "gamepaddisconnected", (ev) =>
            {
                this.update();
                const handle = low.addFrameHandler(() =>
                {
                    handle.cancel();
                    this.update();
                }, this.objectType + "@" + this.objectLocation);
            });

            this.onInitialization = () =>
            {
                this.update();
            };

        }

        update()
        {
            const pads = navigator.getGamepads();
            const items = [];

            console.log(pads);

            for (let i = 0; i < pads.length; ++i)
            {
                const pad = pads[i];
                if (pad && pad.connected)
                {
                    items.push({
                        index: pad.index,
                        name: pad.id,
                        connected: true
                    });                    
                }
            }

            this.reset(items);
        }
    }
    exports.GamepadModel = GamepadModel;
});