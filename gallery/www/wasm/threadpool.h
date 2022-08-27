#pragma once

#include "boost/asio.hpp"
#include "boost/thread.hpp"

/* A simple thread pool implementation with boost::asio.
 */
class Threadpool
{
public:
    Threadpool(size_t n)
        : m_pool()
        , m_service(n)
        , m_work(m_service)
    {
        for (size_t i = 0; i < n; ++i)
        {
            addThread();
        }
    }

    ~Threadpool()
    {
        m_service.stop();
        m_pool.join_all();
    }

    template <typename T>
    void schedule(T task)
    {
        m_service.post(std::move(task));
    }

private:
    void addThread()
    {
        m_pool.create_thread([this] () { this->startThread(); });
    }

    void startThread()
    {
        try
        {
            m_service.run();
        }
        catch (...)
        {
            // thread aborted with exception
        }
    }

private:
    boost::thread_group m_pool;
    boost::asio::io_service m_service;
    boost::asio::io_service::work m_work;
};