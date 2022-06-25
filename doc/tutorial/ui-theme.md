The module {@link ui shellfish/ui} is thoroughly using a {@link ui.Theme Theme}
element for maintaining a uniform look, and so should you.

### Theme in the Document

If you import {@link ui shellfish/ui} into your code, the element
used for `Document` will be {@link ui.Document} (instead of {@link html.Document}),
which is an extension of {@link html.Document}.

It has a property `theme` holding the default theme.
By assigning another theme to this property, you may change the application
theme at runtime.

```
// this line is important for using themes
require "shellfish/ui";

Document {

    theme: DarkTheme { }

}
```

Shellfish provides the themes {@link ui.Theme Theme} and
{@link ui.DarkTheme DarkTheme} in {@link ui shellfish/ui}.

Since `Document` is the root element of the whole application, the `theme` property
will be visible everywhere. It provides you with a number of predefined measurements
and colors you should use instead of absolute values.

```
require "shellfish/ui";

Document {

    Box {
        marginTop: theme.paddingMedium
        layout: "row"

        Box {
            marginLeft: theme.paddingMedium
            width: theme.itemWidthLarge
            height: theme.itemHeightMedium
            color: theme.highlightBackgroundColor
        }

        Box {
            marginLeft: theme.paddingMedium
            width: theme.itemWidthLarge
            height: theme.itemHeightMedium
            color: theme.secondaryBackgroundColor
        }
    }

}
```

![](images/ui-theme-01.png)

See {@link ui.Theme Theme} for a description of the properties provided by themes.


### Custom Themes

You may define custom themes by overriding the properties of {@link ui.Theme Theme}
that you want to change.

```
require "shellfish/ui";

Document {

    theme: Theme {
        primaryColor: "white"
        primaryBackgroundColor: "black"
    }

}
```

Or you may put the new theme into a separate Shui file.

```
// MyTheme.shui

require "shellfish/ui";

Theme {
    primaryColor: "white"
    primaryBackgroundColor: "black"
}
```

```
// main.shui

require "shellfish/ui";
require "./MyTheme.shui";

Document {

    theme: MyTheme { }

}
```

### Local Themes

Elements may declare a local `theme` property, which will then be valid within
the element and all of its children and descendents, since it overshadows the
`theme` property of the root `Document` (as explained in {@tutorial shui-scope}).

```
require "shellfish/ui";

Document {

    Box {
        fillWidth: true
        height: theme.itemHeightLarge
        color: theme.primaryBackgroundColor
        layout: "center"

        Label { text: "This box uses the default theme." }
    }

    Box {
        property theme: DarkTheme { }

        fillWidth: true
        height: theme.itemHeightLarge
        color: theme.primaryBackgroundColor
        layout: "center"

        Label { text: "This box uses the dark theme." }
    }

}
```

![](images/ui-theme-02.png)

Note that because {@link html.Box Box} has no own property `theme`, you have to declare it with
the `property` keyword.

### Automatic Bright Mode / Dark Mode Switch

Some OS such as Windows, MacOS, or Android allow the user to switch between
a bright mode and a dark mode in recent versions.
The current preference is represented by the boolean property `systemDarkMode`
of {@link html.Document Document}.

If you make the application's theme depend on this property, the application will switch
along with the OS automatically.

```
require "shellfish/ui";

Document {

    property brightTheme: Theme { }
    property darkTheme: DarkTheme { }

    theme: systemDarkMode ? darkTheme
                          : brightTheme

    Box {
        fillWidth: true
        height: theme.itemHeightLarge
        color: theme.primaryBackgroundColor
        layout: "center"

        Label { text: "This application adheres to your system's dark mode setting." }
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-colors}</span>
<span class="go-next">{@tutorial ui-profiles}</span>
</div>
