# Declaring Methods

Functions declared inside an element act as element methods. Use the `function`
keyword to declare a method function.

    Box {
        id: box

        function doSomething(a, b, c)
        {
            console.log("Doing something with " + a + ", " + b + ", and " +c);
        }
    }

# Invoking Methods

To invoke a method function, call it normally from within a block of code.

    MouseBox {
        onClick: () =>
        {
            box.doSomething("this", "that", "others");
        }
    }

Methods may also be used in binding expressions.

    Box {
        function computeWidth() { return 2 * 42; }

        width: computeWidth() + 24
    }
