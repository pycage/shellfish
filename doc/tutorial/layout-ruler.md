Imagine you want to display a number of vertical labels.

```
require "shellfish/ui";

Document {

    Box {
        fillWidth: true
        layout: "row"

        Label { text: "Name" }
        TextEntry { }
    }

    Box {
        fillWidth: true
        layout: "row"

        Label { text: "Description" }
        TextEntry { }
    }

    Box {
        fillWidth: true
        layout: "row"

        Label { text: "Enabled" }
        Switch { }
    }
}
```

![](images/layout-ruler-01.png)

This does not quite look the way it should. The labels and input boxes are
not aligned. For a proper alignment, you would have to stretch every label
to the width of the longest label. An elegant way of doing this is by using
a {@link mid.Ruler} element.

The {@link mid.Ruler} is an abstract element that collects bounding boxes and computes
maximum and minimum bounding boxes from the collected values, exposed as read-only
properties `min` and `max`.

Every element has a property `ruler` where you can assign the ruler to get its
bounding box collected.

```
Box {
    Ruler { id: labelRuler}

    Label { ruler: labelRuler; text: "Label 1" }
    Label { ruler: labelRuler; text: "Label 2" }
    Label { ruler: labelRuler; text: "A long label 3" }
}
```

Now by using the ruler, you may stretch each label according to the maximum bounding box.

```
require "shellfish/ui";

Document {

    Ruler { id: labelRuler }

    Box {
        fillWidth: true
        layout: "row"

        Label {
            ruler: labelRuler
            minWidth: labelRuler.max.width
            text: "Name"
        }
        TextEntry { }
    }

    Box {
        fillWidth: true
        layout: "row"

        Label {
            ruler: labelRuler
            minWidth: labelRuler.max.width
            text: "Description"
        }
        TextEntry { }
    }

    Box {
        fillWidth: true
        layout: "row"

        Label {
            ruler: labelRuler
            minWidth: labelRuler.max.width
            text: "Enabled"
        }
        Switch { }
    }
}
```

![](images/layout-ruler-02.png)

Finally, let's apply what you have learned so far, to make this a really fine
layout.

```
require "shellfish/ui";

Document {

    Box {
        fillWidth: true
        marginTop: 12
        marginLeft: 12
        marginRight: 12
        marginBottom: 12

        Ruler { id: labelRuler }

        Box {
            fillWidth: true
            layout: "center-row"

            Label {
                ruler: labelRuler
                minWidth: labelRuler.max.width
                text: "Name"
            }
            TextEntry { marginLeft: 6 }
            Box { fillWidth: true }
        }

        Box {
            fillWidth: true
            marginTop: 6
            layout: "center-row"

            Label {
                ruler: labelRuler
                minWidth: labelRuler.max.width
                text: "Description"
            }
            TextEntry { marginLeft: 6 }
            Box { fillWidth: true }
        }

        Box {
            fillWidth: true
            marginTop: 6
            layout: "center-row"

            Label {
                ruler: labelRuler
                minWidth: labelRuler.max.width
                text: "Enabled"
            }
            Switch { marginLeft: 6 }
            Box { fillWidth: true }
        }
    }

}
```

![](images/layout-ruler-03.png)

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-scrolling}</span>
</div>
