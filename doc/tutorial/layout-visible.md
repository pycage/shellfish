The boolean property `visible` controls the visibility of elements. Setting
this value to `false` makes elements disappear from the screen.

```
Document {

    Label {
        text: "I am a label."
    }

    Label {
        visible: false
        text: "You cannot see me."
    }

    Label {
        text: "I am another label."
    }

}
```

The default value for `visible` is `true`.

If an element containing child elements becomes invisible, the child elements
become invisible as well, even though their `visible` property is `true`.

```
Document {

    Box {
        visible: false

        Label {
            text: "You cannot see me."
        }
    }

}
```

Therefore, this property alone is not sufficient to determine if an element
is actually visible, or not.

The actual visibility of an element also depends on the visibility of all of
its ancestors. The read-only property `ancestorsVisible` tells if all
ancestors are actually visible.

So, in order to check for the actual visibility of an element, you have to
look at both properties, `ancestorsVisible` as well as `visible`.

```
Document {

    Box {
        Label {
            text: "Am I really visible? " +
                  (ancestorsVisible && visible ? "Yes." : "No.")
        }
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-next">{@tutorial layout-size}</span>
</div>