/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2018 - 2022 Martin Grimme <martin.grimme@gmail.com>

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

exports.__id = "shellfish/core/mime";

const EXTENSIONS = {
    ".7z":    "application/x-7z-compressed",
    ".apk":   "application/java-archive",
    ".avi":   "video/x-msvideo",
    ".bat":   "application/x-batch",
    ".c":     "text/plain",
    ".cbr":   "application/x-rar-compressed",
    ".cbz":   "application/zip",
    ".cc":    "text/plain",
    ".cpp":   "text/plain",
    ".css":   "text/css",
    ".exe":   "application/x-executable",
    ".flac":  "audio/flac",
    ".flv":   "video/x-flv",
    ".gif":   "image/gif",
    ".gz":    "application/gzip",
    ".h":     "text/plain",
    ".hpp":   "text/plain",
    ".htm":   "text/html",
    ".html":  "text/html",
    ".ini":   "text/plain",
    ".iso":   "application/x-iso9660-image",
    ".jar":   "application/java-archive",
    ".jpeg":  "image/jpeg",
    ".jpg":   "image/jpeg",
    ".js":    "text/javascript",
    ".json":  "application/x-json",
    ".m4v":   "video/mp4",
    ".md":    "text/x-markdown",
    ".mp3":   "audio/mp3",
    ".mp4":   "video/mp4",
    ".mpeg":  "video/mpeg",
    ".mpg":   "video/mpeg",
    ".odt":   "application/vnd.oasis.opendocument.text",
    ".ogg":   "audio/ogg",
    ".pdf":   "application/pdf",
    ".png":   "image/png",
    ".pro":   "text/plain",
    ".py":    "application/x-python",
    ".qml":   "application/x-qml",
    ".rar":   "application/x-rar-compressed",
    ".rtf":   "text/rtf",
    ".sh":    "application/x-shellscript",
    ".shui":  "text/plain",
    ".svg":   "image/svg+xml",
    ".txt":   "text/plain",
    ".tgz":   "application/gzip",
    ".vcf":   "text/vcard",
    ".wasm":  "application/wasm",
    ".webm":  "video/webm",
    ".webp":  "image/webp",
    ".xml":   "text/xml",
    ".zip":   "application/zip"
};

const NAMES = {
    "ChangeLog": "text/plain",
    "INSTALL": "text/plain",
    "LICENSE": "text/plain",
    "Makefile": "text/plain",
    "NEWS": "text/plain",
    "README": "text/plain"
};

exports.mimeType = function (path)
{
    var idx = path.lastIndexOf("/");
    var name = idx !== -1 ? path.substr(idx + 1)
                          : path; 

    idx = path.lastIndexOf(".");
    var ext = idx !== -1 ? path.substr(idx)
                         : "";

    return EXTENSIONS[ext.toLowerCase()] ||
           NAMES[name] ||
           "application/octet-stream";
};
