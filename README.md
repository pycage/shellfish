# Shellfish

Shellfish is a **declarative toolkit library** for creating HTML5 user
interfaces.
The runtime has **no additional dependencies** and works on any browser or HTML5
runtime environment (such as e.g. Electron or Capacitor) that supports
ECMAScript 2015 a.k.a. ES6.

It also features Shui, a **UI modeling language** taking full advantage
of Shellfish's declarative nature, loosely inspired by QML. If you are into
QML, you will quickly feel at home with Shui.

This is the obligatory "Hello, world!" in Shui code:

```
require "shellfish/ui";

Document {

    title: "Hello, world of declarative UI programming!"

    Label {
        text: parent.title
    }

}
```

## Set up the SDK

Make sure you have Node.js (https://nodejs.org) installed on your computer for
setting up the Shellfish SDK.

Run
    npm install
to install the necessary dependencies of the SDK.

### Build a Shellfish Bundle

Run
    npm run build-package
to generate the `shellfish.pkg` bundle file in `build/` for easy distribution.

### Build the Core Icons Stylesheet

Run
    npm run build-icons
to generate the stylesheet with the core icons from the SVG files
in `icons/svg/`.

### Generate the Shellfish Documentation

Run
    npm run generate-docs
to generate Shellfish's documentation in `build/doc/`.

# Bundles

Shellfish's module loader supports **module bundles** to reduce transfer times.
A bundle is a single file containing all required code modules.
Since transfering a single file to the web browser causes less overhead than
transfering module by module, the application will start up a lot faster.
And since all bundled modules are available on the browser-side, loading
a module does not require an extra roundtrip to the server.

## References

* [UI-Gallery](https://pycage.github.io/shellfish/ui-gallery)
* [API Documentation](https://pycage.github.io/shellfish/doc)

## Common questions answered

### What does "declarative" mean?

With declarative programming, you specify the result you want to get, instead
of how to get to the result.

For instance, instead of updating a label every time a value changes, you just
declare that label to show that value, and whenever the value changes, the
label updates accordingly.

With Shui, this can be expressed like this:
```
Label {
    text: "The current window width is " + documentRoot.windowWidth
}
```

You may even use complex JavaScript expressions instead of simple values, like this:
```
Label {
    text: "The double of the square root of the window width is " +
          Math.sqrt(documentRoot.windowWidth) * 2 +
          ", while the window height is " + documentRoot.windowHeight +
          ". Thus the window's area is " +
          (documentRoot.windowWidth * documentRoot.windowHeight) +
          " square pixels."
}
```

### How to integrate Shui?

Shui code is translated to plain JavaScript code before running in the browser.
This can either be done on-the-fly when loading the module, or by pre-compiling.

So, essentially, to the browser, Shui is JavaScript, which means that you may
even load JavaScript modules in Shui modules and vice versa.

Translating Shui to JavaScript dynamically at runtime causes only little
overhead.

Typically, you have a `index.html` file that loads the Shellfish module loader
`require.js` and use a bunch of `data-` attributes:

* `data-bundle` instructs the module loader to load a bundle,
  or multiple bundles if separated by commas. Here we use it to load the
  Shellfish bundle packed as `shellfish.pkg`.
* `data-main` instructs the module loader to load the given script as
  the main entry-point. Here we use it to load the Shui loader module
  `shui-loader.js`, which is found in the Shellfish bundle.
* `data-shui` instructs the Shui loader to load the given Shui file as the
  initial document. Here we use it to load our file `main.shui`.

The contents of the `body` tag are visible to the user before `main.shui` takes
over. This could be used to show a splash screen, for example.

```
<!DOCTYPE html>
<html>
<head>
  <script src="require.js"
          data-bundle="shellfish.pkg"
          data-main="shui-loader.js"
          data-shui="main.shui"></script>
</head>
<body>
You may display some content here that the user sees while Shellfish is loading.
</body>
</html>
```

This is all the HTML code you ever need for your web app. Pretty neat.


### Can Shellfish be used without Shui?

Yes, since Shui simply translates to JavaScript code using the Shellfish
JavaScript API, you may use this API directly. In fact, this is how I did
user interfaces with Shellfish before I started to work on the Shui
compiler Feng-Shui.

However, since Shui makes programming user interfaces a breeze, and since it
adds almost no additional overhead, I see no reason why not to use Shui for your
UI.


### Can Shellfish be extended with custom elements?

Yes, by deriving from Shellfish's `Object` class for abstract elements with
no UI representation and by deriving from the `Item` class for UI elements
(of course there are no classes in JavaScript, but ES6 has the `class` keyword
as syntactic sugar for prototypal inheritence).

It is also possible to implement custom elements with Shui. Actually, most of
Shellfish's predefined elements are implemented with Shui.


### Can CSS be used to style Shellfish UIs?

Yes, although for Shui the prefered way is to use the `Theme` element, instead.
You can assign CSS classes to every Shellfish UI element via the `style` property.

There are two ways for loading CSS documents:

* Just link them statically from `index.html`,
* or load CSS files dynamically via the Shellfish module loader just as you
  would load JavaScript modules. CSS files may even be packed in bundles.
