Timers are abstract elements that emit the `timeout` event at
regular intervals and are useful to update things in the UI
repeatedly.

### The `Timer` Element

The {@link core.Timer Timer} element has a property `running` that controls if the timer is
active. As long as `running` is `false`, which is the default value, the
timer does nothing. 

Usually, the timer triggers the `timeout` event only once. If you want to
have the event triggered repeatedly, set the property `repeat` to `true`
and specify a repetition interval in milliseconds with the property
`interval`.

```
Document {

    Label {
        id: dateLabel
    }

    Timer {
        running: true
        repeat: true
        interval: 1000  // trigger once a second

        onTimeout: () =>
        {
            dateLabel.text = new Date().toTimeString();
        }
    }

}
```

### The `FrameTimer` Element

The {@link html.FrameTimer FrameTimer} element is a special timer that is bound to the screen
refresh rate. Instead of a repetition interval, you may specify a frame
rate of how often the event is emitted within a second with the property
`fps`. The default value is 60 frames per second.

Depending on the attached screen and the system's overall performance,
the specified rate may not be reached, though.

```
Document {

    Label {
        id: dateLabel
    }

    FrameTimer {
        running: true
        repeat: true
        fps: 3  // trigger three times a second

        onTimeout: () =>
        {
            dateLabel.text = new Date().toISOString();
        }
    }

}
```

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial ui-animations}</span>
<span class="go-next">{@tutorial ui-defered}</span>
</div>