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

### Introduction to Shui

Shui is the declarative description language used by Shellfish.

* {@tutorial shui-elements}
* {@tutorial shui-events}
* {@tutorial shui-methods}
* {@tutorial shui-code}
* {@tutorial shui-modules}
* {@tutorial shui-containers}
* {@tutorial shui-templates}
* {@tutorial shui-scope}

### Layout Concepts

Layouting elements on screen is intuitive, yet powerful.

* {@tutorial layout-visible}
* {@tutorial layout-size}
* {@tutorial layout-flow}
* {@tutorial layout-margin}
* {@tutorial layout-position}
* {@tutorial layout-scrolling}
* {@tutorial layout-ruler}

### UI

* {@tutorial ui-colors}
* {@tutorial ui-theme}
* {@tutorial ui-profiles}
* {@tutorial ui-transitions}
* {@tutorial ui-animations}
* {@tutorial ui-timer}
* {@tutorial ui-defered}
* {@tutorial ui-listmodel}
* {@tutorial ui-dragndrop}
<!--
-->

<!--

### Filesystem

* Opening File Dialogs
* The Offline Filesystem
* Implementing New Filesystems

### Communication

* Using WebSockets
* Filesystems

### Asynchronous Programming

* Running Tasks in a Thread Pool
* Using Callback Functions
* Implementing the Active Object Pattern

### Multimedia and Game Technology

* Using the Canvas
* Accessing the Web Cam
* Playing Videos
* Reading Gamepad Input
* Scrolling a Tile Map
* FrameTimer
* Measuring the Frames per Second

### Shellfish 3D

* Composing a 3D Scene
* Materials and Textures
* Loading Models
* Detecting Collisions

### Extending Classes

* The Modules Manager
* Deriving from Object
* Deriving from Item

### Debugging

* The Debug Dump
-->


## News

### November 2022
* The nullish-coalescing operator (??) can now be used in Shui code.
* The optional-chaining operator (?.) can now be used in Shui code.
* The {@link ui.Button} element has the new property `repeatAcceleration`
  for repeated triggering while holding down.
* The element {@link ui.Slider} is now stylable with templates.
* The element {@link ui.SpinBox} is now stylable with templates.
* The element {@link ui.SplitBox} is now stylable with templates.
* The element {@link ui.Switch} is now stylable with templates.
* The new property `order` of {@link html.Item} allows you to change the layout
  order of elements dynamically.

### October 2022
* The element {@link html.ListView} has a new property `overflowBehavior` for
  disabling or enabling scrolling.
* The element {@link html.ListView} has a new property `snapMode` for snapping
  to items after scrolling.
* The new property `scrolling` of {@link html.Item} tells if an item is currently
  scrolling its content.

### September 2022
* The new element {@link ui.MultiSelectionBox} provides a selection box for
  multi-selections.
