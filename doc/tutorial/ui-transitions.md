Some element properties are transitionable. This means, that when changing their
value, the property will transition smoothly interpolated to the new value.

# The `~Transition` Property

For each transitionable property of an element, there is another property with
the name of that property suffixed by `Transition` for describing the desired
transition.

By default, the `~Transition` property has the value `null`, which
means that the property changes its value abruptly without transitioning.

Custom properties are always transitionable if they have a numeric value
assigned at declaration time.

# The `NumberAnimation` Element

The element `NumberAnimation` is used for describing transitions by assigning
it to the `~Transition` property.

```
Document {

    MouseBox {
        width: 100
        height: 100
        color: "green"

        widthTransition: NumberAnimation { }

        onClick: () => { width = width > 100 ? 100 : 200; }
    }

}
```

## Duration

The `duration` property specifies how long the transition will take to complete
in milliseconds. By default, this is `300` ms.

```
Document {

    MouseBox {
        width: 100
        height: 100
        color: "green"

        widthTransition: NumberAnimation { duration: 50 }

        onClick: () => { width = width > 100 ? 100 : 200; }
    }

}
```

## Easing Curves

The `easing` property specifies the type of easing curve used for interpolating
the transition. By default, this is `InOutQuad`.

Valid values for `easing` are:

* `Linear`
* `InSine`
* `OutSine`
* `InOutSine`
* `InQuad`
* `OutQuad`
* `InOutQuad`
* `InCubic`
* `OutCubic`
* `InOutCubic`
* `InQuart`
* `OutQuart`
* `InOutQuart`
* `InQuint`
* `OutQuint`
* `InOutQuint`
* `InExpo`
* `OutExpo`
* `InOutExpo`
* `InCirc`
* `OutCirc`
* `InOutCirc`
* `InBack`
* `OutBack`
* `InOutBack`
* `InElastic`
* `OutElastic`
* `InOutElastic`
* `InBounce`
* `OutBounce`
* `InOutBounce`

You can find illustrations of the various curves at {@link https://easings.net}.

```
Document {

    MouseBox {
        width: 100
        height: 100
        color: "green"

        widthTransition: NumberAnimation { duration: 500; easing: "OutBounce" }

        onClick: () => { width = width > 100 ? 100 : 200; }
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-profiles}</span>
<span class="go-next">{@tutorial ui-animations}</span>
</div>