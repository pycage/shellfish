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
     * Class representing an engine for simulating the physics of inertial motion
     * in up to three dimensions.
     * 
     * The engine works by taking samples of a motion repeatedly with the method
     * {@link core.InertialEngine#takeSample} and then applying the friction
     * with the method {@link core.InertialEngine#start}.
     * 
     * @extends core.Object
     * @memberof core
     * 
     * @property {number} friction - (default: `0.08`) The friction coefficient. A friction of `0` lets the inertial motion continue forever, while a friction of `1` allows no inertial motion.
     * @property {bool} running - [readonly] If the engine is currently running.
     */
    class InertialEngine extends obj.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                friction: 0.08,
                velocityX: 0,
                velocityY: 0,
                velocityZ: 0,
                sampleX: 0,
                sampleY: 0,
                sampleZ: 0,
                sampleTime: 0,
                running: false,
                abortFlag: false
            });

            this.notifyable("friction");
            this.notifyable("running");

            /**
             * Is triggered when a motion shall occur. This event is also
             * emitted while taking samples.
             * 
             * @event motion
             * @param {number} dx - The motion in X direction.
             * @param {number} dy - The motion in Y direction.
             * @param {number} dz - The motion in Z direction.
             * @memberof core.InertialEngine
             */
            this.registerEvent("motion");
        }

        get running() { return d.get(this).running; }

        get friction() {return d.get(this).friction; }
        set friction(f)
        {
            d.get(this).friction = f;
            this.frictionChanged();
        }

        /**
         * Resets the engine to the given initial coordinates.
         * 
         * @param {number} x - The X coordinate.
         * @param {number} [y = 0] - The Y coordinate.
         * @param {number} [z = 0] - The Z coordinate.
         */
        reset(x, y, z)
        {
            const priv = d.get(this);

            priv.running = false;
            this.runningChanged();
            priv.abortFlag = true;

            priv.sampleTime = Date.now();
            priv.sampleX = x;
            priv.sampleY = y || 0;
            priv.sampleZ = z || 0;
            priv.velocityX = 0;
            priv.velocityY = 0;
            priv.velocityZ = 0;
        }

        /**
         * Takes a sample with the given coordinates.
         * 
         * @param {number} x - The X coordinate.
         * @param {number} [y = 0] - The Y coordinate.
         * @param {number} [z = 0] - The Z coordinate.
         */
        takeSample(x, y, z)
        {
            const priv = d.get(this);

            const dx = priv.sampleX - x;
            const dy = priv.sampleY - (y || 0);
            const dz = priv.sampleZ - (z || 0);
            const now = Date.now();
            const dt = now - priv.sampleTime;
    
            if (dt > 0)
            {
                priv.velocityX = dx / dt;
                priv.velocityY = dy / dt;
                priv.velocityZ = dz / dt;
            }
    
            priv.sampleTime = now;
            priv.sampleX = x;
            priv.sampleY = y || 0;
            priv.sampleZ = z || 0;
    
            this.motion(dx, dy, dz);
        }

        /**
         * Starts the engine. This will emit a series of `motion` events until
         * the friction stopped the motion.
         */
        async start()
        {
            const priv = d.get(this);

            priv.running = true;
            this.runningChanged();
            priv.abortFlag = false;

            await this.wait(10);
            while (this.lifeCycleStatus !== "destroyed" && ! priv.abortFlag)
            {
                // apply simple physics
                const now = Date.now();
                const dt = now - priv.sampleTime;
                priv.sampleTime = now;
    
                const dx = priv.velocityX * dt;
                const dy = priv.velocityY * dt;
                const dz = priv.velocityZ * dt;
    
                if (dt < 100)
                {
                    this.motion(dx, dy, dz);                    
                    priv.velocityX = priv.velocityX * (1.0 - priv.friction);
                    priv.velocityY = priv.velocityY * (1.0 - priv.friction);
                    priv.velocityZ = priv.velocityZ * (1.0 - priv.friction);
                }
    
                if (dt >= 100 || (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) < 0.1))
                {
                    priv.running = false;
                    this.runningChanged();
                    break;
                }

                await this.wait(10);
            }
            priv.abortFlag = false;
        }

        /**
         * Stops the engine abruptly.
         */
        stop()
        {
            this.reset(d.get(this).sampleX, d.get(this).sampleY, d.get(this).sampleZ);
        }

    }
    exports.InertialEngine = InertialEngine;

});
