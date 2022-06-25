### Events and Handlers

Some elements provide events that are triggered under certain circumstances,
e.g. {@link html.MouseBox MouseBox} has a `click` event that is fired whenever
the user clicked the mouse button inside the element.

Connecting a handler function to an event works like assigning to a property
with the first character of the event's name being capitalized and prepended
by `on`. E.g. the handler for the `click` event is assigned to the `onClick`
property.

JavaScript's arrow function notation is used for event handlers.

```
MouseBox {
    onClick: () =>
    {
        // some code
    }
}
```

Some events call their handler function with parameters which you can name and access by
using function parameters.

```
MouseBox {
    onClick: (ev) =>
    {
        console.log("You clicked at (" + ev.x + ", " + ev.y + ").");
        ev.accepted = true;
    }
}
```

If you don't use the parameters, you may omit them.

```
onClick: () =>
{

}
```

### Custom Events

You may define custom events on an element by using the `event` keyword together with a valid identifier name.
Trigger the event by invoking it like a function.

```
MouseBox {
    event somethingHappened

    onClick: (ev) =>
    {
        somethingHappened(ev.x, ev.y);
    }

    onSomethingHappened: (x, y) =>
    {
        console.log("You clicked at (" + x + ", " + y + ").");
    }
}
```

### Foreign Events

Elements may connect handler functions to events of another element. To do so,
use the identifier of the other element.

```
Document {

    MouseBox {
        id: mbox
    }

    Box {
        mbox.onClick: () =>
        {
            console.log("You clicked a button.");
        }
    }

}
```

### Assigning Multiple Event Handlers

Event handlers are different from properties in that assigning a new handler function will
not replace the previous handler function. Instead, both functions will be called when
the event triggers. This way you can monitor the same event at various locations.

```
Document {

    MouseBox {
        id: mbox

        width: 100
        height: 100
        color: "red"

        onClick: () =>
        {
            console.log("You clicked a button.");
        }
    }

    Box {
        mbox.onClick: () =>
        {
            console.log("I saw you click a button.");
        }
    }

}
```

**Attention:** Parameters passed to the multiple handlers are the same objects for each handler function.
Keep this in mind when modifying a parameter object.

### Initialization and Destruction

All elements provide events for notifying about changes in their life cycle.

The `initialization` event is fired after the element has been initialized.
An element is considered initialized after it has been created, the properties
have been set to their configured values, and all of it's child elements have
been initialized.

The `destruction` event is fired when the element is about to be destroyed. At
this moment, the element is still functional.

```
Box {

    onInitialization: () =>
    {
        console.log("The box has been created.");
    }

    onDestruction: () =>
    {
        console.log("The box will be destroyed.");
    }
    
}
```

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-elements}
</span><span class="go-next">
{@tutorial shui-methods}
</span></div>
