/*******************************************************************************
This file is part of the Shellfish UI toolkit.
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

shRequire(["shellfish/low", "shellfish/core"], (low, core) =>
{
    const d = new WeakMap();

    /**
     * Class representing a WebSocket for bi-directional communication.
     * 
     * @memberof html
     * @extends core.Object
     */    
    class WebSocket extends core.Object
    {
        constructor()
        {
            super();
            d.set(this, {
                autoConnect: false,
                status: "closed",
                socket: null,
                binaryType: "arraybuffer",
                protocol: "",
                supportedProtocols: [],
                url: "",
                monitored: false
            });

            this.notifyable("autoConnect");
            this.notifyable("binaryType");
            this.notifyable("bufferedAmount");
            this.notifyable("protocol");
            this.notifyable("status");
            this.notifyable("supportedProtocols");
            this.notifyable("url");

            this.registerEvent("message");
            this.registerEvent("error");

            this.onInitialization = () =>
            {
                if (d.get(this).autoConnect)
                {
                    this.connectSocket();
                }
            }

            this.onDestruction = () =>
            {
                this.close();
            };
        }

        get autoConnect() { return d.get(this).autoConnect; }
        set autoConnect(value)
        {
            d.get(this).autoConnect = value;
            this.autoConnectChanged();
         
            if (! value && d.get(this).status === "connected")
            {
                this.close();
            }
        }

        get binaryType() { return d.get(this).binaryType; }
        set binaryType(t)
        {
            const priv = d.get(this);
            if (priv.socket)
            {
                priv.socket.binaryType = t;
            }
            priv.binaryType = t;
            this.binaryTypeChanged();
        }

        get bufferedAmount()
        {
            const priv = d.get(this);
            if (priv.socket)
            {
                return priv.socket.bufferedAmount
            }
            else{
                return 0;
            }
        }

        get status() { return d.get(this).status; }

        get url() { return d.get(this).url; }
        set url(u)
        {
            d.get(this).url = u;
            this.urlChanged();
        }

        get protocol() { return d.get(this).protocol; }

        get supportedProtocols() { return d.get(this).supportedProtocols; }
        set supportedProtocols(ps)
        {
            d.get(this).supportedProtocols = ps;
            this.supportedProtocolsChanged();
        }

        connectSocket()
        {
            const priv = d.get(this);
            priv.status = "connecting";
            this.statusChanged();
            try
            {
                priv.socket = new window.WebSocket(priv.url, priv.supportedProtocols);
                priv.socket.binaryType = priv.binaryType;
                priv.socket.onopen = () =>
                {
                    priv.protocol = priv.socket.protocol;
                    this.protocolChanged();
                    priv.status = "connected";
                    this.statusChanged();
                };
                priv.socket.onclose = (ev) =>
                {
                    this.log("", "debug", "WebSocket closed with code " + ev.code + " " + ev.reason);
                    priv.protocol = "";
                    this.protocolChanged();
                    priv.status = "closed";
                    this.statusChanged();

                    if (ev.code !== 1000)
                    {
                        // unnormal closure
                        this.error("Connection closed with code " + ev.code + " " + ev.reason);
                    }
                };
                priv.socket.onmessage = (ev) =>
                {
                    this.message(ev);
                };
                priv.socket.onerror = (ev) =>
                {
                    this.error("Socket Error");
                };
            }
            catch (err)
            {
                console.error(err);
                priv.socket = null;
                priv.status = "error";
                this.statusChanged();
            }
        }

        close()
        {
            const priv = d.get(this);

            priv.status = "closed";
            this.statusChanged();

            if (priv.socket)
            {
                priv.socket.close(1000, "Normal Closure");
                priv.socket = null;
            }
        }

        send(data)
        {
            const priv = d.get(this);
            if (priv.socket)
            {
                priv.socket.send(data);

                // setup a frame handler to monitor the buffer size until
                // depleted or the socket was closed
                if (! priv.monitored)
                {
                    priv.monitored = true;
                    const handle = low.addFrameHandler(() =>
                    {
                        if (priv.socket)
                        {
                            const ba = priv.socket.bufferedAmount;
                            this.bufferedAmountChanged();
                            if (ba === 0)
                            {
                                handle.cancel();
                                priv.monitored = false;
                            }
                        }
                        else
                        {
                            handle.cancel();
                            priv.monitored = false;
                        }
                    }, this.objectType + "@" + this.objectLocation);
                }
            }
        }
    }
    exports.WebSocket = WebSocket;

});