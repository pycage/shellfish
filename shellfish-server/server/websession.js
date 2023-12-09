/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2022 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

"use strict";

shRequire([__dirname + "/httpsession.js", __dirname + "/localfs.js"], (httpSession, localFs) =>
{
    const modFs = require("fs");

    function escapeXml(text)
    {
        return text.replace(/[\"'&<>]/g, a =>
        {
            return {
                '"': '&quot;',
                '\'': '&apos;',
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;'
            }[a];
        });
    }

    function formatDate(d)
    {
        function padded(v, n, c)
        {
            let s = "" + v;
            while (s.length < n) s = c + s;
            return s;
        }
    
        const tzOffset = d.getTimezoneOffset();
        const offsetHours = Math.abs(tzOffset) / 60;
        const offsetMinutes = Math.abs(tzOffset) % 60;
    
        return d.getFullYear() + "-" +
               padded(d.getMonth() + 1, 2, '0') + "-" +
               padded(d.getDate(), 2, '0') + "T" +
               padded(d.getHours(), 2, '0') + ":" +
               padded(d.getMinutes(), 2, '0') + ":" +
               padded(d.getSeconds(), 2, '0') + (tzOffset < 0 ? "+" : "-") +
               padded(offsetHours, 2, '0') + ":" + padded(offsetMinutes, 2, '0'); //1997-12-01T17:42:21-08:00
    }

    function rootPath(root, path)
    {
        let rooted = root + "/" + path;
        return rooted.replace(/\/\/+/g, "/");
    }

    function unrootPath(root, path)
    {
        if (path.startsWith(root))
        {
            path = path.substring(root.length);
            if (! path.startsWith("/"))
            {
                path = "/" + path;
            }
            return path;
        }
        else
        {
            return path;
        }
    }

    function pathToHref(path)
    {
        return path.split("/").map(p => encodeURIComponent(p)).join("/");
    }

    function hrefToPath(href)
    {
        if (href.startsWith("http://") || href.startsWith("https://"))
        {
            const url = new URL(href);
            return decodeURIComponent(url.pathname);
        }
        else
        {
            return decodeURIComponent(href.replace(/\?.*$/, ""));
        }
    }

    function makeIndexDocument(unmappedUrl, root, path, files)
    {
        let out = "<!DOCTYPE html>";
        out += "<html>";
        out += "<head>";
        out += "<meta charset=\"utf-8\">";
        out += "<title>Contents of " + escapeXml(unmappedUrl) + "</title>";
        out += "</head>";
        out += "<body>";
        out += "<h1>" + escapeXml(unmappedUrl) + "</h1>";
        out += "<ul>";

        files.forEach(f =>
        {
            const fileUrl = (unmappedUrl + "/" + f.name).replace(/\/\//g, "/");
            out += "<li>";
            out += "<a href='" + escapeXml(fileUrl) + "'>" + escapeXml(f.name) + "</a>";
            out += "<br>" + f.mimetype + ", " + f.size + " bytes";
            out += "</li>";
        });

        out += "</ul>";
        out += "</body>";
        out += "</html>";
        return out;
    }


    const d = new WeakMap();

    /**
     * Class representing a plain web session serving a filesystem for
     * GET and HEAD methods.
     * 
     * When requesting a folder, a simple HTML page with the folder's contents
     * is generated.
     * 
     * ### Example
     * ```
     * HTTPServer {
     * 
     *     host: "0.0.0.0"
     *     port: 8000
     * 
     *     LocalFS {
     *         id: localFs
     *     }
     * 
     *     HTTPRoute {
     * 
     *         delegate: WebSession {
     *             filesystem: localFs
     *             root: "/opt/www"
     *             indexFile: "index.html"
     *         }
     * 
     *     }
     * 
     * }
     * ```
     * 
     * @extends server.HTTPSession
     * @memberof server
     * 
     * @property {string} indexFile - (default: `""`) If set, a redirect is made to this file (e.g. `"index.html"`) when attempting to open a directory.
     * @property {core.Filesystem} filesystem - (default: `null`) The filesystem to serve.
     * @property {string} root - (default: `"/"`) The local path to use as the root folder.
     */
    class WebSession extends httpSession.HTTPSession
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null,
                indexFile: "",
                root: "/"
            });

            this.notifyable("filesystem");
            this.notifyable("indexFile");
            this.notifyable("root");

            this.onRequest = ev => { this.webRequest(ev); }
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            d.get(this).filesystem = fs;
            this.filesystemChanged();
        }

        get indexFile() { return d.get(this).indexFile; }
        set indexFile(f)
        {
            d.get(this).indexFile = f;
            this.indexFileChanged();
        }

        get root() { return d.get(this).root; }
        set root(r)
        {
            d.get(this).root = r;
            this.rootChanged();
        }

        webRequest(ev)
        {
            switch (ev.method)
            {
            case "GET":
                this.webGet(ev);
                break;
            case "HEAD":
                this.webHead(ev);
                break;
            default:
                ev.response(500, "Unsupported")
                .send();
            }
        }

        webGet(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url.path));
            this.log("WWW", "info", "GET " + path);
            const range = ev.range;

            const mayCompress = (ev.headers.get("accept-encoding") || "").indexOf("gzip") !== -1;

            priv.filesystem.fileInfo(path)
            .then(finfo =>
            {
                if (finfo.type === "d")
                {
                    if (priv.indexFile !== "")
                    {
                        // redirect to index file
                        ev.response(302, "Relocate")
                        .header("Location",
                                ev.unmappedUrl.path +
                                (ev.unmappedUrl.path.endsWith("/") ? "" : "/") +
                                priv.indexFile)
                        .send();
                    }
                    else
                    {
                        // list directory
                        priv.filesystem.list(path)
                        .then(files =>
                        {
                            ev.response(200, "OK", mayCompress)
                            .body(makeIndexDocument(ev.unmappedUrl.path, priv.root, path, files), "text/html")
                            .send();
                        })
                        .catch(err =>
                        {
                            this.log("WWW", "error", err);
                            ev.response(500, "Internal Server Error")
                            .send();
                        });
                    }
                    return;
                }

                priv.filesystem.read(path)
                .then(file =>
                {
                    if (range.length === 0)
                    {
                        // no range
                        ev.response(200, "OK", mayCompress)
                        .header("Accept-Ranges", "bytes")
                        .stream(file.stream(), finfo.mimetype, finfo.size)
                        .send();
                    }
                    else
                    {
                        const from = Math.min(range[0], finfo.size - 1);
                        const to = Math.min(range[1] !== -1 ? range[1]
                                                            : finfo.size - 1,
                                            finfo.size - 1);
                        this.log("WWW", "info", "Bytes Range: " + from + "-" + to + "/" + finfo.size);
                        ev.response(206, "Partital Content", mayCompress)
                        .header("Accept-Ranges", "bytes")
                        .header("Content-Range", "bytes " + from + "-" + to + "/" + finfo.size)
                        .header("Last-Modified", new Date(finfo.mtime).toUTCString())
                        .stream(file.slice(from, to).stream(), finfo.mimetype, to - from + 1)
                        .send();
                    }
                })
                .catch(err =>
                {
                    this.log("WWW", "error", err);
                    ev.response(500, "Internal Server Error")
                    .send();
                });
            })
            .catch(err =>
            {
                this.log("WWW", "error", err);
                ev.response(403, "Forbidden")
                .send();
            });
        }

        webHead(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url.path));
            this.log("WWW", "info", "HEAD " + path);

            priv.filesystem.fileInfo(path)
            .then(finfo =>
            {
                ev.response(200, "OK")
                .header("Content-Size", "" + finfo.size)
                .header("Content-Type", finfo.mimetype)
                .header("Last-Modified", new Date(finfo.mtime).toUTCString())
                .send();
            })
            .catch(err =>
            {
                this.log("WWW", "error", err);
                ev.response(403, "Forbidden")
                .send();
            });
        }

    }
    exports.WebSession = WebSession;

});