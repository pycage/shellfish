The identifier scope defines the locations where identifiers are visible in Shui documents.
Identifiers may reference
* elements,
* element properties, events, and methods,
* modules (by alias).

# Identifier Lookup Strategy

Looking for an identifier when resolving a reference starts in the element where the reference occured
and follows this strategy:

* If the identifier is `self`, that element is returned.
* Otherwise, if the element has a member (property, method, event) with that identifier, that member is returned.
* Otherwise, the children and descendents of the element are searched for an element
  with the identifier inside the local namespace (see below).
  If such an element exists, it is returned.
* Otherwise, the parent element is searched for the identifier in the same way
  (all the way going up to the root element, if necessary).
* If there was still nothing found, the list of loaded modules is searched for a module
  with that name.
* If the search did not turn up anything, `undefined` is returned.

All locations thus searchable specify the identifier scope.

**Advanced:** The function `__rslv__` is Shui's resolver function implementing the lookup strategy.
It takes the identifier as a string value and has everything else it needs in its function closure.

# Identifier Namespaces

The same element may hold different identifiers in different namespaces. For instance,
when creating a component file, the identifiers used inside the file are not visible
outside and the identifier of the root element may differ.

```
// MyComponent.shui

Box {
    id: daBox

    Label {
        id: boxLabel
        text: "In da box"
    }
}
```

```
// main.shui

require "./MyComponent.shui";

Document {

    MyComponent {
        id: myBox

        Label {
            // THIS DOES NOT WORK: boxLabel is a sibling of this label, but
            // its identifier is not known in the local namespace
            //text: "Boxed: " + boxLabel.text
        }
    }

}
```

Note how `MyComponent` has the identifier `daBox` in `MyComponent.shui`, but
is known by `myBox` in `main.shui`. This is the same element instance, known by different
identifiers in different namespaces.

Note also how `boxLabel` from `MyComponent.shui` is not known in the local namespace
of `main.shui`, even though it is a descendent element.

Namespaces are assigned automatically by the Shui compiler (see {@link fengshui fengshui})
at compile time and may be accessed by the `__namespace` constant as a string value.

Every Shui file and template gets its own namespace this way.

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-previous">
{@tutorial shui-templates}
</span></div>
