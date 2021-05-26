/*******************************************************************************
This file is part of Shellfish.
Copyright (c) 2020 - 2021 Martin Grimme <martin.grimme@gmail.com>

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
 * This module provides the Shellfish matrix toolbox for linear algebra, which is
 * useful when working with coordinates in a 2D or 3D space.
 * 
 * @example <caption>Importing in JavaScript</caption>
 * shRequire("shellfish/matrix", mat =>
 * {
 *     ...
 * });
 * 
 * @example <caption>Importing in Shui</caption>
 * require "shellfish/matrix" as mat;
 * 
 * Object {
 *     ...
 * }
 * 
 * @namespace matrix
 */

exports.__id = "shellfish/matrix";

const DEG_TO_RAD = Math.PI / 180;

exports.PLUS = (a, b) => a + b;
exports.MINUS = (a, b) => a - b;
exports.MULTIPLY = (a, b) => a * b;

/**
 * Type for a (n x m) matrix. A vector is a special form of the matrix with one
 * column or one row.
 * 
 * The matrix is defined in row-major order:
 * 
 *     | 1 2 3 |
 *     | 4 5 6 | ~ [1, 2, 3, 4, 5, 6, 7, 8, 9]
 *     | 7 8 9 |
 * 
 * @typedef {number[][]} Matrix
 * @memberof matrix
 */

/**
 * Returns the shape as `{ rows, cols }` of the given matrix.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix.
 * @returns {object} - The object describing the shape.
 */
function shape(m)
{
    const rows = m.length;
    const cols = m[0].length;
    return { rows, cols };
}
exports.shape = shape;

/**
 * Performs an element-wise operator with a scalar on a matrix.
 * 
 * The element-wise operators `PLUS`, `MINUS`, and `MULTIPLY` are available as
 * predefined functions in the `matrix` module.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix.
 * @param {number} n - The scalar.
 * @param {function} op - The element-wise operator.
 * @return {matrix.Matrix} The resulting matrix.
 */
function elementWise(m, n, op)
{
    const s = exports.shape(m);
    const result = exports.mat(s.rows, s.cols);

    for (let r = 0; r < s.rows; ++r)
    {
        for (let c = 0; c < s.cols; ++c)
        {
            result[r][c] = op(m[r][c], n);
        }
    }
    return result;
}
exports.elementWise = elementWise;

/**
 * Creates a column-vector of the given values.
 * 
 * @memberof matrix
 * 
 * @param {...number} values - The values.
 * @returns {matrix.Matrix} The vector (a (n x 1) matrix).
 */
function vec(...values)
{
    return values.map(a => [a]);
}
exports.vec = vec;

/**
 * Creates a null matrix with the given dimensions.
 * 
 * @memberof Matrix
 * 
 * @param {number} rows - The amount of rows.
 * @param {number} cols - The amount of columns.
 * @return {matrix.Matrix} The matrix.
 */
function mat(rows, cols)
{
    const m = [];
    for (let r = 0; r < rows; ++r)
    {
        const mRow = [];
        m.push(mRow);
        for (let c = 0; c < cols; ++c)
        {
            mRow.push(0);
        }
    }
    return m;
}
exports.mat = mat;

/**
 * Creates a matrix from an array, given in row-major order.
 * 
 * @memberof matrix
 * 
 * @param {number[]} arr - The array of values in row-major order.
 * @param {number} cols - The amount of columns.
 * @returns {matrix.Matrix} The matrix.
 */
function fromArray(arr, cols)
{
    const m = [];
    let row = [];
    m.push(row);
    for (let i = 0; i < arr.length; ++i)
    {
        row.push(arr[i]);
        if (row.length === cols && i < arr.length - 1)
        {
            row = [];
            m.push(row);
        }
    }
    return m;
}
exports.fromArray = fromArray;

/**
 * Produces a flat representation of a matrix in row-major order.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix to flatten.
 * @returns {number[]} The flat representation.
 */
function flat(m)
{
    const result = [];
    const s = exports.shape(m);
    for (let row = 0; row < s.rows; ++row)
    {
        for (let col = 0; col < s.cols; ++col)
        {
            result.push(m[row][col]);
        }
    }
    return result;
}
exports.flat = flat;

/**
 * Returns the length of the given column-vector.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} v - The vector.
 * @returns {number} The length of the vector.
 * @throws Throws an error if the matrix is not a vector.
 */
function length(v)
{
    const s = exports.shape(v);
    if (s.cols !== 1)
    {
        throw "Error: length is only defined for vectors";
    }

    return Math.sqrt(v.reduce((a, b) => a + b[0] * b[0], 0.0));
}
exports.length = length;

/**
 * Returns the transpose of the given matrix. Transposing a column-vector
 * creates a row-vector and vice versa.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix to transpose.
 * @returns {matrix.Matrix} The transpose of the matrix.
 */
function t(m)
{
    const s = exports.shape(m);
    const t = exports.mat(s.cols, s.rows);

    for (let row = 0; row < s.rows; ++row)
    {
        for (let col = 0; col < s.cols; ++col)
        {
            t[col][row] = m[row][col];
        }
    }
    return t;
}
exports.t = t;

