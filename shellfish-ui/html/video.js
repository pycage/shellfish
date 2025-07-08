/*******************************************************************************
This file is part of the Shellfish UI toolkit.
Copyright (c) 2021 - 2025 Martin Grimme <martin.grimme@gmail.com>

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
     * Subtitles in VTT format may be loaded from an external source and are
     * emitted via the `cues` property.
     * 
     * @memberof html
     * @extends html.Item
     * 
     * @property {string[]} cues - [readonly] The current set of subtitle cues.
     * @property {number} currentTime - The current time position in seconds.
     * @property {number} duration - [readonly] The duration of the video in seconds.
     * @property {string} fitMode - (default: `"contain"`) The mode for fitting the original image into this element. One of: `fill|contain|cover|scale-down|none`
     * @property {number} originalWidth - [readonly] The original width of the image.
     * @property {number} originalHeight - [readonly] The original height of the image.
     * @property {bool} playing - [readonly] Whether the video is currently playing.
     * @property {string} source - (default: `""`) The video source URL.
     * @property {string} status - [readonly] The current status. One of: `empty|loading|error|success`
     * @property {string} subtitles - (default: `""`) The subtitles source URL. Subtitles must be in VTT format.
     * @property {number} volume - (default: `1.0`) The current audio volume as a value between `0.0` and `1.0`.
     */
    class Video extends item.Item
    {
        constructor()
        {
            super();
            d.set(this, {
                source: "",
                subtitles: "",
                cues: [],
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
                    .attr("disablepictureinpicture", "true")
                    .attr("disableremoteplayback", "true")
                    .attr("x-webkit-airplay", "deny")
                    .attr("controlslist", "nodownload nofullscreen noremoteplayback")
                    .attr("pointer-events", "none")
                    .content(
                        low.tag("track")
                        .attr("kind", "subtitles")
                    )
                    .html()
                )
            });

            this.notifyable("cues");
            this.notifyable("currentTime");
            this.notifyable("duration");
            this.notifyable("fitMode");
            this.notifyable("originalWidth");
            this.notifyable("originalHeight");
            this.notifyable("playing");
            this.notifyable("source");
            this.notifyable("subtitles");
            this.notifyable("status");
            this.notifyable("volume");

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

            this.addHtmlEventListener(item.childNodes[0], "cuechange", () =>
            {
                const track = d.get(this).item.childNodes[0].track;
                const cues = track.activeCues;
                const texts = [];
                // limit amount of cues in order to avoid exploding on bad subtitle files
                for (let i = 0; i < Math.min(5, cues.length); ++i)
                {
                    texts.push(cues[i].text);
                }
                d.get(this).cues = texts;
                this.cuesChanged();
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

        get subtitles() { return d.get(this).subtitles; }
        set subtitles(s)
        {
            d.get(this).subtitles = s;

            const item = d.get(this).item;
            const subtitlesItem = item.childNodes[0];
            subtitlesItem.src = s;
            subtitlesItem.default = true;

            this.subtitlesChanged();
        }

        get cues() { return d.get(this).cues; }

        get originalWidth() { return d.get(this).item.videoWidth || 0; }
        get originalHeight() { return d.get(this).item.videoHeight || 0; }

        get volume() { return d.get(this).item.volume; }
        set volume(v)
        {
            d.get(this).item.muted = (v === 0);
            d.get(this).item.volume = v;
            this.volumeChanged();
        }

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