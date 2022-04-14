"use strict";

exports.__id = "shellfish/server";

const includes = [
    "davsession",
    "httpauth",
    "httproute",
    "httpserver",
    "httpsession",
    "localfs",
    "websession"
];

shRequire(includes.map(m => __dirname + "/server/" + m + ".js"), (...args) =>
{
    args.forEach(a => exports.include(a));
});
