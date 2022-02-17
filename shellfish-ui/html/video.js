/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 Martin Grimme <martin.grimme@gmail.com>

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

shRequire(["shellfish/low", __dirname + "/item.js"], (low, item) =>
{
    const d = new WeakMap();

    /**
     * Class representing a video player component.
     * 
     * @memberof mid
     * @extends html.Item
     * 
     * @property {number} currentTime - The current time position in seconds.
     * @property {number} duration - [readonly] The duration of the video in seconds.
     * @property {string} fitMode - (default: `"contain"`) The mode for fitting the original image into this element. One of: `fill|contain|cover|scale-down|none`
     * @property {number} originalWidth - [readonly] The original width of the image.
     * @property {number} originalHeight - [readonly] The original height of the image.
     * @property {bool} playing - [readonly] Whether the video is currently playing.
     * @property {string} source - The video source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     */
    class Video extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                source: "",
                status: "empty",
                playing: false,
                fitMode: "contain",
                duration: 0,
                seekTime: 0,
                item: low.createElementTree(
                    low.tag("video")
                    .style("position", "relative")
                    .style("display", "block")
                    .style("object-fit", "contain")
                    .attr("autoplay", "true")
                    .html()
                )
            });

            this.notifyable("currentTime");
            this.notifyable("duration");
            this.notifyable("fitMode");
            this.notifyable("originalWidth");
            this.notifyable("originalHeight");
            this.notifyable("playing");
            this.notifyable("source");
            this.notifyable("status");

            this.registerEvent("finish");

            const item = d.get(this).item;
            item.removeAttribute("controls");
        
            this.addHtmlEventListener(item, "loadedmetadata", () =>
            {
                this.originalWidthChanged();
                this.originalHeightChanged();
                d.get(this).status = "success";
                this.statusChanged();
            });

            this.addHtmlEventListener(item, "durationchange", () =>
            {
                this.durationChanged();
            });

            this.addHtmlEventListener(item, "timeupdate", () =>
            {
                this.currentTimeChanged();
            });

            this.addHtmlEventListener(item, "pause", () =>
            {
                d.get(this).playing = false;
                this.playingChanged();
                this.statusChanged();
            });

            this.addHtmlEventListener(item, "play", () =>
            {
                d.get(this).playing = true;
                this.playingChanged();
                this.statusChanged();
            });

            this.addHtmlEventListener(item, "waiting", () =>
            {

            });

            this.addHtmlEventListener(item, "ended", () =>
            {
                this.finish();
            });

            this.addHtmlEventListener(item, "stalled", () =>
            {

            });

            this.addHtmlEventListener(item, "durationchange", () =>
            {
                this.durationChanged();
            });



            this.addHtmlEventListener(item, "progress", () =>
            {

            });
        }

        get playing() { return d.get(this).playing; }

        get status() { return d.get(this).status; }

        get fitMode() { return d.get(this).fitMode; }
        set fitMode(m)
        {
            d.get(this).fitMode = m;
            low.css(d.get(this).item, "object-fit", m);
            this.fitModeChanged();
        }

        get source() { return d.get(this).source; }
        set source(s)
        {
            const priv = d.get(this);
            priv.status = "loading";
            this.statusChanged();

            priv.source = s;
            priv.item.setAttribute("src", shRequire.resource(s));
            this.sourceChanged();
        }

        get originalWidth() { return d.get(this).item.videoWidth || 0; }
        get originalHeight() { return d.get(this).item.videoHeight || 0; }

        get currentTime()
        {
            if (d.get(this).item.seeking)
            {
                return d.get(this).seekTime;
            }
            else
            {
                return d.get(this).item.currentTime || 0;
            }
        }
        set currentTime(secs)
        {
            d.get(this).seekTime = secs;
            d.get(this).item.currentTime = secs;
            this.currentTimeChanged();
        }

        get duration() { return d.get(this).item.duration || 0; }

        /**
         * Starts playing the video.
         */
        play()
        {
            d.get(this).item.play();
        }

        /**
         * Pauses playing the video.
         */
        pause()
        {
            d.get(this).item.pause();
        }

        get()
        {
            return d.get(this).item;
        }
    }
    exports.Video = Video;

});