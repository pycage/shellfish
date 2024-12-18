/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/box.js", __dirname + "/droparea.js"], function (low, box, dropArea)
{
    /**
     * A drag event.
     * 
     * Use the `setData` method to add payload data of various types and specify
     * the allowed operations with the `effectAllowed` property.
     * The drag operation only starts if you set `accepted` to `true`.
     * 
     * @typedef DragEvent
     * @memberof html.Draggable
     * 
     * @property {bool} accepted - (default: `false`) Set to `true` to accept the event.
     * @property {string} effectAllowed - (default: `"copy"`) Set to control the allowed drop effect. One of `copy|copyLink|copyMove|link|linkMove|all`.
     * @property {DragEvent} original - [readonly] The original HTML5 DragEvent object.
     * @property {function} setData - Takes two strings `type` and `value` for the MIME type and the data contents, respectively.
     */
    function makeDragEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            setData: (type, value) => { ev.dataTransfer.setData(type, value) },
            effectAllowed: "all"
        };
    }

    /**
     * A drag-end event.
     * 
     * @typedef DragEndEvent
     * @memberof html.Draggable
     * 
     * @property {bool} accepted - (default: `false`) Set to `true` to accept the event.
     * @property {DragEvent} original - [readonly] The original HTML5 DragEvent object.
     */
    function makeDragEndEvent(ev)
    {
        return {
            original: ev,
            accepted: false
        };
    }


    /**
     * Class representing a draggable box for drag-and-drop operations.
     * 
     * @extends html.Box
     * @memberof html
     */
    class Draggable extends box.Box
    {
        constructor()
        {
            super();

            /**
             * Is triggered when a drag operation is being started.
             * 
             * @example
             * onDragStart: ev =>
             * {
             *   ev.setData("text/plain", "This is some text.");
             *   ev.effectAllowed = "copy";
             *   ev.accepted = true;
             * }
             * 
             * @event dragStart
             * @param {html.Draggable.DragEvent} event - The event object.
             * @memberof html.Draggable
             */
            this.registerEvent("dragStart");
            /**
             * Is triggered when the drag operation has ended.
             * 
             * Note: There is no reliable way in browsers to check if the drag
             * operation ended successfully or was cancelled.
             * 
             * @event dragEnd
             * @param {html.Draggable.DragEndEvent} event - The event object.
             * @memberof html.Draggable
             */
            this.registerEvent("dragEnd");

 
            const item = this.get();
            item.draggable = true;

            this.addHtmlEventListener(item, "dragstart", (ev) =>
            {
                const e = makeDragEvent(ev);
                this.dragStart(e);
                if (e.accepted)
                {
                    ev.stopPropagation();
                    ev.dataTransfer.effectAllowed = e.effectAllowed;
                    ev.dataTransfer.setDragImage(item, 0, 0);
                    dropArea.setDragSource(this);
                }
                else
                {
                    ev.preventDefault();
                }
            }, false);

            this.addHtmlEventListener(item, "dragend", (ev) =>
            {
                //console.log("drag end");
                //console.log(ev.dataTransfer);
                this.dragEnd(makeDragEndEvent(ev));
                dropArea.setDragSource(null);
                ev.stopPropagation();
            });

            this.addHtmlEventListener(item, "mousedown", (ev) =>
            {
                ev.stopPropagation();
            }, false);

        }
    }
    exports.Draggable = Draggable;
});