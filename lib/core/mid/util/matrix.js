/*******************************************************************************
This file is part of Shellfish.
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
 * **Module ID:** `shellfish/matrix`
 * 
 * This module provides the Shellfish matrix toolbox.
 * 
 * @module matrix
 */

exports.__id = "shellfish/matrix";

const DEG_TO_RAD = Math.PI / 180;

exports.PLUS = (a, b) => a + b;
exports.MINUS = (a, b) => a - b;
exports.MULTIPLY = (a, b) => a * b;

/**
 * Returns the shape as `{ rows, cols }` of the given matrix.
 * 
 * @param {matrix} m - The matrix.
 * @returns {object} - The object describing the shape.
 */
exports.shape = function(m)
{
    const rows = m.length;
    const cols = m[0].length;
    return { rows, cols };
};

/**
 * Performs an element-wise operation with a scalar on a matrix.
 * 
 * @param {matrix} m - The matrix.
 * @param {number} n - The scalar.
 * @param {function} op - The element-wise operator.
 * @return {matrix} The resulting matrix.
 */
exports.elementWise = function (m, n, op)
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
};

/**
 * Creates a column-vector of the given values.
 * 
 * @param {...number} values - The values.
 * @returns {matrix} The vector (a (n x 1) matrix).
 */
exports.vec = function (...values)
{
    return values.map(a => [a]);
};

/**
 * Creates a null matrix with the given dimensions.
 * 
 * @param {number} rows - The amount of rows.
 * @param {number} cols - The amount of columns.
 * @return {matrix} The matrix.
 */
exports.mat = function (rows, cols)
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
};

/**
 * Creates a matrix from an array, given in row-major order.
 * 
 * @param {number[]} arr - The array of values in row-major order.
 * @param {number} cols - The amount of columns.
 */
exports.fromArray = function (arr, cols)
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
};

/**
 * Produces a flat representation of a matrix in row-major order.
 * 
 * @param {matrix} m - The matrix to flatten.
 * @returns {number[]} The flat representation.
 */
exports.flat = function(m)
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
};

/**
 * Returns the length of the given column-vector.
 * 
 * @param {matrix} v - The vector.
 * @returns {number} The length of the vector.
 */
exports.length = function (v)
{
    const s = exports.shape(v);
    if (s.cols !== 1)
    {
        throw "Error: length is only defined for vectors";
    }

    return Math.sqrt(v.reduce((a, b) => a + b[0] * b[0], 0.0));
};

/**
 * Returns the transpose of the given matrix. Transposing a column-vector
 * creates a row-vector and vice versa.
 * 
 * @param {matrix} m - The matrix to transpose.
 * @returns {matrix} The transpose of the matrix.
 */
exports.t = function (m)
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
};

/**
 * Returns the result of the addition of two matrices or of a matrix with a scalar.
 * 
 * @param {matrix} a - The matrix.
 * @param {matrix|number} b - A matrix or a scalar.
 * @return {matrix} The resulting matrix.
 */
exports.add = function (a, b)
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
};

/**
 * Returns the result of the subtraction of two matrices or of a matrix with a scalar.
 * 
 * @param {matrix} a - The matrix.
 * @param {matrix|number} b - A matrix or a scalar.
 * @return {matrix} The resulting matrix.
 */
exports.sub = function (a, b)
{
    return exports.add(a, exports.mul(b, -1));
};

/**
 * Returns the dot product of two column-vectors. Both vectors must have the
 * same dimensions.
 * 
 * @param {matrix} u - The first vector.
 * @param {matrix} v - The second vector.
 * @return {number} The dot product.
 */
exports.dot = function (u, v)
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
};

/**
 * Returns the result of the mulitplication of two matrices, or of a matrix with
 * a scalar.
 * 
 * @param {matrix} a - The first matrix.
 * @param {matrix|number} b - The second matrix or a scalar.
 * @returns {matrix} The resulting matrix.
 */
exports.mul = function (a, b)
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
};

/**
 * Returns the minor of a matrix at the given row and column.
 * 
 * @param {matrix} m - The matrix.
 * @param {number} row - The row for computing the minor.
 * @param {number} col - The column for computing the minor.
 * @return {matrix} The minor.
 */
exports.minor = function (m, row, col)
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
};

/**
 * Returns the determinant of the given matrix. The determinant is only defined
 * for square matrices.
 * 
 * @param {matrix} m - The matrix.
 * @returns {number} The determinant.
 */
exports.det = function (m)
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
};

/**
 * Returns the inverse of the given matrix. Only square matrices with a
 * determinant != 0 have an inverse.
 *
 * @param {matrix} m - The matrix.
 * @returns {matrix} The inverse of the matrix.
 */
exports.inv = function (m)
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
};

/**
 * Creates the identity matrix for the given dimension.
 * 
 * @param {number} dim - The dimension of the matrix.
 * @returns {matrix} The identity matrix.
 */
exports.identityM = function(dim)
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
};

/**
 * Creates the translation matrix for the given translation vector.
 * The dimension of the translation matrix is one higher than of the vector.
 * 
 * @param {matrix} vec - The translation vector.
 * @returns {matrix} The translation matrix.
 */
exports.translationM = function (vec)
{
    const dim = exports.shape(vec).rows;

    const m = exports.identityM(dim + 1);
    for (let r = 0; r < dim; ++r)
    {
        m[r][dim] = vec[r][0];
    }
    return m;
};

/**
 * Creates the rotation matrix for rotating around two orthogonal vectors.
 * 
 * @param {matrix} u - The first vector.
 * @param {matrix} v - The second vector.
 * @param {number} angle - The rotation angle in degrees.
 * @returns {matrix} The rotation matrix.
 * 
 */
exports.rotationM = function (u, v, angle)
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
};

/**
 * Creates the scaling matrix for scaling by the given vector.
 *
 * @param {matrix} vec - The scaling vector.
 * @return {matrix} The scaling matrix.
 */
exports.scalingM = function (vec)
{
    const dim = exports.shape(vec).rows;
    const m = exports.identityM(dim);
    for (let r = 0; r < dim; ++r)
    {
        m[r][r] = vec[r][0];
    }
    return m;
};

exports.rotationMByQuaternion = function (q)
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
};