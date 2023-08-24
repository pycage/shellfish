/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2017 - 2023 Martin Grimme <martin.grimme@gmail.com>

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

/**
 * **Module ID:** `shellfish/ui`
 * 
 * This module provides various UI components written in Shui and support for
 * theming the UI.
 * 
 * @namespace ui
 */

exports.__id = "shellfish/ui";

const mods = [
    "Button",
    "Calendar",
    "CheckBox",
    "DarkTheme",
    "DatePicker",
    "Dialog",
    "Document",
    "FlickGesture",
    "FocusIndicator",
    "FSIcon",
    "FSItem",
    "FSTreeNode",
    "FSView",
    "IndexScroller",
    "Label",
    "ListHeader",
    "ListViewSelector",
    "Loader",
    "Menu",
    "MenuExpander",
    "MenuItem",
    "MenuItemBase",
    "MenuSeparator",
    "MultiSelectionBox",
    "OverflowScroller",
    "Overlay",
    "Page",
    "PageHeader",
    "PageStack",
    "PinchGesture",
    "Placeholder",
    "ScrollIndicator",
    "SelectionBox",
    "Slider",
    "SpinBox",
    "SplitBox",
    "Switch",
    "TextArea",
    "TextEntry",
    "Theme",
    "TimePicker",
    "Tooltip",
    "TreeBranch",
    "Window",
    "WindowTitle"
];

shRequire("shellfish/fengshui", function (fengshui)
{
    shRequire(mods.map(m => __dirname + "/ui/" + m + ".shui"), function ()
    {
        for (var i = 0; i < arguments.length; ++i)
        {
            exports.include(arguments[i]);
        }
    }, fengshui.compile);
});
