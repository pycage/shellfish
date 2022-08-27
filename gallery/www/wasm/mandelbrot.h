#pragma once

#include <emscripten/bind.h>
#include <future>
#include <list>
#include <memory>
#include <utility>
#include <vector>

class Threadpool;

/* A parallelized Mandelbrot set renderer.
 */
class Mandelbrot
{
public:
    struct Region
    {
        int x;
        int y;
        int width;
        int height;
        double offsetX;
        double offsetY;
    };

    Mandelbrot();

    void reset();
    void computeRegionAsync(int width, int height, Region region, double zoom, emscripten::val callback);
    void computeRegion(int width, int height, Region region, double zoom, emscripten::val callback);
    void checkResults();

private:
    void registerResult(std::future<std::vector<uint8_t>> future, emscripten::val callback);

private:
    std::shared_ptr<Threadpool> m_pool;
    std::list<std::pair<std::future<std::vector<uint8_t>>, emscripten::val>> m_results;
};
