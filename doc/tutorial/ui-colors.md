The base class {@link core.Object Object} provides several functions to create
colors for assigning them to elements.

### Color by Name

The function {@link core.Object#colorName colorName} creates a {@link core.Color color}
object from a name string. Shellfish supports the standard set of
{@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value CSS color names.},
including `transparent`, which is invisible with the background shining through.

```
Box {
    width: 100
    height: 100
    color: colorName("cornflowerblue");
}
```

Likewise, various HTML hex notations may be used instead of a predefined name.

```
color: colorName("#ff0") // 4-bit RGB
```

```
color: colorName("#ff0a") // 4-bit RGBA
```

```
color: colorName("#ffff00") // 8-bit RGB
```

```
color: colorName("#ffff00aa") // 8-bit RGBA
```

As a shortcut, it is also possible to assign the name string or hex string as a
string value.
But when accessing the property, you will not get a string, but a color object.

```
Box {
    width: 100
    height: 100
    color: "cornflowerblue"
}
```

```
Box {
    width: 100
    height: 100
    color: "#ff0a"
}
```

### Color by RGBA

The function {@link html.Object#rgba rgba} creates a {@link html.Color color}
object from red, green, blue, and alpha values ranging between `0.0` and `1.0`.

```
Box {
    width: 100
    height: 100
    color: rgba(1.0, 0.3, 0.0, 0.8)
}
```

### Color by RGB

The function {@link html.Object#rgb rgb} creates a {@link html.Color color}
object from red, green, and blue values ranging between `0.0` and `1.0`.


```
Box {
    width: 100
    height: 100
    color: rgb(1.0, 0.3, 0.0)
}
```

### Color Modifications

The {@link html.Color color} object has methods for modifying colors.

#### Changing the Alpha Channel

The method `alpha` returns a new color object with the alpha channel replaced
by the given value between `0.0` and `1.0`. You may use this to make any
color translucent.

```
color: colorName("steelblue").alpha(0.5)
```

#### Tuning the Brightness

The method `brightness` returns a new color object with the brightness tuned
by the given factor. The factor is multiplied on the red, green, and blue values,
with the result being capped to `1.0`.

```
color: colorName("steelblue").brightness(0.7)
```

#### Boosting the Saturation

The method `saturation` returns a new color object with the saturation boosted by
the given factor (`0.0` being completely desaturated).

```
color: colorName("steelblue").saturation(1.2)
```

#### Accessing the Channels

The individual red, green, blue, and alpha channels of a color object may be
read by its properties and are within the range of `0.0` and `1.0`.

* `r`: The value of the red channel.
* `g`: The value of the green channel.
* `b`: The value of the blue channel.
* `a`: The value of the alpha channel.

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-next">{@tutorial ui-profiles}</span>
</div>
