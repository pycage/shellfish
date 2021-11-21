With components (see {@tutorial shui-modules}), you can create new elements for
use in your UI.

But sometimes you may want to put child elements into your component.

```
require "./MyComponent.shui"

Document {

    MyComponent {
        Label { text: "Some text" }
    }

}
```

By default, the children are added to the topmost (root) element of the component,
which may not always be the place you want to put them.

With containers, Shui gives you control over where child elements go.

### The Default Container

When adding child elements to a component, as shown in the example code above,
the elements are placed into the default container. Usually, this is the
root element of the component. But with the `container` keyword, you may switch
the default container to any other element inside the component.

```
// MyComponent.shui

Box {

    // put all child elements into the Box with the identifier 'contentArea'
    container default: contentArea

    Box {
        id: contentArea
    }

}
```

```
// main.shui

require "./MyComponent.shui"

Document {

    MyComponent {
        Label { text: "Some text" }
    }

}
```

### Named Containers

In addition to the default container, you may define various named containers with the
`container` keyword.

```
container default: contentArea
container otherContainer: anotherArea
```

When placing elements into a component, the `into` keyword selects the container.
Without `into`, the default container will be used.

```
// main.shui

require "./MyComponent.shui"

Document {

    MyComponent {
        // this goes into the default container
        Label { text: "Default" }

        // this goes into the named container 'otherContainer'
        into otherContainer Label { text: "Other Container" }
    }

}
```

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-modules}
</span><span class="go-next">
{@tutorial shui-templates}
</span></div>
