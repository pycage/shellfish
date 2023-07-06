The Shellfish UI has support for native Drag-and-Drop operations with the
{@link html.Draggable Draggable} and {@link html.DropArea DropArea} elements.

### Creating a Drop Area

The drop area accepts dropping items that the user dragged from elsewhere,
either from within the same application, or from externally, such as the
filemanager.

The {@link html.DropArea DropArea} element is a special box with events for
accepting item drops.

The `dropAccept` event is emitted with a
{@link html.DropArea.DropEnterEvent DropEnterEvent}
object for inspecting incoming drops. By looking at the event, you decide whether
to accept this drop operation or not.
In order to accept the drop operation, set the event's `accepted` property to
`true`. Otherwise, the drop operation will be rejected.

The `drop` event, on the other hand, is emitted with a
{@link html.DropArea.DropEvent DropEvent} object when the user drops items
after the drop operation has been accepted. The object conveys information
about the dropped items.

```
DropArea {

    onDropAccept: ev =>
    {
        // after inspecting the event, set "accepted" to true to accept
        // the drop
        ev.accepted = true;
    }

    onDrop: ev =>
    {
        // receive the dropped items
    }

}
```

### Determining the Drop Effect

The drop effect is the action that the user may perform with a drag and drop
operation. It is one of

* `copy`: The items are copied over from source to destination.
* `move`: The items are moved from source to destination.
* `link`: References to the items at the source are created at the destination.
* `none`: No action in particular.

Changing the drop effect usually affects the look of the mouse cursor.
You may set the drop effect when accepting a
{@link html.DropArea.DropEnterEvent DropEnterEvent} via the `dropEffect`
property. The effective drop effect will be determined on an agreement between
the drop effects the source offers, and the drop effect the destination (the
drop area) requests.

When receiving the dropped items via the
{@link html.DropArea.DropEvent DropEvent}, the event's `dropEffect` property
is read-only and may be read to take the appropriate action.

If the source and destination could not agree on a common drop effect, it will be
`none`.

```
DropArea {

    onDropAccept: ev =>
    {
        // copy items (provided that the source allows copying)
        ev.dropEffect = "copy";
        ev.accepted = true;
    }

    onDrop: ev =>
    {
        if (ev.dropEffect === "copy")
        {
            // copy items
            ...
        }
    }

}
```

### Transfering Data

The type of data transferred by drag and drop operations is specified by
MIME types.
Take a look at the `types` property of the
{@link html.DropArea.DropEnterEvent DropEnterEvent} object in order to decide
whether to accept the type of dropped items. This property
contains a list of the MIME types supported by the drag and drop operation.

Finally, when accepting the dropped items, the `data` property of the
{@link html.DropArea.DropEvent DropEvent} object contains a map of supported
MIME types and their payload data.

```
DropArea {

    onDropAccept: ev =>
    {
        if (ev.types.includes("application/x-my-item-type"))
        {
            ev.accepted = true;
        }
    }

    onDrop: ev =>
    {
        const payload = ev.data["application/x-my-item-type"];
    }

}
```

The `items` property of the {@link html.DropArea.DropEvent DropEvent} object
contains an array of the original HTML5 `DataTransferItem` objects, in case
you need to support special types, such as file items.

### Accepting File Items

Dropping files from external sources is special in that it gives you access
to the actual files.

When file items are being transferred, the `types` list of the
{@link html.DropArea.DropEnterEvent DropEnterEvent} object contains the `Files`
entry, and the `items` property of the
{@link html.DropArea.DropEvent DropEvent} object contains the HTML5 `File`
objects representing the files.

```
DropArea {

    onDropAccept: ev =>
    {
        if (ev.types.includes("Files"))
        {
            ev.accepted = true;
        }
    }

    onDrop: ev =>
    {
        // iterate over the files
        for (let i = 0; i < ev.items.length; ++i)
        {
            const item = ev.items[i];
            if (ev.kind !== "file")
            {
                // skip items that are no file items
                continue;
            }

            // get the HTML File object
            const fileObj = item.getAsFile();
            console.log("File: " + fileObj.name + 
                        " of type " + fileObj.type + 
                        ", size: " + fileObj.size);
        }
    }

}
```

### Making Elements Draggable

The {@link html.Draggable Draggable} element provides a box that can be dragged
by the user. A copy of the contents of the draggable box sticks to the mouse
cursor while being dragged.

**Note:** The draggable element must not be a descendant of the target drop
area.

A {@link html.Draggable Draggable} element emits the two drag-related events
`dragStart` and `dragEnd`.

The `dragStart` event is emitted when the user wants to drag the
{@link html.Draggable Draggable}. Use its
{@link html.Draggable.DragEvent DragEvent} object to configure the
drag operation.

Setting the `effectAllowed` property determines which drop effects will be
allowed on the drop area. It is one of

* `copy`: This is the default. Only `copy` will be allowed.
* `copyLink`: Both, `copy` and `link` will be allowed.
* `copyMove`: Both, `copy` and `move` will be allowed.
* `link`: Only `link` will be allowed.
* `linkMove`: Both, `link` and `move` will be allowed.
* `all`: All drop effects will be allowed.

This setting determines which drop effects the destination drop area may choose.

In order to send data along with the drag and drop operation, use the `setData`
method of the event object. It takes two strings, one for the MIME type of the
data, and one for the actual data.

Finally, set the `accepted` property to `true` to initiate the drag operation.

After the dragged item has been dropped or the drag has been canceled,
the `dragEnd` event is emitted. Unfortunately, there is no reliable way in
web browsers to determine if a drag and drop operation was successful or
has been cancelled.

```
Draggable {

    onDragStart: ev =>
    {
        ev.effectAllowed = "copyMove";
        ev.setData("text/plain", "This is some text.");
        ev.accepted = true;
    }

    onDragEnd: ev =>
    {
        console.log("Finished the drag and drop operation.");
    }

    Label {
        text: "Drag Me"
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-defered}</span>
</div>
