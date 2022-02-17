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

shRequire(["shellfish/low", "shellfish/core"], function (low, core)
{
    let d = new WeakMap();

    /**
     * Class representing a gamepad.
     * 
     * @extends core.Object
     * @memberof mid
     * 
     * @property {bool} connected - [readonly] Whether the gamepad is currently connected.
     * @property {bool} canRumble - [readonly] Whether the gamepad supports rumbling (force-feedback vibration).
     * @property {number} index - (default: `0`) The device index of the gamepad to read.
     * @property {string} name - [readonly] The name of the gamepad.
     * @property {number[]} axes - [readonly] Array of the axes' values.
     * @property {bool[]} buttons - [readonly] Array of the states of the buttons.
     * @property {number[]} triggers - [readonly] Array of the analog values of the buttons/triggers.
     */
    class Gamepad extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                index: 0,
                name: "",
                canRumble: false,
                connected: false,
                handle: null,
                axes: [],
                buttons: [],
                triggers: []
            });

            this.notifyable("canRumble");
            this.notifyable("connected");
            this.notifyable("index");
            this.notifyable("name");

            this.notifyable("axes");
            this.notifyable("buttons");
            this.notifyable("triggers");

            this.addHtmlEventListener(window, "gamepadconnected", (ev) =>
            {
                console.log("Gamepad connected");
                this.setupGamepad();
            });

            this.addHtmlEventListener(window, "gamepaddisconnected", (ev) =>
            {
                console.log("Gamepad disconnected");
                this.setupGamepad();
            });

            this.onDestruction = () =>
            {
                const priv = d.get(this);
                if (priv.handle)
                {
                    priv.handle.cancel();
                    priv.handle = null;
                }
            };
        }

        get connected() { return d.get(this).connected; }

        get index() { return d.get(this).index; }
        set index(idx)
        {
            d.get(this).index = idx;
            this.indexChanged();
            this.setupGamepad();
        }

        get name() { return d.get(this).name; }
        get canRumble() { return d.get(this).canRumble; }
        get axes() { return d.get(this).axes; }
        get buttons() { return d.get(this).buttons; }
        get triggers() { return d.get(this).triggers; }

        setupGamepad()
        {
            const priv = d.get(this);
            const pad = navigator.getGamepads()[priv.index];

            if (pad)
            {
                priv.connected = true;
                priv.name = pad.id;
                priv.canRumble = (pad.vibrationActuator && pad.vibrationActuator.type === "dual-rumble");

                if (! priv.handle)
                {
                    priv.handle = low.addFrameHandler(() =>
                    {
                        this.update();
                    }, this.objectType + "@" + this.objectLocation);
                }
            }
            else
            {
                priv.connected = false;
                priv.name = "";
                priv.canRumble = false;

                if (priv.handle)
                {
                    priv.handle.cancel();
                    priv.handle = null;
                }
            }

            this.connectedChanged();
            this.nameChanged();
            this.canRumbleChanged();
        }

        update()
        {
            const priv = d.get(this);

            const pad = navigator.getGamepads()[priv.index];
            if (pad)
            {
                priv.axes = pad.axes;
                priv.buttons = pad.buttons.map(btn => btn.pressed);
                priv.triggers = pad.buttons.map(btn => btn.value);
                this.axesChanged();
                this.buttonsChanged();
                this.triggersChanged();
            }
            else
            {
                priv.axes = [];
                priv.buttons = [];
                priv.triggers = [];
                this.axesChanged();
                this.buttonsChanged();
                this.triggersChanged();
            }
        }

        /**
         * Makes the gamepad rumble if supported.
         * 
         * @param {number} intensity - A value between `0` and `1` describing the rumbling intensity.
         * @param {number} duration - The rumbling duration in milliseconds.
         * @param {function} callback - An optional callback that tells when the rumbling is over.
         */
        rumble(intensity, duration, callback)
        {
            const priv = d.get(this);

            if (priv.canRumble)
            {
                const pad = navigator.getGamepads()[priv.index];
                pad.vibrationActuator.playEffect("dual-rumble", {
                    duration: duration,
                    strongMagnitude: intensity
                })
                .then(() =>
                {
                    if (callback)
                    {
                        callback();
                    }
                });
            }
        }
    }
    exports.Gamepad = Gamepad;
});