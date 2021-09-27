# Declaring Methods

Functions declared inside an element act as element methods. Use the `function`
keyword to declare a method function.

```
Box {
    id: box

    function doSomething(a, b, c)
    {
        console.log("Doing something with " + a + ", " + b + ", and " + c);
    }
}
```

# Invoking Methods

To invoke a method function, call it as usual from within a block of code.

```
MouseBox {
    onClick: () =>
    {
        box.doSomething("this", "that", "others");
    }
}
```

Methods may also be called in binding expressions.

```
Box {
    function computeWidth() { return 2 * 42; }

    width: computeWidth() + 24
}
```

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-events}
</span><span class="go-next">
{@tutorial shui-code}
</span></div>
