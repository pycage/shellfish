### The Content Area

The content area is the total area occuppied by the content of an overflowing box
(see `overflowBehavior` in {@tutorial layout-position}), of which
only the portion inside the viewport is visible at a time.

The read-only properties `contentWidth` and `contentHeight` tell the current
total size of the content area.

### The Viewport

The properties `contentX`, `contentY` specify the current top-left position of the
scrolling viewport inside a box.

You may modify these properties to scroll manually. Otherwise, they
are updated automatically as the user scrolls.

The size of the viewport is described by the read-only `bboxWidth` and `bboxHeight` properties, since it is the
same as the element's size.

### Scrollbars

The boolean `scrollbars` property of {@link html.Box Box} controls if the HTML runtime
environment shall provide native scrollbars automatically. The default value is `false`,
which means that no native scrollbars are shown. The element {@link ui.ScrollIndicator}
provides an alternative to native scrollbars for a uniform look and feel across all
platforms.

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial layout-position}</span>
<span class="go-next">{@tutorial layout-ruler}</span>
</div>
