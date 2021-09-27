All visual element derive from {@link mid.Item} and have properties for controlling
their size.

# Width and Height

The properties `width` and `height` control the width and height requested by
the element.

The values represent CSS pixels as defined by the HTML standard. The actual size
of a CSS pixel depends on the display scale and may be affected by the user.

```
Box {
    width: 300
    height: 100
    color: "green"
}
```

If `width` or `height` is set to `-1` (which is the default value), the element
adjusts its size automatically. For example, {@link mid.Label} elements span
to fit their text this way and {@link mid.Box} elements span to fit their children.

```
Box {
    color: "green"

    Label {
        text: "This is a text."
    }
}
```

# Filling Space

The boolean properties `fillWidth` and `fillHeight` make elements fill the
entire space available, overruling `width` and `height`. The available space
is the parent's size minus the space used up by child elements without
`fillWidth` or `fillHeight`.

```
Box {
    width: 300
    height: 100
    color: "green"

    Box {
        fillWidth: true
        height: 50
        color: "red"
    }
}
```

If more than one child element uses `fillWidth` or `fillHeight`, the space
is distributed equally.

# Size Constraints

The properties `minWidth` and `minHeight` dictate the minimum size of an element.
It is under no circumstances allowed to shrink smaller.

```
Box {
    width: 300  // this value is overruled by minWidth
    height: 100
    minWidth: 500
}
```

The properties `maxWidth` and `maxHeight` dictate the maximum size of an element.
It is under no circumstances allowed to grow larger.

```
Box {
    width: 300  // this value is overruled by maxWidth
    height: 100
    maxWidth: 100
}
```

# Fixed Aspect Ratio

The property `aspectRatio` maintains a fixed side aspect ratio while sizing
an element. The `width` and `height` properties constrain the area in which
the element is scaled.

```
Box {
    width: 300
    height: 300
    
    Box {
        width: parent.width
        height: parent.height
        aspectRatio: 16 / 9
        color: "red"
    }
}
```

The aspect ratio is the width divided by the height.

# The Bounding Box

Since the `width` and `height` properties are size constraints rather than absolute
size values, they cannot be used for determining an element's true size in general.

Every element has the read-only `bbox` property containing the element's bounding box for
accessing the actual size and position on screen.

The `bbox` holds an object with
* `x`: The actual X position in document coordinates.
* `y`: The actual Y position in document coordinates.
* `width`: The actual width.
* `height`: The actual height.

```
Box {
    width: 300
    height: 300

    Box {
        width: parent.bbox.width
        height: parent.bbox.height / 2
        color: "red"
    }

    Box {
        width: parent.bbox.width / 2
        height: parent.bbox.height / 2
        color: "green"
    }
}
```

The bounding box of invisible elements is of width and height `0`.

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-visible}</span>
<span class="go-next">{@tutorial layout-flow}</span>
</div>
