The {@link html.ListView ListView} and {@link core.Repeater Repeater}
elements accept a {@link core.ListModel ListModel} element
for defining their contents.

The list model encapsulates a list of arbitrary items together with methods
for accessing and modifying the list. A range of events notifies observers
such as the {link html.ListView ListView} about changes.

### Creating a List Model

List models are created empty initially. Use the `data` attribute to pass
an initial list of items.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

}
```

### Accessing Items and Size

The {@link core.ListModel#at at} method lets you access an item at a given
position.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        console.log("Item #2: " + at(1));
    }

}
```

The `size` property contains the current size of the list.

### Inserting Items

New items are inserted at a given position with the
{@link core.ListModel#insert insert} method. The position is the position the
new item will have in the list after insertion. Therefore, inserting at `size`
will append the new item at the end.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        # insert at the beginning
        insert(0, "mango");
        # append at the end
        insert(size, "pineapple");
    }

}
```

Each insertion triggers events to update the views visualizing the list model.
If you want to insert a bulk of items without triggering updates inbetween,
use the {@link core.ListModel#bulkInsert bulkInsert} method. This works
exactly like {@link core.ListModel#insert insert}, except that it takes a list
of items to insert at the given position.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        bulkInsert(2, ["jackfruit", "durian", "kiwi"]);
    }

}
```

If the list of the list model is ordered and you want to insert a new item
automatically at the place where it belongs to, use the
{@link core.ListModel#insertOrdered insertOrdered} method. This method takes
the item to insert and a comparator function that defines the intended sort order.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        insertOrdered("raspberry", (a, b) => a.length - b.length);
    }

}
```

The comparator function takes two items to compare and returns
* a negative value, if the first item is considered less than the second,
* a positive value, if the first item is considered greater than the second,
* 0, if the two items are considered the same.

### Removing and Replacing Items

The {@link core.ListModel#remove remove} method removes the item at the given
position.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        // remove "orange"
        remove(2);
    }

}
```

The {@link core.ListModel#replace replace} method replaces the item at the
given position with a new one.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        # replaces "orange" with "lemon"
        replace(2, "lemon");
    }

}
```

If you want to replace all items of the list model at once, use the
{@link core.ListModel#reset reset} method and pass the new list of items.
This method has the same effect as assigning a new list to the `data` attribute.

```
ListModel {

    data: ["apple", "banana", "orange", "strawberry", "peach"]

    onInitialization: () =>
    {
        reset(["lettuce", "cucumber", "tomato"]);
    }

}
```

### Number Sequences

The {@link core.ListModel#sequence sequence} method creates a sequence of
numbers starting a given value.
This is useful for initializing a list model quickly, for example.

```
ListModel {

    data: sequence(10, 5)

}
```

is the same as

```
ListModel {

    data: [10, 11, 12, 13, 14]

}
```



<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-defered}</span>
<span class="go-next">{@tutorial ui-listmodel}</span>
</div>
