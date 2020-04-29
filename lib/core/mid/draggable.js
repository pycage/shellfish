/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/../low.js", __dirname + "/box.js"], function (low, box)
{
    function makeDragEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            setData: (type, value) => { ev.dataTransfer.setData(type, value) },
            dropEffect: "copy"
        };
    }

    function makeDragEndEvent(ev)
    {
        return {
            original: ev,
            accepted: false
        };
    }


    /**
     * Class representing a draggable item for drag-and-drop operations.
     * 
     * @extends mid.Box
     * @memberof mid
     */
    exports.Draggable = class Draggable extends box.Box
    {
        constructor()
        {
            super();

            /**
             * Is triggered when the item starts being dragged.
             * @event dragStart
             * @param {object} event - The event object.
             * @memberof mid.Draggable
             */
            this.registerEvent("dragStart");
            /**
             * Is triggered when the drag operation has ended.
             * 
             * Note: There is no reliable way to check if the drag operation
             * ended successfully or was cancelled.
             * @event dragEnd
             * @param {object} event - The event object.
             */
            this.registerEvent("dragEnd");

 
            const item = this.get();
            item.draggable = true;

            item.addEventListener("dragstart", (ev) =>
            {
                const e = makeDragEvent(ev);
                this.dragStart(e);
                if (e.accepted)
                {
                    ev.stopPropagation();
                    ev.dataTransfer.dropEffect = e.dropEffect;
                    ev.dataTransfer.setDragImage(item, 0, 0);
                }
                else
                {
                    ev.preventDefault();
                }
            }, false);

            item.addEventListener("dragend", (ev) =>
            {
                console.log("drag end");
                console.log(ev.dataTransfer);
                this.dragEnd(makeDragEndEvent(ev));
                ev.stopPropagation();
            });

            item.addEventListener("mousedown", (ev) =>
            {
                ev.stopPropagation();
            }, false);

        }
    };
});