#pragma once

#include "mandelbrot.h"
#include <emscripten/bind.h>

/* Bindings for communication between C++ and JS.
 */
EMSCRIPTEN_BINDINGS(mandelbrot)
{
    emscripten::class_<Mandelbrot>("Mandelbrot")
    .constructor()
    .function("reset", &Mandelbrot::reset)
    .function("computeRegionAsync", &Mandelbrot::computeRegionAsync)
    .function("computeRegion", &Mandelbrot::computeRegion)
    .function("checkResults", &Mandelbrot::checkResults)
    ;

    emscripten::value_object<Mandelbrot::Region>("Region")
    .field("x", &Mandelbrot::Region::x)
    .field("y", &Mandelbrot::Region::y)
    .field("width", &Mandelbrot::Region::width)
    .field("height", &Mandelbrot::Region::height)
    .field("offsetX", &Mandelbrot::Region::offsetX)
    .field("offsetY", &Mandelbrot::Region::offsetY)
    ;

    emscripten::register_vector<int>("vector<int>");
}
