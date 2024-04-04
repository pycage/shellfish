The module {@link server shellfish/server} provides elements for building
servers.

### HTTP Server

The element {@link server.HTTPServer HTTPServer} sets up a HTTP server listening on a specified
port and host address.

```
require "shellfish/server";

HTTPServer {

    port: 8000
    host: "0.0.0.0"

}
```

In this example, the server is listening on port 8000 on all interfaces, since
the host address is `"0.0.0.0"`.

### HTTPS with SSL Encryption

By switching the `secure` property to `true` and providing a
{@link https://en.wikipedia.org/wiki/X.509 X.509 server certificate}
and key in PEM format, you instruct the server to use SSL encryption for all
communication.

```
require "shellfish/server";

HTTPServer {

    port: 8443
    host: "0.0.0.0"

    secure: true
    certificate: "/etc/ssl/server-cert.pem"
    key: "/etc/ssl/server-key.pem"
}
```

### Routing Requests

Every incoming HTTP request may take a different route depending on various
properties. In order to create routes, place a number of {@link server.HTTPRoute HTTPRoute}
elements inside the `HTTPServer`. The `HTTPRoute` has a `when` property for
a predicate function that decides for each request whether that particular route
is to be taken.

The routes are tested one by one until one matches the request with its `when` predicate.

This is an example of routing depending on the path in the request URLs.

```
require "shellfish/server";

HTTPServer {

    port: 8000
    host: "0.0.0.0"

    HTTPRoute {
        // this route handles URL paths under /www/
        when: req => req.url.path.startsWith("/www/")
    }

    HTTPRoute {
        // this route handles the /login POST request only
        when: req => req.method === "POST" && req.url.path === "/login"
    }

    HTTPRoute {
        // this route has no special predicate and thus handles
        // all other requests
    }
}
```

You can also use the `when` predicate to look at the HTTP headers, and
implement virtual servers by recognizing the `Host` header.

```
require "shellfish/server";

HTTPServer {

    port: 8000
    host: "0.0.0.0"

    HTTPRoute {
        // this route handles requests to the address http://virtualhostA.com
        when: req => req.headers.get("Host") === "virtualhostA.com"
    }

    HTTPRoute {
        // this route handles GET requests to the address http://virtualhostB.com/www/...
        when: req => req.headers.get("Host") === "virtualhostB.com" &&
                     req.method === "GET" &&
                     req.url.path.startsWith("/www/")
    }
}
```

Since testing for a path prefix is pretty common, you may also use the method
`pathPrefix()` of `HTTPRoute` for creating a predicate function.

```
HTTPRoute {
    when: pathPrefix("/www/")
}
```

### The Request Object

Lets take a further look at the request object, which is of the type
{@link server.HTTPServer.HTTPRequestEvent HTTPRequestEvent}.

The property `method` tells you about the HTTP method of the request, such
as for example `GET`, `POST`, or `HEAD` for the most common ones.

The IP address and port from which the request originated is available in the
`sourceAddress` and `sourcePort` properties, respectively. With this, you could
limit access to a particular route to a certain source address.

```
HTTPRoute {
    // allow requests from localhost only
    when: req => req.sourceAddress === "127.0.0.1"
}
```

The HTTP headers of the request are found as a map in the `headers` property.

Likewise, the values of the HTTP cookies are found in the `cookies` property.

The `url` property holds an URL object including these properties:

* `href`: The full URL string, e.g. `http://www.example.com:8000/www/index.html?a=42&b=foo`
* `protocol`: The protocol part of the URL, e.g. `http:`.
* `hostname`: The hostname, e.g. `www.example.com`.
* `port`: The port number, e.g. `8000`.
* `path`: The path string, e.g. `/www/index.html`.
* `search`: The raw search expression, usually used for `GET` parameters.
* `parameters`: A dictionary of the parameters from the `search` expression.

### Serving Static Web Content

So far, our example routes did not do anything. It is up to session delegates
to actually handle the incoming requests. These delegates are created dynamically
by the `HTTPRoute` from a template as needed. Thus, do not forget to mark the delegate
with the `template` keyword.

Let's handle static web content with the {@link server.WebSession WebSession} element. This element
serves a given root path on any file system. The next example uses {@link server.LocalFS LocalFS}
for accessing the local file system on the hard disk.

This is already a fully working web server serving static content from `/var/www`.

```
require "shellfish/server";

HTTPServer {
    port: 8000
    host: "0.0.0.0"

    HTTPRoute {
        delegate: template WebSession {
            filesystem: LocalFS { }
            root: "/var/www"
        }
    }
}
```

### Handling Generic Requests

The most generic session delegate is the {@link server.HTTPSession HTTPSession}, which is
also the base class for {@link server.WebSession WebSession}.

The `request` event gets emitted on incoming requests and lets you respond to
the request with the `response()` method of the request.

```
HTTPSession {

    onRequest: req =>
    {
        if (req.method === "GET")
        {
            req.response(200, "OK")
            .body("You requested " + req.url.href)
            .send();
        }
        else
        {
            req.response(404, "Not Found")
            .send();
        }
    }

}
```

`response()` takes the HTTP result code (e.g. 200 for OK) and a textual
representation of the code and returns a {@link server.HTTPResponse HTTPResponse} object.

The methods of the response object may be chained until you finally submit the
response with `send()`.

```
req.response(200, "OK")
.header("X-Custom-Header", "foo")
.body("You requested " + req.url.href, "text/plain")
.send();
```

Besides sending a string with the `body()` method, you may also use the `stream`
method for streaming from a `ReadableStream`.

```
// stream a PNG file of length 112960 bytes from disk
req.response(200, "OK")
.stream(myStream, "image/png", 112960)
.send();
```

If you don't know the content size before-hand, you may switch to chunked transfer
by suppliying `-1` for the size.

```
// stream large content of unknown length
req.response(200, "OK")
.stream(myStream, "application/zip", -1)
.send();
```

If the client stated that it accepts compressed data, the data gets compressed
automatically in order to save network bandwidth.

### Receiving Data

Some HTTP request methods like `POST` or `PUT` may send additional data in its
body. The request object provides methods for reading this data.

The method `body()` returns a promise for reading the data as string.

```
HTTPSession {

    onRequest: async req =>
    {
        const data = await req.body();
        console.log("Data Received:");
        console.log(data);

        req.response(200, "OK").send();
    }
}
```

Likewise, the method `arrayBuffer()` returns a promise for reading the data as
binary array buffer.

```
HTTPSession {

    onRequest: async req =>
    {
        const data = await req.body();
        console.log("Binary Data Received:");
        console.log("Size: " + data.byteLength + " Bytes");

        req.response(200, "OK").send();
    }
}
```

If you want to read from the request as a ReadableStream, access the `stream`
property.

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-previous">{@tutorial server-shellfish-node}</span>
<span class="go-next">{@tutorial server-sessions}</span>
</div>
