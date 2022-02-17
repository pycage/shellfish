/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/box.js"], function (low, box)
{
    let dragSource = null;

    /**
     * Is called by the draggable to register the drag source.
     * @private
     * @param {html.Draggable} obj - The drag source.
     */
    function setDragSource(obj)
    {
        console.log("current drag source: " + obj);
        dragSource = obj;
    }
    exports.setDragSource = setDragSource;


    /**
     * A drop-enter event. The event must be accepted in order to allow dropping.
     * 
     * @typedef DropEnterEvent
     * @memberof html.DropArea
     * 
     * @property {bool} accepted - (default: `false`) Set to `true` to accept the event.
     * @property {string} dropEffect - Set to change the current HTML5 drop effect. One of `copy|move|link|none`
     * @property {DragEvent} original - [readonly] The original HTML5 DragEvent object.
     * @property {html.Draggable} source - [readonly] The source of the drag operation, or `null` if the drag was from outside.
     * @property {string[]} types - The list of transfer types.
     */
    function makeEnterEvent(ev)
    {
        return {
            original: ev,
            accepted: false,
            source: dragSource,
            types: ev.dataTransfer.types,
            dropEffect: ev.dataTransfer.dropEffect
        };
    }

    /**
     * A drop event.
     * 
     * @typedef DropEvent
     * @memberof html.DropArea
     * 
     * @property {bool} accepted - (default: `false`) Set to `true` to accept the event.
     * @property {object} data - [readonly] A map of the contained data types and values.
     * @property {string} dropEffect - [readonly] The selected HTML5 drop effect. One of `copy|move|link|none`
     * @property {DataTransferItem[]} items - The list of HTML5 data transfer items (see {@link https://devdocs.io/dom/datatransferitem}).
     * @property {DragEvent} original - [readonly] The original HTML5 DragEvent object.
     * @property {html.Draggable} source - [readonly] The source of the drag operation, or `null` if the drag was from outside.
     * @property {string[]} types - The list of transfer types.
     */
    function makeDropEvent(ev)
    {
        const data = { };
        ev.dataTransfer.types.forEach((t) =>
        {
            data[t] = ev.dataTransfer.getData(t);
        });

        return {
            original: ev,
            accepted: false,
            source: dragSource,
            types: ev.dataTransfer.types,
            items: ev.dataTransfer.items,
            dropEffect: ev.dataTransfer.dropEffect,
            data: data
        };
    }

    const d = new WeakMap();

    /**
     * Class representing a drop area for drag-and-drop operations.
     * 
     * Dropped items are delivered as a HTML5 DataTransferItemList
     * (see {@link https://devdocs.io/dom/datatransferitemlist}).
     * The drag source cannot be a descendant of this element.
     * 
     * @extends html.Box
     * @memberof mid
     * 
     * @property {bool} accepted - [readonly] Whether the area would accept the current drop item.
     * @property {bool} hovering - [readonly] Whether a drop item is hovering the area.
     */
    class DropArea extends box.Box
    {
        constructor()
        {
            super();
            d.set(this, {
                hovering: false,
                accepted: false,
                dropEffect: "none"
            });

            this.notifyable("accepted");
            this.notifyable("hovering");

            /**
             * Is triggered when the drop area is hovered by a drop item and has
             * to decide whether to accept the item. Set `event.accepted` to
             * `true` to accept after investigating `event.types`.
             * 
             * `types` may contain MIME types, or the special type `Files`, which
             * denotes external files, e.g. when dropping files from a file manager.
             * 
             * @event dropAccept
             * @param {html.DropArea.DropEnterEvent} event - The event object.
             * @memberof html.DropArea
             */
            this.registerEvent("dropAccept");
            /**
             * Is triggered when an item is dropped on the drop area.
             * 
             * @event drop
             * @param {html.DropArea.DropEvent} event - The event object.
             * @memberof html.DropArea
             */
            this.registerEvent("drop");

            const item = this.get();

            let hoverTarget = null;

            this.addHtmlEventListener(item, "dragenter", (ev) =>
            {
                hoverTarget = ev.target;

                // do not allow drags from the same source
                if (dragSource && this.isAncestorOf(dragSource))
                {
                    return true;
                }

                d.get(this).hovering = true;
                this.hoveringChanged();

                const e = makeEnterEvent(ev);
                this.dropAccept(e);

                d.get(this).accepted = e.accepted;
                this.acceptedChanged();

                if (e.accepted)
                {
                    ev.dataTransfer.dropEffect = e.dropEffect;
                    d.get(this).dropEffect = e.dropEffect;
                    console.log("STORE DROP EFFECT: " + d.get(this).dropEffect);
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                }
            }, false);

            this.addHtmlEventListener(item, "dragover", (ev) =>
            {
                if (d.get(this).accepted)
                {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                }
            }, false);

            this.addHtmlEventListener(item, "dragleave", (ev) =>
            {
                if (hoverTarget !== ev.target)
                {
                    // nah, go away!
                    return;
                }
                hoverTarget = null;

                d.get(this).hovering = false;
                this.hoveringChanged();

                d.get(this).accepted = false;
                this.acceptedChanged();
            }, false);

            this.addHtmlEventListener(item, "drop", (ev) =>
            {
                hoverTarget = null;

                const e = makeDropEvent(ev);
                // buggy browser doesn't convey dropEffect, so set it manually
                console.log("LOAD DROP EFFECT: " + d.get(this).dropEffect);
                e.dropEffect = d.get(this).dropEffect;
                this.drop(e);

                d.get(this).hovering = false;
                this.hoveringChanged();

                d.get(this).accepted = false;
                this.acceptedChanged();

                ev.preventDefault();
                ev.stopPropagation();
                return false;
            }, false);
        }

        get accepted() { return d.get(this).accepted; }
        get hovering() { return d.get(this).hovering; }
    }
    exports.DropArea = DropArea;
});