# Shellfish

## Introduction

Shellfish is a **declarative toolkit library** for creating HTML5 user
interfaces.
The runtime has **no additional dependencies** and works on any browser or HTML5
runtime environment (such as e.g. Electron or Capacitor) that supports
modern ECMAScript, which pretty much every recent browser out there does.

It also features Shui, a **UI modeling language** taking full advantage
of Shellfish's declarative nature, loosely inspired by QML. If you are into
QML, you will quickly feel at home with Shui.

This is what the obligatory "Hello, world!" example could look like in Shui code:

```
require "shellfish/ui";

Document {

    title: "Hello, world of declarative UI programming!"

    Label {
        text: parent.title
    }

}
```

Shui code is translated to JavaScript code before execution. This can either
be done on the fly as the code gets loaded, or by the web server on demand, 
or even by shipping only pre-translated code. It's your choice.
