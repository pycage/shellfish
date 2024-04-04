### Handling Log Messages

Logging is built into the base {@link core.Object Object} class already with
the {@link core.Object#log log} method.

This method, by default, simply calls the `log` method of its parent, if there
is one. In order to handle logging, you have to override the `log` method of
the object in the hierarchy where you want to log. This is typically at the
top level.

You are free to handle logging in any way you like.

```
HTTPServer {

    // override the "log" method
    function log(domain, level, message)
    {
        const now = new Date();
        const s = now.toLocaleString() + " [" + domain + "] " + message;

        if (level === "error" || level === "fatal")
        {
            console.error(s);
        }
        else
        {
            console.log(s);
        }
    }

    ...

}
```

The {@link core.Object#log log} method takes three parameters:

* `domain`: The name of the logging domain. This may be any name.
* `level`: The severity level of the log message.
* `message`: The text of the log messages.

In order to log a message, simply invoke the {@link core.Object#log log} method
of an object.

```
Timer {
    interval: 500

    onTimeout: () =>
    {
        log("Timer", "info", "The timer expired.");
    }
}
```

### Internal Logging Domains

Shellfish uses the empty string (`""`) as domain for internal log messages.

Some classes in the `shellfish/server` module also use other domains for
log messages that may be of special interest:

* `"HTTPServer"` for messages related to the HTTP server
* `"HTTP"` for messages related to generic HTTP traffic
* `"WWW"` for messages related to Web content traffic
* `"DAV"` for messages related to WebDAV traffic
* `"RPC"` for messages related to Remote Procedure Calls
* `"TokenAuth"` for messages related to token-based authentication

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-next">{@tutorial ui-colors}</span>
</div>
