When elements are laid out according to the layout flow, there are by default
no gaps inbetween. By specifying margins, you can add some gaps.

The margin properties control the margin of an element to its neighbors.
* `marginLeft` controls the margin to the left.
* `marginRight`: controls the margin to the right.
* `marginTop` controls the margin above.
* `marginBottom` controls the margin below.

By default, all margins are set to `0`.

```
Document {

    Box {
        fillWidth: true
        marginTop: 12
        marginLeft: 12
        marginRight: 12

        color: "white"
        
        layout: "row"

        Box {
            marginRight: 6
            width: 100
            height: 100
            color: "red"
        }

        Box {
            marginRight: 6
            width: 100
            height: 100
            color: "green"
        }

        Box {
            marginRight: 6
            width: 100
            height: 100
            color: "blue"
        }
    }

    Box {
        marginTop: 8
        marginLeft: 12
        width: 300
        height: 100
        color: "orange"
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-flow}</span>
<span class="go-next">{@tutorial layout-position}</span>
</div>