* The new method {@link core.Object#waitQueued} allows for asynchronous actions
  to wait in a named queue. The method {@link core.Object#clearQueue} clears a
  named queue, cancelling all waiting actions.
* It is now possible to build Shellfish packages with ES2015 syntax for running
  in legacy environments by using the Babel compiler while bundling.
  Pass the `--legacy` option to `make-bundle.js` to enable.
* **API Break:** The element {@link ui.FSItem} has no property `filesystem`
  anymore. The path given to `thumbnail` is an URL now, e.g. a Blob URL.

### August 2022
* Some of the most common basic element types are preproduced and held in stock
  by `shellfish/declarative` for better element creation performance with Shui.
* Elements derived from {@link html.Item} have the new bounding box properties
  `bboxX`, `bboxY`, `bboxWidth`, and `bboxHeight`. Using these usually gives a
  better performance than referencing particular members of the `bbox` property.
* The element {@link server.HTTPServer} has the new property `enabled` for turning
  the server on or off.
* The element {@link core.FileStorage} has the new read-only property `ready` to
  get notified when the file storage is loaded and ready.

### July 2022
* The new element {@link shf3d.Surface} provides a flat rectangular 2D surface
  for use in 3D scenes.

### May 2022
* **API Break:** The module `shellfish/high` is now named `shellfish/declarative`.
  Since this module is usually not imported directly by application code,
  applications should not be affected by this API break.
* WebAssembly is now directly supported by the module loader, so WASM modules
  may be loaded like any other Shellfish module or JavaScript file.
  The element {@link core.Wasm} is thus deprecated and should not be used in new
  code. It will be removed eventually.
* The new method {@link core.Object#import} imports JavaScript, CSS, or WASM
  modules dynamically.

### April 2022
* The new method {@link core.Object#log} provides a simple means for controlling
  application logging.
* The new method {@link server.HTTPResponse#enableCrossOriginIsolation} provides
  a comfortable way to set the HTTP headers for cross-origin-isolation on a HTTP
  response.
* The examples gallery is now included in the main distribution.
* The module `shellfish/3d` is now included in the main distribution.

### February 2022
* The `function` keyword may now be used in JavaScript sections of Shui files.
* Shellfish is expanding its reach to the server-side to allow full-stack
  implementations with declarative Shui code and the new `shellfish-server` API.
* **API Break:** The module `shellfish/mid` is now named `shellfish/html` and is
  no longer imported by default in Shui documents. Shui modules with UI code
  should import `shellfish/ui` (which includes `shellfish/html`).
* The method {@link ui.Menu#popup} accepts `null` as the `parent` parameter to
  open the menu near the mouse pointer.
* The element {@link html.Document} has the new non-notifyable properties `pointerX`
  and `pointerY` for accessing the document-global pointer coordinates.

### January 2022
* The new method {@link html.ListModel#insertOrdered} inserts items into a list
  model according to a custom comparator function. 
* The new method {@link html.Object#wait} lets you delay actions asynchronously.
* The elements {@link html.TextInput} and {@link html.TextArea} have a new method
  {@link html.TextArea#selectRange selectRange} for selecting a range of text
  programmatically.
* The `PointerEvent` of {@link html.MouseBox} has a new boolean property `directTarget`,
  which tells if the MouseBox was targeted directly, i.e. the event did not come
  through another MouseBox.

### November 2021
* Some rendering issues in the {@link html.ListView} element have been fixed.
* The superfluous `dataChange` event has been removed from {@link html.Object}.
  In case of delegate items, the `modelDataChanged` event does the same.
* The new elements {@link ui.Window} and {@link ui.WindowTitle} provide a way
  to put draggable and resizable floating windows into a parent box.
* The {@link html.Repeater} element now arranges spawned items in the order
  given by its model when modifying the model.
* The new element {@link ui.OverflowScroller} provides a way for the user to
  scroll overflowing toolbars and other boxes.
* The filesystem implementations {@link html.DavFS} and {@link html.OfflineFS}
  have a move operation now, and file info objects have `ctime` and `mtime` fields
  for the creation time and modification time, respectively.
* The element {@link html.MouseBox} can now detect clicks even if a drag handler
  is connected. Compatibility issues with the Sailfish Browser have been fixed.
* The element {@link ui.SplitBox} has the new properties `orientation` for
  changing the layout orientation, and `flip` for flipping both containers.
  The new property `splitRatio` lets you change the split ratio programmatically.

### October 2021
* The element {@link html.Repeater} has a new property `count` that tells the number
  of spawned items.
* The element {@link html.TextArea} has a new method {@link html.TextArea#shiftRows shiftRows}
  for shifting a block of rows.
* The element {@link html.TextArea} has a new method {@link html.TextArea#rowAt rowAt}
  for retrieving the row number at a given text position.
* The element {@link ui.TextArea} has new containers `backgroundContainer`,
  `bottomMarginContainer`, `topMarginContainer`, `leftMarginContainer`, and
  `rightMarginContainer` for decorations such as line numbers, syntax highlighting,
  etc.
* The JavaScript regular expressions syntax (e.g. `/abc.*[0-9]/i`) may now be used
  in Shui files.
* There are new elements {@link html.SyntaxHighlighter} and {@link html.SyntaxToken}
  for defining syntax highlighting rules for text.
* The element {@link html.Label} has a new property `filter` for implementing advanced
  text processing, e.g. syntax highlighting.
* The element {@link html.TextArea} has a new property `caretColor` for changing the
  caret color.
* The new elements {@link html.LocalStorage} and {@link html.FileStorage} persist any of their
  custom properties to the HTML5 local storage or a file on a {@link html.Filesystem} automatically.
* The new element {@link html.History} allows to control the browser history.
* The new function {@link low.later} returns a Promise object that resolves when
  idle.
* {@link html.DavFS} has a new property `cache` for caching list results.
* {@link html.DavFS} has a new property `fetchManager` for using a {@link low.FetchManager}
  instance.
* The `click` event of {@link html.MouseBox} reports the pressed buttons now.

### September 2021
* {@link html.TextArea} has new methods {@link html.TextArea#eraseAt eraseAt},
  {@link html.TextArea#insertAt insertAt}, {@link html.TextArea#positionAt positionAt},
  and {@link html.TextArea#setCursor setCursor}.
* The function {@link fengshui.load} returns a Promise object now.
* {@link html.FpsMeter} has new property `manual` and method
  {@link html.FpsMeter#takeFrame takeFrame} for manual frame counting.
* The `await` keyword may now be used in JavaScript sections of Shui files.
* {@link html.Item} has the new property `aspectRatio` for maintaining a fixed aspect
  ratio when resizing an element.
* There is a new element {@link ui.Tooltip} for tooltips.
* The property `inputDevice` of {@link html.Document} shows the state `keyboard` now
  during keyboard-based navigation.
* {@link html.Item} has new properties `maxWidth` and `maxHeight`.
* Improved performance of element creation.

### August 2021
* There are new UI elements {@link ui.Calendar}, {@link ui.DatePicker}, and {@link ui.TimePicker}.
* Many bugs have been fixed.