/**
 * Returns the result of the addition of two matrices or of a matrix with a scalar.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} a - The matrix.
 * @param {matrix.Matrix|number} b - A matrix or a scalar.
 * @return {matrix.Matrix} The resulting matrix.
 * @throws Throws an error if the two matrices are of different dimensions.
 */
function add(a, b)
{
    if (typeof b === "number")
    {
        return exports.elementWise(a, b, exports.PLUS);
    }

    const s1 = exports.shape(a);
    const s2 = exports.shape(b);
    const m = exports.mat(s1.rows, s1.cols);

    if (s1.rows !== s2.rows || s1.cols !== s2.cols)
    {
        throw "Error: m1 and m2 must have the same dimension for addition/subtraction";
    }

    for (let row = 0; row < s1.rows; ++row)
    {
        for (let col = 0; col < s1.cols; ++col)
        {
            m[row][col] = a[row][col] + b[row][col];
        }
    }
    return m;
}
exports.add = add;

/**
 * Returns the result of the subtraction of two matrices or of a matrix with a scalar.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} a - The matrix.
 * @param {matrix.Matrix|number} b - A matrix or a scalar.
 * @return {matrix.Matrix} The resulting matrix.
 */
function sub(a, b)
{
    return exports.add(a, exports.mul(b, -1));
}
exports.sub = sub;

/**
 * Returns the dot product of two column-vectors. Both vectors must have the
 * same dimensions.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} u - The first vector.
 * @param {matrix.Matrix} v - The second vector.
 * @return {number} The dot product.
 * @throws Throws an error if the two vectors are no column-vectors or are of different dimensions.
 */
function dot(u, v)
{
    const s1 = exports.shape(u);
    const s2 = exports.shape(v);
    if (s1.cols !== 1 || s2.cols !== 1 || s1.rows !== s2.rows)
    {
        throw "Error: u and v must be column-vectors with the same dimensions for the dot product";
    }

    let result = 0.0;
    for (let i = 0; i < s1.rows; ++i)
    {
        result += u[i][0] * v[i][0];
    }
    return result;
}
exports.dot = dot;

/**
 * Returns the result of the mulitplication of two matrices, or of a matrix with
 * a scalar.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} a - The first matrix.
 * @param {matrix.Matrix|number} b - The second matrix or a scalar.
 * @returns {matrix.Matrix} The resulting matrix.
 * @throws Throws an error if the two matrices are of different dimensions.
 */
function mul(a, b)
{
    if (typeof b === "number")
    {
        return exports.elementWise(a, b, exports.MULTIPLY);
    }

    const s1 = exports.shape(a);
    const s2 = exports.shape(b);
    const m = exports.mat(s1.rows, s2.cols);

    if (s1.cols !== s2.rows)
    {
        throw "Error: amount of m1's columns must match m2's amount of rows for multiplication";
    }

    for (let row = 0; row < s1.rows; ++row)
    {
        for (let col = 0; col < s2.cols; ++col)
        {
            m[row][col] = 0.0;
            for (let i = 0; i < s1.cols; ++i)
            {
                m[row][col] += a[row][i] * b[i][col];
            }
        }
    }

    return m;
}
exports.mul = mul;

/**
 * Returns the minor of a matrix at the given row and column.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix.
 * @param {number} row - The row for computing the minor.
 * @param {number} col - The column for computing the minor.
 * @return {matrix.Matrix} The minor.
 */
function minor(m, row, col)
{
    const s = exports.shape(m);
    const result = exports.mat(s.rows - 1, s.cols - 1);
    for (let r = 0; r < s.rows - 1; ++r)
    {
        for (let c = 0; c < s.cols - 1; ++c)
        {
            result[r][c] = m[r < row ? r : r + 1][c < col ? c : c + 1];
        }
    }
    return result;
}
exports.minor = minor;

/**
 * Returns the determinant of the given matrix. The determinant is only defined
 * for square matrices.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix.
 * @returns {number} The determinant.
 * @throws Throws an error if the matrix is not square.
 */
function det(m)
{
    const s = exports.shape(m);

    if (s.cols !== s.rows)
    {
        throw "Error: the determinant is only defined for square matrices";
    }

    if (s.rows === 2)
    {
        return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    }

    let result = 0;
    for (let i = 0; i < s.rows; ++i)
    {
        result += ((-1) ** i) * m[0][i] * exports.det(exports.minor(m, 0, i));
    }
    return result;
}
exports.det = det;

/**
 * Returns the inverse of the given matrix. Only square matrices with a
 * determinant != 0 have an inverse.
 *
 * @memberof matrix
 * 
 * @param {matrix.Matrix} m - The matrix.
 * @returns {matrix.Matrix} The inverse of the matrix.
 * @throws Throws an error if the matrix has no inverse.
 */
