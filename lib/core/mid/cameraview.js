/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2019 - 2020 Martin Grimme <martin.grimme@gmail.com>

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

shRequire([__dirname + "/../low.js", __dirname + "/item.js"], function (low, item)
{
    // resolutions from best to worst
    const RESOLUTIONS = [
        ["4K", 3840, 2160],
        ["1080p", 1920, 1080],
        ["720p", 1280, 720],
        ["SVGA", 800, 600],
        ["VGA", 640, 480],
        ["CIF", 352, 288],
        ["QVGA", 320, 240],
        ["QQVGA", 160, 120]
    ];

    // default devices
    const DEFAULT_DEVICES = [
        { label: "Default Camera", deviceId: "user" }
    ];

    const d = new WeakMap();

    /**
     * Class representing a camera view finder.
     * 
     * Note that camera access is usually only available for HTTPS connections.
     * 
     * @extends mid.Item
     * @memberof mid
     * 
     * @property {bool} active - (default: `false`) Toggles between active and inactive states.
     * @property {object[]} devices - [readonly] The available camera devices. Fingerprinting protection in browsers might block listing the particular devices.
     * @property {string} deviceId - (default: `"user"`) Forces the use of a certain camera device. One of `devices` or `"user"` or `"environment"`. 
     * @property {object} image - [readonly] The camera image for rendering on a canvas.
     * @property {string} maxResolution - (default: `720p`) The name of the maximum resolution.
     * @property {number} originalHeight - [readonly] The original height of the camera image.
     * @property {number} originalWidth - [readonly] The original width of the camera image.
     * @property {string[]} resolutions - [readonly] A set of resolution modes.
     * @property {string} status - [readonly] The current status. One of: `inactive|active|pending|error`
     */
    exports.CameraView = class CameraView extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                devices: DEFAULT_DEVICES.slice(),
                deviceId: "user",
                maxResolution: "720p",
                active: false,
                status: "inactive",  // inactive | active | pending | error
                item: low.createElementTree(
                    low.tag("video")
                    .html()
                )
            });

            this.notifyable("devices");
            this.notifyable("deviceId");
            this.notifyable("maxResolution");
            this.notifyable("active");
            this.notifyable("status");
            this.notifyable("originalWidth");
            this.notifyable("originalHeight");

            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
            {
                const enumerate = () =>
                {
                    console.log("enumerate camera devices");
                    navigator.mediaDevices.enumerateDevices()
                    .then((devs) =>
                    {
                        if (! devs)
                        {
                            console.warn("The browser may have refused to enumerate the camera devices.");
                            return;
                        }

                        const devices = DEFAULT_DEVICES.slice();
                        let n = 1;
                        devs.forEach((dev) =>
                        {
                            if (dev.kind === "videoinput")
                            {
                                devices.push({
                                    deviceId: dev.deviceId,
                                    label: dev.label !== "" ? dev.label : "Camera " + n
                                });
                                ++n;
                            }
                        });
                        console.log(JSON.stringify(devices));
                        d.get(this).devices = devices;
                        this.devicesChanged();
                    });
                };

                const item = d.get(this).item;
                item.addEventListener("loadedmetadata", (ev) =>
                {
                    this.originalWidthChanged();
                    this.originalHeightChanged();
                });

                item.addEventListener("playing", () =>
                {
                    d.get(this).status = "active";
                    this.statusChanged();
                });

                item.addEventListener("error", () =>
                {
                    d.get(this).status = "error";
                    this.statusChanged();
                });
                
                navigator.mediaDevices.addEventListener("devicechange", (ev) =>
                {
                    enumerate();
                }, false);

                this.onStatusChanged = () =>
                {
                    if (d.get(this).status === "active")
                    {
                        // the label is now available
                        enumerate();
                    }
                };

                enumerate();
            }

            this.onDestruction = () =>
            {
                if (d.get(this).status === "active")
                {
                    this.stop();
                }
            };
        }

        get originalWidth() { return d.get(this).item.videoWidth; }
        get originalHeight() { return d.get(this).item.videoHeight; }

        get devices() { return d.get(this).devices; }
        get resolutions() { return RESOLUTIONS.map(r => r[0]); }

        get deviceId() { return d.get(this).deviceId; }
        set deviceId(deviceId)
        {
            const prevDevId = d.get(this).deviceId;
            d.get(this).deviceId = deviceId;
            this.deviceIdChanged();

            console.log("set deviceId = " + deviceId);

            if (d.get(this).status === "active" && deviceId !== prevDevId)
            {
                this.active = false;
                this.active = true;
            }
        }

        get maxResolution() { return d.get(this).maxResolution; }
        set maxResolution(res)
        {
            const prevRes = d.get(this).maxResolution;
            d.get(this).maxResolution = res;
            this.maxResolutionChanged();

            if (d.get(this).status === "active" && res !== prevRes)
            {
                this.active = false;
                this.active = true;
            }
        }

        get active() { return d.get(this).active; }
        set active(value)
        {
            if ((d.get(this).status === "inactive" ||
                 d.get(this).status === "error")
                && value)
            {
                this.start((ok) =>
                {
                });    
            }
            else if (d.get(this).status === "active")
            {
                this.stop();
            }

        }

        get status() { return d.get(this).status; }

        get image() { return d.get(this).item; }

        start(callback)
        {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
            {
                const resolutions = RESOLUTIONS.slice();

                // drop resolutions beyond the desired maximum
                while (resolutions.length > 0 &&
                       resolutions[0][0] !== d.get(this).maxResolution)
                {
                    resolutions.shift();
                }

                const tryNextResolution = () =>
                {
                    if (resolutions.length === 0)
                    {
                        // failed to find a working resolution
                        d.get(this).status = "error";
                        this.statusChanged();
    
                        callback(false);
                        return;
                    }

                    const res = resolutions.shift();
                    const constraints = { video: { } };
                    constraints.video.width = { ideal: res[1] };
                    constraints.video.height = { ideal: res[2] };

                    switch (d.get(this).deviceId)
                    {
                    case "user":
                        constraints.video.facingMode = "user";
                        break;
                    case "environment":
                        constraints.video.facingMode = "environment";
                        break;
                    default:
                        constraints.video.deviceId = { exact: d.get(this).deviceId };
                        break;
                    }
                    
                    console.log(JSON.stringify(constraints));
                    navigator.mediaDevices.getUserMedia(constraints)
                    .then((stream) =>
                    {
                        // found a valid resolution
                        const video = d.get(this).item;
                        video.srcObject = stream;
                        video.play();
    
                        d.get(this).active = true;
                        this.activeChanged();
    
                        callback(true);
                    })
                    .catch((err) =>
                    {
                        console.error("Failed to request resolution: " + JSON.stringify(res));
                        console.error(err);
                        tryNextResolution();
                    });
                };

                d.get(this).status = "pending";
                this.statusChanged();
                tryNextResolution();
            }
            else
            {
                d.get(this).status = "error";
                this.statusChanged();

                callback(false);
            }
        }

        stop()
        {
            const video = d.get(this).item;
            const stream = video.srcObject;

            const tracks = stream.getTracks();
            for (let i = 0; i < tracks.length; ++i)
            {
              tracks[i].stop();
            }
          
            video.srcObject = null;

            this.originalWidthChanged();
            this.originalHeightChanged();

            d.get(this).status = "inactive";
            this.statusChanged();

            d.get(this).active = false;
            this.activeChanged();
        }

        get()
        {
            return d.get(this).item;
        }
    };

});