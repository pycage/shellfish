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

## Learn to Use Shellfish *(work in progress)*

### The Basics

* {@tutorial setup}
* {@tutorial concepts}
* {@tutorial levels}

### Shui

Shui is the declarative UI description language used by Shellfish.

* {@tutorial shui-elements}
* {@tutorial shui-events}
* {@tutorial shui-methods}
* {@tutorial shui-code}
* {@tutorial shui-modules}
* {@tutorial shui-containers}
* {@tutorial shui-templates}
* {@tutorial shui-scope}

### Layout

Layouting elements on screen is intuitive, yet powerful.

* {@tutorial layout-size}
* {@tutorial layout-flow}
* {@tutorial layout-position}
* {@tutorial layout-scrolling}
<!--
* Visbility
* Positioning Freely
* Controlling the Size
* Sizing Dynamically
* Aligning with Rulers
* The Bounding Box
-->

### Debugging

* The Debug Dump *(work in progress)*

### How To

These articles show you how to achieve things with Shellfish.

* *(work in progress)*
<!--
* Creating Elements Dynamically
* Representing Lists of Data
* Using Asynchronous Code
* ...
-->

<!--
### The Mid Level

* The Lifecycle of an Object
* Deriving Custom Elements
* Reference Counting
-->

## News

### September 2021
* {@link mid.TextArea} has new methods {@link mid.TextArea#eraseAt eraseAt},
  {@link mid.TextArea#insertAt insertAt}, {@link mid.TextArea#positionAt positionAt},
  and {@link mid.TextArea#setCursor setCursor}.
* The function {@link fengshui.load} returns a Promise object now.
* {@link mid.FpsMeter} has new property `manual` and method
  {@link mid.FpsMeter#takeFrame takeFrame} for manual frame counting.
* The `await` keyword may now be used in JavaScript sections of Shui files.
* {@link mid.Item} has the new property `aspectRatio` for maintaining a fixed aspect
  ratio when resizing an element.
* There is a new element {@link ui.Tooltip} for tooltips.
* The property `inputDevice` of {@link mid.Document} shows the state `keyboard` now
  during keyboard-based navigation.
* {@link mid.Item} has new properties `maxWidth` and `maxHeight`.
* Improved performance of element creation.

### August 2021
* There are new UI elements {@link ui.Calendar}, {@link ui.DatePicker}, and {@link ui.TimePicker}.
* Many bugs have been fixed.