function inv(m)
{
    const mDet = exports.det(m);
    if (mDet === 0)
    {
        throw "Error: the matrix " + JSON.stringify(m) + " has no inverse";
    }

    const s = exports.shape(m);

    if (s.cols !== s.rows)
    {
        throw "Error: only square matrices may be inverted";
    }

    if (s.rows === 2)
    {
        return [
            [m[1][1] / mDet, -m[0][1] / mDet], 
            [-m[1][0] / mDet, m[0][0] / mDet]
        ];
    }

    let result = exports.mat(s.rows, s.cols);
    for (let r = 0; r < s.rows; ++r)
    {
        for (let c = 0; c < s.cols; ++c)
        {
            const minor = exports.minor(m, r, c);
            result[r][c] = ((-1) ** (r + c)) * exports.det(minor);
        }
    }
    result = exports.t(result);
    for (let r = 0; r < s.rows; ++r)
    {
        for (let c = 0; c < s.cols; ++c)
        {
            result[r][c] /= mDet;
        }
    }
    return result;
}
exports.inv = inv;

/**
 * Creates the identity matrix for the given dimension.
 * 
 * @memberof matrix
 * 
 * @param {number} dim - The dimension of the matrix.
 * @returns {matrix.Matrix} The identity matrix.
 */
function identityM(dim)
{
    const m = [];
    for (let r = 0; r < dim; ++r)
    {
        const mRow = [];
        m.push(mRow);
        for (let c = 0; c < dim; ++c)
        {
            mRow.push(r === c ? 1 : 0);
        }
    }
    return m;
}
exports.identityM = identityM;

/**
 * Creates the translation matrix for the given translation vector.
 * The dimension of the translation matrix is one higher than of the vector.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} vec - The translation vector.
 * @returns {matrix.Matrix} The translation matrix.
 */
function translationM(vec)
{
    const dim = exports.shape(vec).rows;

    const m = exports.identityM(dim + 1);
    for (let r = 0; r < dim; ++r)
    {
        m[r][dim] = vec[r][0];
    }
    return m;
}
exports.translationM = translationM;

/**
 * Creates the rotation matrix for rotating around two orthogonal vectors.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} u - The first vector.
 * @param {matrix.Matrix} v - The second vector.
 * @param {number} angle - The rotation angle in degrees.
 * @returns {matrix.Matrix} The rotation matrix.
 */
function rotationM(u, v, angle)
{
    const dim = exports.shape(u).rows;
    const rad = angle * DEG_TO_RAD;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    const ut = exports.t(u);
    const vt = exports.t(v);

    const a = exports.mul(
        exports.add(
            exports.mul(v, ut),
            exports.mul(exports.mul(u, vt), -1)
        ),
        s
    );

    const b = exports.mul(
        exports.add(
            exports.mul(u, ut),
            exports.mul(v, vt)
        ),
        c - 1.0
    );
  
    const m = exports.add(
        exports.identityM(dim),
        exports.add(
            a,
            b
        )
    );

    return m;
}
exports.rotationM = rotationM;

/**
 * Creates the scaling matrix for scaling by the given vector.
 * 
 * @memberof matrix
 *
 * @param {matrix.Matrix} vec - The scaling vector.
 * @return {matrix.Matrix} The scaling matrix.
 */
function scalingM(vec)
{
    const dim = exports.shape(vec).rows;
    const m = exports.identityM(dim);
    for (let r = 0; r < dim; ++r)
    {
        m[r][r] = vec[r][0];
    }
    return m;
}
exports.scalingM = scalingM;

/**
 * Creates the rotation matrix for rotating by a quaternion (a four-dimensional
 * complex number expressing a rotation in 3D space).
 * Quaternion-rotations do not induce a gimbal-lock.
 * 
 * @memberof matrix
 * 
 * @param {matrix.Matrix} u - The first vector.
 * @param {matrix.Matrix} v - The second vector.
 * @param {number} angle - The rotation angle in degrees.
 * @returns {matrix.Matrix} The rotation matrix.
 */
function rotationMByQuaternion(q)
{
    //console.log("rotation by quaternion: " + JSON.stringify(q));
    const qw = q[0];
    const qx = q[1];
    const qy = q[2];
    const qz = q[3];
    const qx2 = qx * qx;
    const qy2 = qy * qy;
    const qz2 = qz * qz;

    return [
        [1 - 2 * qy2 - 2 * qz2, 2 * qx * qy - 2 * qz * qw, 2 * qx * qz + 2 * qy * qw, 0],
        [2 * qx * qy + 2 * qz * qw, 1 - 2 * qx2 - 2 * qz2, 2 * qy * qz - 2 * qx * qw, 0],
        [2 * qx * qz - 2 * qy * qw, 2 * qy * qz + 2 * qx * qw, 1 - 2 * qx2 - 2 * qy2, 0],
        [0, 0, 0, 1]
    ];
}
exports.rotationMByQuaternion = rotationMByQuaternion;

/**
 * Creates a 3D to 2D perspective projection matrix.
 * 
 * @memberof matrix
 * 
 * @param {number} distance - The viewer's distance to the screen.
 * @returns {matrix.Matrix} The perspective projection matrix.
 */
function perspectiveM(distance)
{
    return [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, (distance > 0 ? -1.0 / distance : 0)],
        [0, 0, 0, 1]
    ];
}
exports.perspectiveM = perspectiveM;
