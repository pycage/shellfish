Method functions and event handlers are code blocks inside a Shui document. Code
blocks are written in JavaScript language.

# Accessing Elements

Elements may be accessed by their identifier and used like normal objects.

```
const myBox = box;
```

Methods may be invoked just like normal object methods.

```
myBox.foo(42);
```

Properties of an element may be accessed and modified as if they were normal variables.

```
box.width = 100;
console.log(box.height);
```

Changing the value of a property this way will cause all bindings depending on that
property to re-evaluate immediately.

If you omit the identifier, the property is looked up in its scope consisting of the
element containing the code block and its ancestors (see {@tutorial shui-scope} for details).

```
width = 100;
```

The special identifier `self` may be used to reference the element that contains the
code block. `self` may be omitted in this case, though.

```
self.width = 100;
```

# Local Variables

Local variables may be declared with the JavaScript keywords `var`, `let`, and `const`.

 * `var` declares a variable with function scope. Even if declared inside a block body,
   a variable declared this way will be visible outside the block, even before it was
   declared. Since `var` uses this weird function scope, its use is **deprecated** in JavaScript.

 * `let` declares a variable with block scope. It is not visible outside its block body.

 * `const` declares a constant with block scope. It is not allowed to assign a new value
   to a `const` after its declaration, but it is allowed to modify the value itself
   (for example, you may append elements to a `const` list).

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-methods}
</span><span class="go-next">
{@tutorial shui-modules}
</span></div>
