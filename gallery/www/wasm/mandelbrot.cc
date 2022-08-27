#include "mandelbrot.h"
#include "threadpool.h"

#include <atomic>
#include <future>
#include <iostream>

namespace
{
    std::atomic<int> computationContext(0);

    struct Complex
    {
        double real = 0.0;
        double imaginary = 0.0;
    };

    /* Converts the Mandelbrot set vector to a RGBA JavaScript Uint8Array for
     * rendering on a canvas.
     */
    emscripten::val toImageBuffer(std::vector<uint8_t> in, std::vector<uint8_t>& imgBuffer)
    {
        for (size_t i = 0; i < in.size(); ++i)
        {
            imgBuffer[i * 4] = in[i];
            imgBuffer[i * 4 + 1] = in[i] * 0.7;
            imgBuffer[i * 4 + 2] = 0;
            imgBuffer[i * 4 + 3] = 255;
        }

        emscripten::val heap = emscripten::val::module_property("HEAPU8");
        emscripten::val buffer = heap["buffer"];
        return emscripten::val::global("Uint8Array").new_(buffer, reinterpret_cast<uint32_t>(imgBuffer.data()), imgBuffer.size());
    }

    /* Computes a region of the Mandelbrot set.
     */
    std::vector<uint8_t> computeRegion(int ctx, int width, int height, Mandelbrot::Region region, double zoom)
    {
        Complex p;
        Complex nextP;
        Complex prevP;

        std::vector<uint8_t> data(region.width * region.height);

        for (int x = 0; x < region.width; ++x)
        {
            if (computationContext != ctx)
            {
                // abort task
                break;
            }

            for (int y = 0; y < region.height; ++y)
            {
                p = {
                    -1.5 + region.offsetX + 2.0 * (region.x + x) / (zoom * width),
                    -1.0 + region.offsetY + 2.0 * (region.y + y) / (zoom * height)
                };

                nextP = { 0, 0 };

                int i = 0;
                for (; i < 255; ++i)
                {
                    prevP = nextP;
                    nextP = {
                        prevP.real * prevP.real - prevP.imaginary * prevP.imaginary + p.real,
                        2 * prevP.real * prevP.imaginary + p.imaginary
                    };
                    if (nextP.real * nextP.real + nextP.imaginary * nextP.imaginary > 4)
                    {
                        break;
                    }
                }
                data[(y * region.width + x)] = static_cast<uint8_t>(i);
            }
        }

        return data;
    }
}

Mandelbrot::Mandelbrot()
    : m_pool(new Threadpool(8))
{

}

void Mandelbrot::reset()
{
    std::cout << "reset computations" << std::endl;
    m_results.clear();
    ++computationContext;
}

void Mandelbrot::computeRegionAsync(int width, int height, Region region, double zoom, emscripten::val callback)
{
    auto promise = std::make_shared<std::promise<std::vector<uint8_t>>>();
    std::future<std::vector<uint8_t>> fu = promise->get_future();

    m_pool->schedule([promise, width, height, region = std::move(region), zoom] () mutable
    {
        auto data = ::computeRegion(computationContext, width, height, region, zoom);
        promise->set_value(data);
    });

    registerResult(std::move(fu), std::move(callback));
}

void Mandelbrot::computeRegion(int width, int height, Region region, double zoom, emscripten::val callback)
{
    callback(::computeRegion(computationContext, width, height, region, zoom));
}

void Mandelbrot::registerResult(std::future<std::vector<uint8_t>> future, emscripten::val callback)
{
    m_results.push_back(std::make_pair(std::move(future), std::move(callback)));
}

void Mandelbrot::checkResults()
{
    while (m_results.size() > 0)
    {
        bool aborted = false;
        for (auto iter = m_results.begin(); iter != m_results.end(); ++iter)
        {
            auto& fu = iter->first;
            auto status = fu.wait_for(std::chrono::seconds(0));
            if (status == std::future_status::ready)
            {
                auto data = fu.get();
                // keep buffer alive until rendered
                std::vector<uint8_t> buffer(data.size() * 4);
                auto imgBuffer = ::toImageBuffer(data, buffer);
                // render
                iter->second(imgBuffer);

                m_results.erase(iter);
                aborted = true;
                break;
            }
        }
        if (aborted)
        {
            break;
        }
        else
        {
            break;
        }
    }
}
