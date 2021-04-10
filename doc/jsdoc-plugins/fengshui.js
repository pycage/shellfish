// JSDoc plugin for compiling Shui to JavaScript

const modFengshui = require("./../../lib/fengshui.js");
const modPath = require("path");

exports.handlers = {
    beforeParse: function (e)
    {
        e.source = modFengshui.compile(modPath.basename(e.filename), e.source);
    }
};
