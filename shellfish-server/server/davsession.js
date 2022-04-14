/*******************************************************************************
This file is part of the Shellfish toolkit.
Copyright (c) 2017 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/httpsession.js", "shellfish/core/xmlsax"], (httpSession, xmlsax) =>
{
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
    
    function hasProperty(props, prop)
    {
        return props.indexOf("DAV::allprop") != -1 || props.indexOf(prop) != -1;
    }
    
    function makeResponseXml(href, fileInfo, requestedProperties)
    {
        let xml = "<D:response>" +
                  "<D:href>" + href + "</D:href>" +
                  "<D:propstat>" +
                  "<D:prop>";
        
        if (hasProperty(requestedProperties, "DAV::displayname"))
        {
            xml += "<D:displayname>" + encodeURIComponent(fileInfo.name) + "</D:displayname>";
        }
        if (hasProperty(requestedProperties, "DAV::creationdate"))
        {
            xml += "<D:creationdate>" + formatDate(fileInfo.ctime) + "</D:creationdate>";
        }
        if (hasProperty(requestedProperties, "DAV::getlastmodified"))
        {
            xml += "<D:getlastmodified>" + formatDate(fileInfo.mtime) + "</D:getlastmodified>";
        }
        if (hasProperty(requestedProperties, "DAV::getcontentlength"))
        {
            xml += "<D:getcontentlength>" + fileInfo.size + "</D:getcontentlength>";
        }
        if (hasProperty(requestedProperties, "DAV::getcontenttype"))
        {
            xml += "<D:getcontenttype>" + 
                   (fileInfo.type === "d" ? "application/x-folder"
                                          : fileInfo.mimetype) +
                   "</D:getcontenttype>";
        }
        if (hasProperty(requestedProperties, "DAV::resourcetype"))
        {
            xml += "<D:resourcetype>" +
                   (fileInfo.type === "d" ? "<D:collection/>"
                                          : "") +
                   "</D:resourcetype>";
        }
        xml += "</D:prop>" +
               "<D:status>HTTP/1.1 200 OK</D:status>" +
               "</D:propstat>" +
               "</D:response>\n";
        return xml;
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
            return decodeURIComponent(href);
        }
    }

    function makeIndexDocument(root, path, files)
    {
        let out = "<!DOCTYPE html>";
        out += "<html>";
        out += "<head>";
        out += "<meta charset=\"utf-8\">";
        out += "<title>Contents of " + escapeXml(path) + "</title>";
        out += "</head>";
        out += "<body>";
        out += "<h1>" + escapeXml(unrootPath(root, path)) + "</h1>";
        out += "<ul>";

        files.forEach(f =>
        {
            const unrootedPath = unrootPath(root, f.path);
            out += "<li>";
            out += "<a href='" + escapeXml(pathToHref(unrootedPath)) + "'>" + escapeXml(f.name) + "</a>";
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
     * Class representing a WebDAV session serving a filesystem.
     * 
     * @extends server.HTTPSession
     * @memberof server
     * 
     * @property {core.Filesystem} - (default: `null`) The filesystem to serve.
     * @property {string} root - (default: `"/"`) The path in the filesystem to use as the root folder.
     */
    class DAVSession extends httpSession.HTTPSession
    {
        constructor()
        {
            super();
            d.set(this, {
                filesystem: null,
                root: "/"
            });

            this.notifyable("filesystem");
            this.notifyable("root");

            this.onRequest = ev => { this.davRequest(ev); }
        }

        get filesystem() { return d.get(this).filesystem; }
        set filesystem(fs)
        {
            d.get(this).filesystem = fs;
            this.filesystemChanged();
        }

        get root() { return d.get(this).root; }
        set root(r)
        {
            d.get(this).root = r;
            this.rootChanged();
        }

        davRequest(ev)
        {
            if (! d.get(this).filesystem)
            {
                return;
            }

            switch (ev.method)
            {
            case "COPY":
                this.davCopy(ev);
                break;
            case "DELETE":
                this.davDelete(ev);
                break;
            case "GET":
                this.davGet(ev);
                break;
            case "HEAD":
                this.davHead(ev);
                break;
            case "MKCOL":
                this.davMkcol(ev);
                break;
            case "MOVE":
                this.davMove(ev);
                break;
            case "OPTIONS":
                this.davOptions(ev);
                break;
            case "PROPFIND":
                this.davPropfind(ev);
                break;
            case "PROPPATCH":
                this.davProppatch(ev);
                break;
            case "PUT":
                this.davPut(ev);
                break;
            default:
                this.response(500, "Unsupported")
                .send();
            }
        }

        davCopy(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            const destination = rootPath(priv.root, hrefToPath(ev.headers.get("destination") || ""));
            this.log("DAV", "info", "COPY " + path + " -> " + destination);

            priv.filesystem.copy(path, destination)
            .then(() =>
            {
                this.response(201, "Copied")
                .send();
            })
            .catch(err =>
            {
                this.response(401, "Forbidden")
                .body("" + err)
                .send();
            });
        }

        davDelete(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            this.log("DAV", "info", "DELETE " + path);

            this.filesystem.remove(path)
            .then(() =>
            {
                this.response(204, "No Content")
                .send();
            })
            .catch(err =>
            {
                this.response(403, "Forbidden")
                .body("" + err)
                .send();
            });
        }

        davGet(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            this.log("DAV", "info", "GET " + path);
            const range = ev.range;

            this.filesystem.fileInfo(path)
            .then(finfo =>
            {
                if (finfo.type === "d")
                {
                    this.filesystem.list(path)
                    .then(files =>
                    {
                        this.response(200, "OK")
                        .body(makeIndexDocument(priv.root, path, files), "text/html")
                        .send();
                    });
                    return;
                }

                this.filesystem.read(path)
                .then(file =>
                {
                    if (range.length === 0)
                    {
                        // no range
                        this.response(200, "OK")
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
                        this.log("DAV", "info", "Bytes Range: " + from + "-" + to + "/" + finfo.size);
                        this.response(206, "Partital Content")
                        .header("Accept-Ranges", "bytes")
                        .header("Content-Range", "bytes " + from + "-" + to + "/" + finfo.size)
                        .stream(file.stream(from, to), finfo.mimetype, to - from + 1)
                        .send();
                    }
                })
                .catch(err =>
                {
                    this.response(500, "Internal Server Error")
                    .body("" + err)
                    .send();
                });
            })
            .catch(err =>
            {
                this.response(403, "Forbidden")
                .body("" + err)
                .send();
            });
        }

        davHead(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            this.log("DAV", "info", "HEAD " + path);

            this.filesystem.fileInfo(path)
            .then(finfo =>
            {
                this.response(200, "OK")
                .header("Content-Size", "" + finfo.size)
                .header("Content-Type", finfo.mimetype)
                .send();
            })
            .catch(err =>
            {
                this.response(403, "Forbidden")
                .body("" + err)
                .send();
            });
        }

        davMkcol(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            this.log("DAV", "info", "MKCOL " + path);
            priv.filesystem.mkdir(path)
            .then(() =>
            {
                this.response(201, "Created")
                .send();
            })
            .catch(err =>
            {
                console.error(err);
                this.response(403, "Forbidden")
                .send();
            });
        }

        davMove(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            const destination = rootPath(priv.root, hrefToPath(ev.headers.get("destination") || ""));
            this.log("DAV", "info", "MOVE " + path + " -> " + destination);

            priv.filesystem.move(path, destination)
            .then(() =>
            {
                this.response(201, "Moved")
                .send();
            })
            .catch(err =>
            {
                this.response(409, "Conflict")
                .body("" + err)
                .send();
            });
        }

        davOptions(ev)
        {
            this.log("DAV", "info", "OPTIONS");
            this.response(200, "OK")
            .header("DAV", "1, 2")
            .send();
        }

        davPropfind(ev)
        {
            const priv = d.get(this);

            ev.body()
            .then(xml =>
            {
                const depth = ev.headers.get("depth") || "infinity";
                const path = rootPath(priv.root, hrefToPath(ev.url));
                this.log("DAV", "info", "PROPFIND " + path);

                if (xml === "")
                {
                    xml = "<D:propstat xmlns:D='DAV:'><D:allprop/></D:propstat>";
                }

                const saxHandler = new xmlsax.Handler();
                const saxParser = new xmlsax.Parser(saxHandler);
                saxParser.parseString(xml);

                const doc = saxHandler.document();
                if (! doc)
                {
                    this.response(500, "Internal Error")
                    .send();
                    return;
                }

                // get list of requested properties
                const props = [];
                doc.children.forEach(propNode =>
                {
                    if (propNode.name === "DAV::prop")
                    {
                        propNode.children
                        .filter(c => c.type === "tag")
                        .forEach(c => 
                        {
                            props.push(c.name);
                        });
                    }
                    else if (propNode.name === "DAV::allprop")
                    {
                        props.push(propNode.name);
                    }
                });

                priv.filesystem.fileInfo(path)
                .then(finfo =>
                {
                    if (finfo.type === "d" && depth !== 0)
                    {
                        priv.filesystem.list(path)
                        .then(files =>
                        {
                            let xml = "<?xml version='1.0' encoding='utf-8'?>" +
                                      "<D:multistatus xmlns:D='DAV:'>";
        
                            files.forEach(cfinfo =>
                            {
                                const unrootedPath = unrootPath(priv.root, cfinfo.path);
                                xml += makeResponseXml(pathToHref(unrootedPath),
                                                       cfinfo,
                                                       props);
                            });

                            xml += "</D:multistatus>";
        
                            this.response(207, "Multi-Status")
                            .body(xml, "application/xml")
                            .send();
                        })
                        .catch(err =>
                        {
                            this.response(500, "Internal Error")
                            .body("" + err, "text/plain")
                            .send();
                        });
                    }
                    else
                    {
                        const unrootedPath = unrootPath(priv.root, finfo.path);
                        const xml = "<?xml version='1.0' encoding='utf-8'?>" +
                                    "<D:multistatus xmlns:D='DAV:'>" +
                                    makeResponseXml(pathToHref(unrootedPath), finfo, props) +
                                    "</D:multistatus>";
        
                        this.response(207, "Multi-Status")
                        .body(xml, "application/xml")
                        .send();
                    }
                })
                .catch(err =>
                {
                    this.response(404, "Resource Not Available")
                    .send();
                });
            });
        }

        davProppatch(ev)
        {
            const priv = d.get(this);
            this.log("DAV", "info", "PROPPATCH");
            
            ev.body()
            .then(xml =>
            {
                console.log(xml);

                const saxHandler = new xmlsax.Handler();
                const saxParser = new xmlsax.Parser(saxHandler);
                saxParser.parseString(xml);

                const doc = saxHandler.document();
                if (! doc)
                {
                    this.response(500, "Internal Error")
                    .send();
                    return;
                }

                let out = "<?xml version='1.0' encoding='utf-8'?>" +
                          "<D:multistatus xmlns:D='DAV:'>";

                doc.children.forEach(updateNode =>
                {
                    if (updateNode.name === "DAV::set")
                    {
                        const propsNode = updateNode.children[0];

                        updateNode.children[0].children.forEach(propNode =>
                        {
                            const propName = propNode.name;
                            const propValue = propNode.children[0].data;

                            console.log("SET " + propName + " = " + propValue);

                            out += "<D:propstat>" +
                                   "<D:prop><" + propName + "/></D:prop>" +
                                   "<D:status>HTTP/1.1 424 Failed Dependency</D:status>" +
                                   "</D:propstat>";
                        });
                    }
                    else if (updateNode.name === "DAV::remove")
                    {
                        updateNode.children[0].children.forEach(propNode =>
                        {
                            const propName = propNode.name;

                            console.log("REMOVE " + propName);

                            out += "<D:propstat>" +
                                    "<D:prop><" + propName + "/></D:prop>" +
                                    "<D:status>HTTP/1.1 409 Conflict</D:status>" +
                                    "</D:propstat>";
                        });
                    }

                    console.log(out);
                });

                out += "</D:multistatus>";

                this.response(207, "Multi-Status")
                .body(out, "application/xml")
                .send();
            });

        }

        davPut(ev)
        {
            const priv = d.get(this);

            const path = rootPath(priv.root, hrefToPath(ev.url));
            this.log("DAV", "info", "PUT " + path);

            priv.filesystem.write(path, ev.stream)
            .then(() =>
            {
                this.response(200, "OK")
                .send();
            })
            .catch(err =>
            {
                this.response(409, "Conflict")
                .body("" + err)
                .send();
            });
        }
    }
    exports.DAVSession = DAVSession;

});