The {@link html.Box Box} element is the base for all container items. Its property
`layout` controls the flow of layouting child elements.

### Column Layout

In column layout, child elements are laid out in a flow from top to bottom.

```
Box {
    width: 300
    height: 300
    layout: "column"

    Label { text: "One" }
    Label { text: "Two" }
    Label { text: "Three" }
}
```

![](images/layout-flow-01.png)

Since `column` is the default value of the `layout` property, it may be
omitted.

```
Box {
    width: 300
    height: 300

    Label { text: "One" }
    Label { text: "Two" }
    Label { text: "Three" }
}
```

### Centered Column Layout

In centered column layout, the child elements are centered within the box and laid
out in a flow from top to bottom.

```
Box {
    width: 300
    height: 300
    layout: "center-column"

    Label { text: "One" }
    Label { text: "Two" }
    Label { text: "Three" }
}
```

![](images/layout-flow-02.png)

### Row Layout

In row layout, child elements are laid out in a flow from left to right.

```
Box {
    width: 300
    height: 300
    layout: "row"

    Label { text: "One" }
    Label { text: "Two" }
    Label { text: "Three" }
}
```

![](images/layout-flow-03.png)

### Centered Row Layout

In centered row layout, the child elements are centered within the box and laid
out in a flow from left to right.

```
Box {
    width: 300
    height: 300
    layout: "center-row"

    Label { text: "One" }
    Label { text: "Two" }
    Label { text: "Three" }
}
```

![](images/layout-flow-04.png)

### Centered Layout

Centered layout centers the child element.

```
Box {
    width: 300
    height: 300
    layout: "center"

    Label { text: "centered" }
}
```

Centered layout is just an alias for centered column layout.

### Invisible Elements

Elements with their `visible` property set to `false` are taken out of the
layout flow and do not occupy space.

### Overflow Behavior

If the child elements exceed the space inside their parent box, an overflow
occurs. The property `overflowBehavior` of {@link html.Box} controls how
overflows are handled.

`overflowBehavior` may have one of these values:
* `none`: The overflowing items are cut off at the edge of the box. This
  is the default value.
* `wrap`: The overflowing items are wrapped around. For instance, with row layout,
  these items are put into a new row.
* `scroll`: The box becomes scrollable (see {@tutorial layout-scrolling}).

```
Box {
    width: 320
    height: 100
    layout: "row"
    overflowBehavior: "wrap"

    Box {
        width: 100
        height: 50
        color: "red"
    }

    Box {
        width: 100
        height: 50
        color: "green"
    }

    Box {
        width: 100
        height: 50
        color: "blue"
    }

    // a new row is started here because of wrapping

    Box {
        width: 100
        height: 50
        color: "yellow"
    }

    Box {
        width: 100
        height: 50
        color: "pink"
    }
}
```

![](images/layout-flow-05.png)

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-size}</span>
<span class="go-next">{@tutorial layout-margin}</span>
</div>
