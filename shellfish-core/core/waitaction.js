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
     * Class representing a waiting action.
     * 
     * The waiting may be aborted by setting the `enabled` property to `false`.
     * 
     * @memberof core
     * @extends core.Action
     * 
     * @property {function} until - A predicate function taking the current timestamp and returning the timestamp until when to wait.
     */
    class WaitAction extends act.Action
    {
        constructor()
        {
            super();
            d.set(this, {
                until: now => now + 1000
            });

            this.notifyable("until");

            this.onStatusChanged = () =>
            {
                if (this.status === "stopping")
                {
                    this.abortWait("wait");
                }
            };
        }

        get until() { return d.get(this).until; }
        set until(f)
        {
            d.get(this).until = f;
            this.untilChanged();
        }

        /**
         * Returns a predicate function for waiting a given amount of seconds.
         * 
         * @param {number} n - The number of seconds to wait.
         * @return {function} The predicate function.
         */
        seconds(n)
        {
            return now => now + n * 1000;
        }

        /**
         * Returns a predicate function for waiting until the seconds hand of
         * clock reaches the given point.
         * 
         * @param {number} n - The point to wait for.
         * @return {function} The predicate function.
         */
        atSecond(n)
        {
            return now =>
            {
                const base = now - now % (60 * 1000);
                let target = base + n * 1000;
                if (target < now)
                {
                    target += 60 * 1000;
                }
                return target;
            };
        }

        /**
         * Returns a predicate function for waiting until the minutes hand of
         * clock reaches the given point.
         * 
         * @param {number} n - The point to wait for.
         * @return {function} The predicate function.
         */
        atMinute(n)
        {
            return now =>
            {
                const base = now - now % (3600 * 1000);
                let target = base + n * 60 * 1000;
                if (target < now)
                {
                    target += 3600 * 1000;
                }
                return target;
            };
        }

        /**
         * Returns a predicate function for waiting until the hours hand of
         * clock reaches the given point.
         * 
         * @param {number} n - The point to wait for, given in UTC time.
         * @return {function} The predicate function.
         */
        atUtcHour(n)
        {
            return now =>
            {
                const base = now - now % (24 * 3600 * 1000);
                let target = base + n * 3600 * 1000;
                if (target < now)
                {
                    target += 24 * 3600 * 1000;
                }
                return target;
            };
        }

        start()
        {           
            this.wait(0).then(async () =>
            {
                if (this.enabled)
                {
                    const now = Date.now();
                    const waitUntil = d.get(this).until(now);
                    const diff = Math.max(0, waitUntil - now);
    
                    await this.wait(diff, "wait");
                }
                if (this.lifeCycleStatus !== "destroyed")
                {
                    this.finish();
                }
            });

            return super.start();
        }
    }
    exports.WaitAction = WaitAction;

});
