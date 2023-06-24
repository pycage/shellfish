Shellfish's animation elements let you create complex animation storyboards.

### Simple Animations

In {@tutorial ui-transitions} you already learned about using {@link html.NumberAnimation NumberAnimation}
and easing curves for transitions.
But {@link html.NumberAnimation NumberAnimation} also works as
a standalone animation element.

The properties `from` and `to` specify the number range of the animation. With
the `running` property set to `true`, the animation starts running, and if
`repeat` is `true` it will repeat over and over.
The `next` event delivers the next interpolated value.

```
Document {

    Box {
        position: "free"
        x: 50
        width: 50
        height: 50
        color: "red"

        NumberAnimation {
            running: true
            repeat: true
            from: -50
            to: 300
            duration: 1500
            easing: "OutBounce"

            onNext: (value) => { parent.y = value; }
        }
    }

}
```

### Sequential Animations

The element {@link html.SequentialAnimation SequentialAnimation} runs a number
of child animations in sequence.

```
Document {

    Box {
        position: "free"
        x: 50
        width: 50
        height: 50
        color: "red"

        SequentialAnimation {
            running: true
            repeat: true

            NumberAnimation {
                from: -50
                to: 300
                duration: 1500
                easing: "OutBounce"

                onNext: (value) => { parent.parent.y = value; }
            }

            NumberAnimation {
                from: 300
                to: -50
                duration: 1000
                easing: "Linear"

                onNext: (value) => { parent.parent.y = value; }
            }
        }

    }

}
```

### Parallel Animations

The element {@link html.ParallelAnimation ParallelAnimation} runs a number of
child animations simultaneously.

```
Document {

    Box {
        position: "free"
        x: 50
        width: 50
        height: 50
        color: "red"

        ParallelAnimation {
            running: true
            repeat: true

            NumberAnimation {
                from: -50
                to: 300
                duration: 1500
                easing: "OutBounce"

                onNext: (value) => { parent.parent.y = value; }
            }

            NumberAnimation {
                from: -50
                to: 300
                duration: 1500
                easing: "OutQuad"

                onNext: (value) => { parent.parent.x = value; }
            }
        }

    }

}
```

### Complex Animations

Because {@link html.ParallelAnimation ParallelAnimation} and
{@link html.SequentialAnimation SequentialAnimation} are
animation elements as well, you may put them as child animations into other parallel
or sequential animations, too.

```
Document {

    Box {
        position: "free"
        x: 50
        width: 50
        height: 50
        color: "red"

        SequentialAnimation {
            running: true
            repeat: true

            ParallelAnimation {

                NumberAnimation {
                    from: -50
                    to: 300
                    duration: 1500
                    easing: "OutBounce"

                    onNext: (value) => { parent.parent.parent.y = value; }
                }

                NumberAnimation {
                    from: -50
                    to: 300
                    duration: 1500
                    easing: "OutQuad"

                    onNext: (value) => { parent.parent.parent.x = value; }
                }
            }

            NumberAnimation {
                from: 300
                to: -50
                duration: 2000
                easing: "InOutQuad"

                onNext: (value) =>
                {
                    parent.parent.x = value;
                    parent.parent.y = value;
                }
            }
        }
    }
}
```



Here is a bonus document that illustrates all easing curves.

```
Document {

    Box {
        layout: "row"
        overflowBehavior: "wrap"

        fillWidth: true

        Repeater {
            model: ListModel {
                data: [
                    "Linear", "InSine", "OutSine", "InOutSine",
                    "InQuad", "OutQuad", "InOutQuad", "InCubic",
                    "OutCubic", "InOutCubic", "InQuart", "OutQuart",
                    "InOutQuart", "InQuint", "OutQuint", "InOutQuint",
                    "InExpo", "OutExpo", "InOutExpo", "InCirc",
                    "OutCirc", "InOutCirc", "InBack", "OutBack",
                    "InOutBack", "InElastic", "OutElastic", "InOutElastic",
                    "InBounce", "OutBounce", "InOutBounce"
                ]
            }

            delegate: template Box {
                id: exampleBox
                
                Box {
                    width: 130
                    color: "white"
                    borderColor: "black"
                    borderWidth: 1

                    Box {
                        position: "free"
                        x: 103
                        width: 1
                        color: "gray"
                        fillHeight: true
                    }

                    Box {
                        position: "free"
                        y: 4
                        width: 6
                        height: width
                        borderRadius: width / 2
                        color: "blue"

                        NumberAnimation {
                            running: true
                            repeat: true
                            from: 0
                            to: 100
                            duration: 3000
                            easing: exampleBox.modelData.value
                            
                            onNext: (value) => { parent.x = value; }
                        }
                    }

                    Label {
                        marginTop: 12
                        text: exampleBox.modelData.value
                    }
                }

            }// delegate Box

        }// Repeater

    }// Box

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-transitions}</span>
<span class="go-next">{@tutorial ui-defered}</span>
</div>