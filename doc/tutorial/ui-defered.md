Creating UI elements is an expensive operation on the HTML DOM.
Therefore, it is advisable to only create the elements you need
initially and defer the creation of other elements to a later
point.

Here are some ways of how to defer element creation.

### Repeating Elements

The {@link core.Repeater Repeater} element spawns new elements from a
template dynamically and places them in its parent container.

The property `model` accepts a {@link core.ListModel ListModel} element,
which is described in detail in {@tutorial ui-listmodel},
but for simplicity, the model may also be a plain number.

```
Document {

    Repeater {
        // passing a number implicitly creates a simple list model
        model: 100
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```

Always remember to mark the delegate with the `template`
keyword.

The repeater can also destroy spawned elements dynamically,
based on changes of the model.

```
require "shellfish/ui";  // required for Slider

Document {

    Slider {
        id: amountSlider

        fillWidth: true
        minValue: 1
        maxValue: 100
        value: 3
    }

    Repeater {
        model: Math.round(amountSlider.value)
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```

Note that since the repeater itself is an abstract element
and creates the elements in its parent container dynamically,
they will be placed after sibling elements of the repeater.

```
Document {

    Repeater {
        model: 3
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

    Label {
        text: "I should be the last label (but I am not)."
    }

}
```

If you want to avoid this, put the repeater in a box.

```
Document {

    Box {
        Repeater {
            model: 3
            delegate: template Label {
                text: "Label #" + modelData.index
            }
        }
    }

    Label {
        text: "I am the last label."
    }

}
```

### List of Elements

If you are spawning a lot of elements, the {@link html.Repeater Repeater} element might not be a good choice as it creates all
of its elements at once, even if they are out of view.

The {@link html.ListView ListView} element, on the other hand,
is specialized in dynamically creating elements as they come
into view, and destroying (or recycling) them as they disappear
from view. This lets you handle thousands of elements.

The list view layouts its items in a grid. All items are of
the same size, which is specified by the properties
`cellWidth` and `cellHeight`.

The property `scrollbars` controls if the list view should
use native scrollbars. By default its value is `false`.

```
require "shellfish/ui";  // required for Slider and theme

Document {

    Slider {
        id: amountSlider

        fillWidth: true
        minValue: 1
        maxValue: 100
        value: 3
    }

    ListView {
        fillWidth: true
        height: 300
        cellWidth: 100
        cellHeight: theme.fontSizeMedium
        scrollbars: true

        model: Math.round(amountSlider.value)
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```

#### Changing the Orientation

By default, the items are laid out vertically, i.e. the view
will scroll vertically.
By using the property `orientation`, you may change the
orientation.

```
require "shellfish/ui";  // required for Slider and theme

Document {

    Slider {
        id: amountSlider

        fillWidth: true
        minValue: 1
        maxValue: 100
        value: 3
    }

    ListView {
        fillWidth: true
        height: 300
        cellWidth: 100
        cellHeight: theme.fontSizeMedium
        orientation: "horizontal"
        scrollbars: true

        model: Math.round(amountSlider.value)
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```

#### Viewing as List

If you want to display a real list with one item per row,
simply set the `cellWidth` to at least the full width of
the list view.

```
require "shellfish/ui";

Document {

    ListView {
        fillWidth: true
        height: 300
        cellWidth: bboxWidth
        cellHeight: theme.fontSizeMedium
        scrollbars: true

        model: 1000
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```

**Attention:**

In order to be fast even with thousands of elements, the list
view recycles elements that went out of view instead of
creating new ones (which would be expensive on the HTML DOM).

Because of this, always make sure that you reset the state
of the delegates when the `visible` property changes to `true`.
Otherwise you would start to see some artifacts of outdated
data.

#### The Cache Margin

For a smoother scrolling experience, the list view is able
to create items before they come into view and keep items
around after they went out of view.

The property `cacheMargin` specifies the size of the margin
area outside of the visible viewport within which items are
created or kept alive. This means, the cache margin area
is treated as if it was part of the visible viewport.

```
require "shellfish/ui";

Document {

    ListView {
        fillWidth: true
        height: 300
        cellWidth: bboxWidth
        cellHeight: theme.fontSizeMedium
        cacheMargin: 200
        scrollbars: true

        model: 1000
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }

}
```



### Loading Elements Dynamically

The {@link ui.Loader Loader} element from {@link ui shellfish/ui} is a box
which loads its content from a template or file dynamically.

Use the property `sourceTemplate` to specify a template.

```
require "shellfish/ui";  // required for Loader

Document {

    Loader {           
        sourceTemplate: template Box {
            
            Repeater {
                model: 100
                delegate: template Label {
                    text: "Label #" + modelData.index
                }
            }
            
        }
        
    }

}
```

Alternatively, you may use the property `source` to load content
from another Shui file.

```
// Content.shui

Box {
    Repeater {
        model: 100
        delegate: template Label {
            text: "Label #" + modelData.index
        }
    }
}
```

```
// main.shui

require "shellfish/ui";

Document {

    Loader {
        source: "Content.shui"
    }

}
```

Once the content has been loaded, the property `item` refers to
the root element of the loaded content.


<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-animations}</span>
<span class="go-next">{@tutorial ui-dragndrop}</span>
</div>
