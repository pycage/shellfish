/*******************************************************************************
This file is part of Shellfish-3D.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

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
 * **Module ID:** `shellfish/3d`
 * 
 * This module provides 3D elements for use with Shellfish to render scenes in
 * 3D.
 * 
 * The `View` element is used to render a scene.
 * 
 * ```
 * shf3d.View {
 *     ambience: rgb(1.0, 1.0, 1.0)
 * 
 *     scene: shf3d.Group {
 *         shf3d.Camera {
 *             location: vec3(0, 0, 5)
 *         }
 *         shf3d.Cube {
 *             rotationAxis: vec3(1, 1, 0)
 *             rotationAngle: 30
 *             material: shf3d.Material { color: colorName("red") }
 *         }
 *     }
 * }
 * ```
 * 
 * The scene is represented by a scene entity. The `Group` scene entity is used
 * to group several scene entities together to be treated as one.
 * This way, scenes of arbitrary complexity may be composed.
 * 
 * Since the camera is a scene entity itself, it may be moved through the scene,
 * for example, as member of a moving `Group`.
 * 
 * The `View` can switch between multiple cameras in a scene.
 * 
 * @module shf3d
 */

exports.__id = "shellfish/3d";

const mods = [
    "camera",
    "clone",
    "collider",
    "cube",
    "entity",
    "group",
    "heightmesh",
    "light",
    "material",
    "mesh",
    "model3d",
    "sphere",
    "subview",
    "view"
];

shRequire(mods.map(m => __dirname + "/shf3d/" + m + ".js"), function ()
{
    for (var i = 0; i < arguments.length; ++i)
    {
        exports.include(arguments[i]);
    }
});
