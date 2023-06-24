# Shellfish Declarative Toolkit

In short, Shellfish is a **declarative toolkit** for JavaScript environments and targets
**full-stack development**. This means, it covers both, the client UI and the server side.

Its runtime has **no additional dependecies** and works on any compatible JavaScript
runtime environment, including:

* Modern web browsers
* Node.js
* Runtime environments like Electron or Capacitor

Shellfish also features Shui, a **modeling language** taking full advantage
of Shellfish's declarative nature.

This is what the obligatory "Hello, world!" example could look like in Shui code:

```
require "shellfish/ui";

Document {

    title: "Hello, world of declarative programming!"

    Label {
        text: parent.title
    }

}
```

Shui code is translated to JavaScript code before execution. This can either
happen on the fly as the code gets loaded, or on the server-side on demand, 
or even by shipping only pre-translated code. It's your choice.


## References

* [UI-Gallery](https://pycage.github.io/shellfish/ui-gallery)
* [API Documentation](https://pycage.github.io/shellfish/doc)
