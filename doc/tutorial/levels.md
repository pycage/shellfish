In the article {@tutorial concepts}, you learned about the basic concepts of
Shellfish's declarative nature. This is quite a high-level abstraction of
code programming, compared to procedural code.

Shellfish itself is structured into three *levels of abstraction* with an API for
each level.

### low

The low level (see {@link low}) provides a procedural API for dealing with the HTML
DOM and CSS inside the browser or a similar runtime environment.

This is the foundation the higher levels build upon. As a programmer, you
rarely have to use the low level API directly.

### mid

The mid level (see {@link mid}) provides an object-oriented toolkit of UI elements.

This is an example of code using the mid level:

```
const myDocument = new html.Document();

const myBox = new html.Box();
myDocument.add(myBox);

const myLabel = new html.Label();
myLabel.text = "I am a label";
myBox.add(myLabel);
```

This is the kind of code you write with most classic UI toolkits. Fortunately,
as a Shellfish programmer, you may skip this tedious level entirely.

The mid level builds the foundation for Shellfish's high level. Only when you intend
to implement new custom mid level elements derived from other elements, the mid level may
concern you.

### high

The high level (see {@link high}) is a declarative wrapper for the mid level. This is
the level where concepts such as dynamic values or bindings are introduced.

However, writing declarative code in plain JavaScript can be quite ugly, especially
when dealing with bindings:

```
const myDocument = high.element(html.Document);
myDocument
.add(
    high.element(html.Box)
    .add(
        high.element(html.Label)
        .id("label1")
        .set("text", "I am Label 1")
    )
    .add(
        high.element(html.Label)
        .set("text", high.binding([high.chainRef(myDocument, ["label1", "text"], __rslv__)],
                t =>
        {
            return "I am Label 2. By the way, Label 1 shows " +
                    t.val.length + " characters of text.";
        }))
    )
);
myDocument.init();
```

This is where *Shui* -- short for Shellfish UI -- comes into play.

### Shui

Did I say there were three levels? Well, *Shui* is not a level, but a language
different from JavaScript. It was designed for creating declarative high level code
with ease and is the prefered way to go.

Let's take a look at the example code from above. Here is the same code written
in Shui:

```
Document {

    Box {
        Label {
            id: label1
            text: "I am Label 1"
        }

        Label {
            text: "I am Label 2. By the way, Label 1 shows " +
                    label1.text.length + " characters of text."
        }
    }

}
```

This looks so much cleaner, doesn't it?

Shui isn't an interpreted language, though. All code written in Shui compiles
to JavaScript code similar to the example shown in the high level section above.
So basically, you create high level code, but written in a language that makes
the task a lot easier and cleaner.

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial concepts}
</span></div>
