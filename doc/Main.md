# Shellfish Declarative Toolkit

## Introduction

In short, Shellfish is a **declarative toolkit** for JavaScript environments and targets
**full-stack development**. This means, it covers both, the client UI and the server side.

Its runtime has **no additional dependencies** and works on any compatible JavaScript
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

### Layout Concepts for UI

Layouting UI elements on screen is intuitive, yet powerful.

* {@tutorial layout-visible}
* {@tutorial layout-size}
* {@tutorial layout-flow}
* {@tutorial layout-margin}
* {@tutorial layout-position}
* {@tutorial layout-scrolling}
* {@tutorial layout-ruler}

### Generic Topics

* {@tutorial ui-colors}
* {@tutorial ui-profiles}
* {@tutorial ui-timer}
* {@tutorial ui-listmodel}

### UI Topics

* {@tutorial ui-theme}
* {@tutorial ui-transitions}
* {@tutorial ui-animations}
* {@tutorial ui-defered}
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

### October 2023
* The element {@link ui.Button} is now stylable with templates.

### August 2023
* The `modelData` property is now only defined on elements where needed. This
  makes it possible to access the `modelData` property of a delegate from
  further down the hierarchy.
* The element {@link core.RpcProxy} now has a `status` property for monitoring
  the connection status.
* The new elements {@link core.TreeModelAdapter} and {@link ui.TreeBranch} help
  to implement collapsible tree views based on a list model.

### July 2023
* The new function {@link core.generateUid} generates a UID that is unique
  within the Shellfish environment.
* The element {@link ui.ScrollIndicator} has a new property `reverse` for
  reversing the scrolling direction.
* The new element {@link core.InertialEngine} provides a simple physics engine
  for inertial motion with friction.
* The new element {@link ui.FlickGesture} adds flick gestures for scrolling to
  a {@link html.MouseBox}.
* Ancestor references such as `thisDocument` or `thisMenu` are now implemented
  via the resolver function in Shui code and no longer take up a property.
  Thus, the `this...` references are now available for all elements in
  Shui code.
* The new keyword `unresolved` can be used before JavaScript blocks in Shui to
  process the block as unresolved, i.e. without the Shui resolver overhead.
* Elements derived from {@link html.Item} have new shortcut properties `fill`
  and `margins` for setting `fillWidth` and `fillHeight`, respectively
  `marginTop`, `marginBottom`, `marginLeft`, `marginRight` to the same value.
* **API-Break:** The file data returned by {@link core.Filesystem#read} and
  passed to {@link core.Filesystem#write} has been unified to the new type
  {@link core.Filesystem.FileData}.
* The RPC protocol between {@link core.RpcProxy} and {@link server.RpcSession}
  now supports transfering Uint8Array parameters in binary form.
* The new element {@link core.ScaleModel} provides a list model for generating
  scale displays.

### June 2023
* The method {@link core.Object#wait} now has an optional `name` parameter
  which may be used to abort the waiting anytime via the method
  {@link core.Object#abortWait}.
* The new elements {@link core.Action}, {@link core.SequentialAction},
  {@link core.ParallelAction}, {@link core.ScriptAction}, and
  {@link core.WaitAction} let you setup schedules of actions.
  The element {@link html.ScriptAction} moved to {@link core.ScriptAction}.
* The element {@link html.RpcProxy} moved to {@link core.RpcProxy} and is
  usable on node.  
* It is now possible to use the `async` keyword for functions on Shui elements.
* The elements {@link server.WebSession} and {@link server.DAVSession} compress
  files for transfer, if the client states to accept `gzip` compression.
* The element {@link core.RpcProxy} notifies the server on destruction for
  immediate clean up.
* There is now `dist/require2.js` as an experimental Promise-based version of
  the Shellfish module manager. It should replace the old one when ready.

### May 2023
* The new elements {@link server.RpcSession} and {@link html.RpcProxy} allow
  for a HTTP-based asynchronous RPC connection between client and server.
* The method {@link html.Document#httpRequest} creates a HTTP request with
  progress monitoring. It acts as a replacement for the `fetch` command.
  The property `maxHttpRequests` limits the number of simultaneous HTTP requests.
* **API-Break:** The `when` function property of {@link server.HTTPRoute} takes
  a {@link server.HTTPServer.HTTPRequestEvent} object now.

### April 2023
* The method {@link core.Filesystem#write} now takes an optional progress callback
  function for monitoring the upload progress where supported.
* The new element {@link ui.MenuExpander} provides an expandable menu item with
  sub items.

### March 2023
* Performance optimizations.
* Reference cycles are detected automatically at run-time and are logged to
  the debug console. Make sure to keep an eye on your cycles and resolve them
  properly in order to avoid memory leaks.

### February 2023
* The element {@link html.Video} can now load subtitles in VTT format with
  the properties `subtitles` and `cues`.
* The new UI element {@link ui.ListHeader} provides a simple list header with
  multiple columns for placing directly above a {@link html.ListView}.
* **API-Break:** The properties `withDirectories`, `withFiles`, and `withHidden`
  have been removed from the element {@link core.FSModel}. Use the `filter`
  property instead for setting a filtering function. Simple filtering functions
  can be created via {@link core.FSModel#makeFilter}.

### January 2023
* The new UI element {@link ui.IndexScroller} provides an indexed alternative
  to a scrollbar for use with {@link html.ListView}.

### December 2022
* Reworked the inner HTML and CSS update mechanisms for better performance when
  rendering content in a browser.

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
