Modules are external files loaded by a Shui file. This can be:
* other Shui files (i.e. Shui components)
* files with JavaScript code
* WebAssembly compiled binaries
* CSS files

### Loading Modules

The `require` keyword may be used at the top of a Shui document before the root
element to load modules from other files.

```
require "./MyElement.shui";

Document {

}
```

If the path is prepended by `./` as in this example, then the path is regarded
relative to the path of the current Shui document.

Paths beginning with `/` are absolute paths on the web server serving the current
Shui document.

### Module Aliases

When loading a module, you may use the `as` keyword to assign an alias by which
the module can be addressed. This, for instance, is required if you want to invoke
functions from a JavaScript or WebAssembly module.

```
require "./somecode.js" as code;

MouseBox {
    onClick: () => { code.foo(42); }
}
```

When loading another Shui file this way, you may omit the alias as all loaded
modules are searched automatically for elements. The alias may be
used for disambiguation, however.

```
require "./Box.shui" as myBox;

Document {
    myBox.Box {
        // This is NOT Shellfish's default Box Element
    }

    Box {
        // But this is
    }
}
```

The {@link core core} and {@link declarative declarative} modules are always available in a Shui document
under the aliases `core` and `declarative`, respectively, without having to import them explicitly.

### Loading Stylesheets

CSS stylesheets may be loaded as modules as well. But since stylesheets work
globally, it is advisable to only load them at the beginning of the main Shui document.

The main use for loading CSS stylesheets is to provide icon sets.

```
require "./custom-icons.css";
```

No module alias is used when loading a CSS stylesheet.

### Shortcut Paths

Internal modules are available under shortcut paths, so you don't have to specify
a path on the filesystem.

* `shellfish/low`: The {@link low low} module.
* `shellfish/declarative`: The {@link declarative declarative} module (already loaded).
* `shellfish/html`: The {@link html html} module with elements for HTML UIs.
* `shellfish/ui`: The {@link ui ui} module with lots of UI elements.
* `shellfish/3d`: The {@link shf3d shf3d} module with elements for building 3D scenes with OpenGL.
* `shellfish/fengshui`: The {@link fengshui fengshui} module.
* `shellfish/core/matrix`: The {@link matrix matrix} module for matrix and vector algebra.

Use the shortcut together with the `require` keyword.

```
require "shellfish/ui";
```

### Shui Components

Shui components are other Shui files that can be used just like elements.
When loading components as modules, the filename determines the name of the component.

So, for example, the file `MyComponent.shui` gives the component the name
`MyComponent`.

```
require "./MyComponent.shui";

Document {

    MyComponent {
        aProperty: 42
        bProperty: 5
    }

}
```

Therefore, the filename of a component must begin with a capital letter.

### JavaScript Modules

When loading a JavaScript file, only exported functions are accessible from
outside. To export a function, assign it to the predefined `exports` object.

```
// somecode.js

function internalFunction()
{
    // this function is internal only
}

function foo(a)
{
    // this function is exported
}
exports.foo = foo;
```

```
// main.js

require "./somecode.js" as code;

Document {

    MouseBox {
        onClick: () => { code.foo(42); }
    }

}
```

**Note:** Code in JavaScript modules does not know how to handle dynamic values (such as
element properties) or element identifiers. Without this overhead (or magic, actually),
it runs a tiny bit faster than code blocks inside of a Shui document.

### WebAssembly Modules

WebAssembly modules come in two flavors. Either as stand-alone `.wasm` files,
or together with a JavaScript module for loading and setting up a runtime
environment.

Stand-alone `*.wasm` Modules may be imported and invoked just like JavaScript modules.

```
require "./tools.wasm" as tools;

Document {
    
    MouseBox {
        onClick: () => { tools.foo(42); }
    }

}
```

WebAssembly files that are tied to a runtime, like what the **Emscripten** compiler
toolchain builds, for instance, are loaded by their main JavaScript file.

Depending on the runtime, manual setup may be required after loading.
For example, in case of **Emscripten**, the `onRuntimeInitialized` callback hook
is provided by the **Emscripten** runtime module for taking actions as soon as the
runtime becomes ready.

```
require "./cpptools.js" as tools;

Document {
    id: doc

    property cppTools: null

    onInitialization: () =>
    {
        function init()
        {
            // instantiate a C++ class
            doc.cppTools = new tools.CppTools();
        }

        if (tools.calledRun)
        {
            // the runtime is already initialized, so we may use it right ahead
            init();
        }
        else
        {
            // the runtime will be initialized soon, so we have to setup a callback
            tools.onRuntimeInitialized = init;
        }
    }

    MouseBox {
        onClick: () => { box.cppTools.foo(42); }
    }
}
```

### Loading Modules Dynamically

The {@link core.Object#import import} function lets you load modules dynamically
from within JavaScript code blocks.

It returns a `Promise` object for the module.

```
Box {

    onInitialization: () =>
    {
        import(__dirname + "/tools.js")
        .then(tools =>
        {
            tools.foo(42);
        })
        .catch(err => console.error("Failed to load: " + err));
    }

}
```

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-code}
</span><span class="go-next">
{@tutorial shui-containers}
</span></div>
