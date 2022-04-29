/*******************************************************************************
This file is part of the Shellfish UI toolkit examples.
Copyright (c) 2018 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

exports.fib = function(n)
{
    function makeMemoizingFib()
    {
        const memory = { };

        function doFib(n)
        {
            if (n <= 2)
            {
                return 1;
            }
            else
            {
                memory[n - 2] = memory[n - 2] || doFib(n - 2);
                memory[n - 1] = memory[n - 1] || doFib(n - 1);
                return memory[n - 2] + memory[n - 1];
            }
        }

        return doFib;
    }

    return makeMemoizingFib()(n);
};
