The `position` property of an element controls how it is positioned within its
parent element.

### Inline Positioning

If the `position` property has the value `inline`, the element is positioned
according to the layout flow of the parent element (see {@tutorial layout-flow}).
Since `inline` is the default value, it may be omitted.

### Free Positioning

If the `position` property has the value `free`, the element is freely positioned
inside its parent element with absolute coordinates specified by the `x` and
`y` properties.

```
Box {
    width: 300
    height: 300

    Box {
        position: "free"
        x: 100
        y: 100
        width: 50
        height: 50
        color: "red"
    }
}
```

### Global Positioning

If the `position` property has the value `global`, the element is freely positioned
inside the document window with absolute coordinates specified by the `x` and
`y` properties.

```
Box {
    width: 300
    height: 300

    Box {
        position: "global"
        x: 100
        y: 100
        width: 50
        height: 50
        color: "red"
    }
}
```

### Origin of the Coordinate System

The property `origin` specifies the corner where the origin of the coordinate
system lies in the `free` and `global` positioning modes. By default, `origin` has
the value `top-left`.

`origin` may have one of these values:
* `top-left`: (0, 0) is in the top-left corner of the parent (free positioning)
  or the document window (global positioning).
  X coordinates increase to the right and Y coordinates increase downwards.
* `top-right`: (0, 0) is in the top-right corner of the parent (free positioning)
  or the document window (global positioning).
  X coordinates increase to the left and Y coordinates increase downwards.
* `bottom-right`: (0, 0) is in the bottom-right corner of the parent (free positioning)
  or the document window (global positioning).
  X coordinates increase to the left and Y coordinates increase upwards.
* `bottom-left`: (0, 0) is in the bottom-left corner of the parent (free positioning)
  or the document window (global positioning).
  X coordinates increase to the right and Y coordinates increase upwards.

```
Box {
    width: 300
    height: 300

    Box {
        position: "free"
        origin: "bottom-right"
        x: 10
        y: 10
        width: 50
        height: 50
        color: "red"
    }
}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-margin}</span>
<span class="go-next">{@tutorial layout-scrolling}</span>
</div>
