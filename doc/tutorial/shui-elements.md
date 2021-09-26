# Elements

A Shui file (or document) consists of a tree of nested elements. To create an element,
put its class name with curly braces.

```
Document { }
```

Many elements may contain child elements. These are placed within the curly braces
of their parent. It is usually a good idea to indent the children by spaces in order
to make the code more readable.

```
Document {

    Label { }

    Box {
        Label { }
    }

}
```

Every Shui file consists of exactly one root element, which in turn may contain child elements.
The root element of the main file must be `Document` for things to appear on screen.

# Properties

Elements are parameterized by properties. In order to assign a value to a property,
name that property inside its element, and put a colon (`:`) followed by the
property's value.

```
Label {
    fontSize: 16
    color: "blue"
    text: "I am a label."
}
```

The type of the property is determined by the type of the assigned value.

You may put several properties on a single line by separating them with semi-colons (`;`).

    Label { color: "red"; text: "I am a red label." }

Strings quoted with `"""` instead of `"` may span multiple lines and may contain
`"` characters.

```
Label {
    text: """This is a 
             multiline string
             containing "quotes"."""
}
```

# Custom Properties

You may define custom properties on any element by using the `property` keyword before
the assignment.

```
Label {
    property myVeryOwnProperty: 42
}
```

# Identifiers

The `id` property is a special property for assigning a document-unique name to an element.
Its value must be a valid identifier consisting of alphanumeric characters and the
underscore (`_`) only. Do not put quotes around the identifier.

```
Document {

    Label {
        id: label1
    }

    Label {
        id: label2
    }

}
```

Identifiers are used to reference an element or its properties. To access a property's current
value, put a dot (`.`) between the identifier and the property name.

```
Document {

    Label {
        id: label1
        text: "I am a label."
    }

    Label {
        text: label1.text
    }

}
```

You cannot reference an element's identifier as a property. In other words,
this will **not** work:

```
Label {
    text: label1.id
}
```

# Property Bindings

Instead of values you may also assign JavaScript expressions to properties.

```
Box {
    width: 3 * 128
}
```

You may also reference other properties within a JavaScript expression.

```
Document {

    Box {
        id: box1
        width: 256
        height: width
        color: "green"
    }

    Box {
        width: Math.max(box1.width, 128)
        height: width
        color: "red"
    }

}
```

Whenever one of the referenced properties changes, the expression gets re-evaluated
to update the property's value.

**Attention:** Be careful not to build circular references this way. While Shellfish detects them
at runtime and breaks the infinite update loop, they print an error message to the console
and serve no purpose.

References consisting of only the property name without an element identifier access the element they are
used within, or one of its ancestors if the property is not found.

```
Box {
    property foo: "bar"

    Box {

        Label {
            text: "Value of foo: " + foo
        }

    }
}
```

# Parent and Children

The elements placed inside an element are child elements. Each child element references
the element it is contained in by the `parent` property.

```
Box {
    height: 100

    Label {
        text: "My parent's height is: " + parent.height
    }
}
```

The method `children()` of the parent element returns the list of children.

```
Box {
    height: children().length * 32
    color: "green"

    Label { text: "1" }
    Label { text: "2" }
    Label { text: "This box has " + parent.children().length + " children." }
}
```

# Comments

Comments in Shui are written in JavaScript style (i.e. C++ style).

`//` makes all characters right to it ignored until the end of the line.

```
Box {
    width: 42 // this is a comment
}
```

`/*` and `*/` are used to make everything inbetween ignored, even when spanning
multiple lines.

```
Box {
    /* This is a
       multiline
       comment. */
}
```

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-next">
{@tutorial shui-events}
</span></div>
