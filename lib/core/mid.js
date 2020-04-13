/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

exports.__id = "shellfish/mid";

const mods = [
    __dirname + "/mid/box.js",
    __dirname + "/mid/cameraview.js",
    __dirname + "/mid/canvas.js",
    __dirname + "/mid/document.js",
    __dirname + "/mid/image.js",
    __dirname + "/mid/item.js",
    __dirname + "/mid/label.js",
    __dirname + "/mid/listmodel.js",
    __dirname + "/mid/listmodelview.js",
    __dirname + "/mid/mousebox.js",
    __dirname + "/mid/numberanimation.js",
    __dirname + "/mid/object.js",
    __dirname + "/mid/parallelanimation.js",
    __dirname + "/mid/repeater.js",
    __dirname + "/mid/ruler.js",
    __dirname + "/mid/scriptaction.js",
    __dirname + "/mid/sequentialanimation.js",
    __dirname + "/mid/textinput.js",
    __dirname + "/mid/timer.js"
];

shRequire(mods, function ()
{
    for (var i = 0; i < arguments.length; ++i)
    {
        exports.include(arguments[i]);
    }
});
