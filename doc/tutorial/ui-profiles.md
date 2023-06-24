Profiles allow you to share a common set of properties between elements or
to implement UI states.

### The `profiles` Property

Every element has the `profiles` property which takes a list of profile objects.
Profile objects are plain objects with some properties declared.

```
Document {

    Object {
        id: boxProfile

        property marginBottom: 8
        property width: 50
        property height: 50
        property color: "cyan"
    }

    Box { profiles: [boxProfile] }
    Box { profiles: [boxProfile] }
    Box { profiles: [boxProfile] }
    
}
```

### Shared Changes

When the property value of a profile object changes, all elements sharing that profile
will change accordingly.

```
Document {

    Object {
        id: boxProfile

        property marginBottom: 8
        property width: 50
        property height: 50
        property color: "cyan"
    }

    MouseBox {
        color: "#ccc"
        
        onClick: () =>
        {
            boxProfile.width = boxProfile.width > 50 ? 50 : 100;
        }
        
        Label { text: "Click Me to Modify the Profile" }
    }

    Box { profiles: [boxProfile] }
    Box { profiles: [boxProfile] }
    Box { profiles: [boxProfile] }
    
}
```

### States

You may implement varying UI states by exchanging the profiles at runtime.

```
Document {

    property boxState: stateA

    Object {
        id: stateA

        property marginBottom: 8
        property width: 50
        property height: 50
        property color: "cyan"
    }

    Object {
        id: stateB

        property marginBottom: 12
        property width: 64
        property height: 64
        property color: "red"
    }

    MouseBox {
        color: "#ccc"
        
        onClick: () =>
        {
            if (boxState === stateA)
            {
                boxState = stateB;
            }
            else
            {
                boxState = stateA;
            }
        }
        
        Label { text: "Click Me to Switch States" }
    }

    Box { profiles: [boxState] }
    Box { profiles: [boxState] }
    Box { profiles: [boxState] }
    
}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-colors}</span>
<span class="go-next">{@tutorial ui-timer}</span>
</div>