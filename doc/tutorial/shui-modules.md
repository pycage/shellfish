Modules are external files loaded by a Shui file. These are
* other Shui files (i.e. Shui components)
* files with JavaScript code
* CSS files

# Loading a Module

The `require` keyword may be used at the top of a Shui document before the root
element to load modules from other files.

```
require "./MyElement.shui";

Document {
    ...
}
```

If the path is prepended by `./` as in this example, then the path is regarded
relative to the path of the current Shui document.

Paths beginning with `/` are absolute paths on the web server serving the current
Shui document.

# Module Aliases

When loading a module, you may use the `as` keyword to assign an alias by which
the module can be addressed. This, for instance, is required if you want to invoke
functions from a JavaScript module.

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

The {@link mid mid} and {@link high high} modules are always available in a Shui document
under the aliases `mid` and `high`, respectively, without having to import them explicitly.

# Loading Stylesheets

CSS stylesheets may be loaded as modules as well. But since stylesheets work
globally, it is advisable to only load them at the beginning of the main Shui document.

The main use for loading CSS stylesheets is for providing icon sets.

```
require "./custom-icons.css";
```

No module alias is used when loading a CSS stylesheet.

# Shortcut Paths

Internal modules are available under shortcut paths, so you don't have to specify
a path on the filesystem.

* `shellfish/low`: The {@link low low} module.
* `shellfish/mid`: The {@link mid mid} module (already loaded).
* `shellfish/high`: The {@link high high} module (already loaded).
* `shellfish/ui`: The {@link ui ui} module with lots of elements implemented in Shui.
* `shellfish/fengshui`: The {@link fengshui fengshui} module.
* `shellfish/matrix`: The {@link matrix matrix} module for matrix and vector algebra.

Use the shortcut together with the `require` keyword.

```
require "shellfish/ui";
```

# Shui Components

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

# JavaScript Files

When loading a JavaScript file, only exported functions are accessible from
outside. To export a function, assign it to the predefined `exports` object.

```
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
require "./somecode.js" as code;

MouseBox {
    onClick: () => { code.foo(42); }
}
```

**Note:** Code in JavaScript files does not know how to handle dynamic values (such as
element properties) or element identifiers. Without this overhead (or magic, actually),
it runs a tiny bit faster than code blocks inside of a Shui document.
