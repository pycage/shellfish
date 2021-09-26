Templates in Shui are trees of elements that are created on demand.

Some elements that spawn children dynamically make use of templates.
The {@link mid.Repeater} element, for instance, creates a number of child
elements by applying a template assigned to the `delegate` property
according to a {@link mid.ListModel list model}.

Templates must be marked with the `template` keyword.

```
Document {

    Repeater {

        model: ListModel {
            // have three children
            data: sequence(0, 3)
        }

        // the template describes what the children look like
        delegate: template Label {
            text: "A label"
        }

    }

}
```

# Templates are Functions

Technically, a template is a function that creates and returns a tree of elements when
invoked. You may assign templates to properties and call them directly in JavaScript blocks.

This example adds a dropdown menu to a button.

```
require "shellfish/ui"; // we are using some elements from this module

Document {

    Button {

        property menuT: template Menu {
            MenuItem { text: "Item A" }
            MenuItem { text: "Item B" }
        }

        text: "Click Me"

        onClick: () =>
        {
            // create the menu from the template when the button is clicked
            const menu = menuT();
            // show the menu next to the button
            menu.popup(self);
        }

    }

}
```

# Templates are Components

Templates behave like components. This means they form their own scope for
element identifiers. Element identifiers defined inside a template are not
accessible from outside. On the other hand, element identifiers defined outside
the template may be accessed by the template, as the template itself is in the
scope of where it (the template) was defined.

```
Document {

    Repeater {

        model: ListModel {
            data: sequence(0, 3)
        }

        delegate: template Box {
            
            Label {
                id: innerLabel
                // THIS IS OK: outerBox is visible to the template
                text: "Contains Mouse: " + outerBox.containsMouse
            }

        }

    }

    MouseBox {
        id: outerBox

        width: 100
        height: 100
        color: "red"

        onClick: () =>
        {
            // THIS DOES NOT WORK: innerLabel is not visible outside the template
            //innerLabel.text = "Does not work!";
        }
    }

}
```

**Note:** If you try this example, you will notice that the `Label` elements appear underneath
the `MouseBox`, even though the `Repeater` is placed before it. Why is this so?
The repeater is an abstract element that puts the spawned child elements into its
parent container. Since the children are spawned dynamically **after** the document was
created, the `Label` elements are placed underneath the `MouseBox`. If you want to avoid this,
put the `Repeater` into an extra `Box`.

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-containers}
</span><span class="go-next">
{@tutorial shui-scope}
</span></div>
