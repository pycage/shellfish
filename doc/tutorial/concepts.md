# What does *Declarative* Mean?

Declarative programming is a paradigm where you concentrate on describing
the outcome of what you intend, rather than describing the way of what must be done
in order to get what you intend.

Think of a spreadsheet application, where you have a number of fields holding
values, but also some fields holding formula expressions. Whenever you change
one of the values, the fields with the formulas update their result values accordingly
and automatically. As a user, you don't have to calculate and enter the new
results by yourself. Instead, the result is declaratively described by a formula
epxression.

The spreadsheet is modeling a dependency between input fields and result
fields. A lot of dependencies exist also in application user interfaces, which
makes declarative programming an ideal choice for building UIs.

For instance, buttons may only be clickable under certain circumstances, while
the visibility or size of other elements may depend on a lot of other factors.
The modeling all of these dependencies with procedural or object oriented programming
can result in pieces of code that are hard to extend or maintain.

# Dynamic Values

Shellfish uses a thing called *dynamic values* to represent values that may change
over time. Watchers may subscribe to a dynamic value to get notified whenever its
value changes.

So, for instance, if the width of an element, represented by a dynamic value
changes, other elements may adjust their geometry or other properties accordingly
while watching the dynamic value holding the width.

Example:

    width: another.width

# Bindings

Remember the spreadsheet application example from above? Besides fields with simple
values, there were also fields holding formula expressions.
In Shellfish, the analogy to such a field is be a *binding*.

Bindings may hold complex expressions dealing with many dynamic values or
constant values and yield a result that changes whenever one of the dynamic
values changes. By nature, bindings are dynamic values themselves, so other
bindings in turn may depend on the results of bindings.

Bindings hold expressions written in JavaScript that are re-evaluated
whenever one of the expression's dependencies change.

Example:

    width: Math.min(another1.width, another2.width) / 2

# Elements

A graphical user interface is made up of things like buttons, menus, checkboxes,
frames, and many more. These are the *elements* of the UI. Elements may be nested
and composed in order to get new, more complex elements.

But there are also elements in a UI that have no representation on screen. These
elements are called *abstract elements*. For example, a timer element that triggers
a piece of code to be run periodically would be such an abstract element.

Elements are configured by a number of properties, which they expose as dynamic values.
By assigning bindings to properties, you may model complex UI dependencies that
would otherwise be a pain to maintain in procedural or object-oriented code.

This is an example of a {@link mid.Label Label} element with a `text` property:

    Label {
        text: "I am a label."
    }

And these are two labels `label1` and `label2` that are connected by a binding
dependency:

    Label {
        id: label1
        text: "I am Label 1"
    }

    Label {
        text: "I am Label 2. By the way, Label 1 shows " + label1.text.length + 
              " characters of text."
    }

Note how `label2` incorporates the value of a property of `label1` in its own
`text` property. The value of `label2`'s `text` property is a binding, expressed
by a line of code written in JavaScript.

Elements that may contain other elements nested inside are called *container elements*.
Let's nest a label inside a box:

    Box {
        Label { 
            text: "I'm a label in a box."
        }
    }
