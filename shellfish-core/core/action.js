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

shRequire([__dirname + "/object.js"], obj =>
{

    const d = new WeakMap();

    /**
     * Base class representing an abstract action.
     * 
     * An action runs when started and finishes after some time, emitting the
     * `begin` and `finish` events.
     * 
     * Derived classes must implement the `start()` method, which must call
     * `start()` from this superclass. After the derived action finished,
     * it must emit the `finish` event.
     * 
     * @memberof core
     * @extends core.Object
     * 
     * @property {bool} busy - [readonly] `true` while the action is running.
     * @property {bool} enabled - (default: `true`) If `false` this action is skipped.
     */
    class Action extends obj.Object
    {

        constructor()
        {
            super();
            this._sh_action = true;
            d.set(this, {
                busy: false,
                enabled: true,
                finishHandler: null
            });

            this.notifyable("busy");
            this.notifyable("enabled");

            /**
             * Is triggered when the action begins.
             * @event begin
             * @memberof core.Action
             */            
            this.registerEvent("begin");
            /**
             * Is triggered when the action finishes.
             * @event finish
             * @memberof core.Action
             */            
            this.registerEvent("finish");

            this.onBegin = () =>
            {
                d.get(this).busy = true;
                this.busyChanged();
            };

            this.onFinish = () =>
            {
                const f = d.get(this).finishHandler;
                if (f)
                {
                    d.get(this).finishHandler = null;
                    f();
                }
                d.get(this).busy = false;
                this.busyChanged();
            };
        }

        get busy() { return d.get(this).busy; }

        get enabled() { return d.get(this).enabled; }
        set enabled(e)
        {
            d.get(this).enabled = e;
            this.enabledChanged();
        }

        /**
         * Starts the action and returns a Promise.
         * 
         * @returns {Promise} A Promise that resolves when the animation finished.
         */
        start()
        {
            this.begin();

            return new Promise((resolve, reject) =>
            {
                d.get(this).finishHandler = resolve;
            });
        }
    }
    exports.Action = Action;

});