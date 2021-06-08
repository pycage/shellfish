const webfont = require("webfont");
const fs = require("fs");

const items = [
    { name: "core", target: "lib/style" },
    { name: "emote", target: "build/icons" },
    { name: "fs", target: "build/icons" },
    { name: "map", target: "build/icons" },
    { name: "text", target: "build/icons" },
    { name: "ui", target: "build/icons" }
];

async function makeIconSet(name, target)
{
    const result = await webfont.webfont({
        files: "icons/" + name + "/*.svg",
        fontName: name,
        template: "icons/fontmap.template",
        formats: "woff2"
    });
    const fontData = Buffer.from(result.woff2, "binary").toString("base64");
    fs.writeFileSync(target + "/" + name + "-icons.css", result.template.replace("FONT_DATA_GOES_HERE", fontData));
    console.log(" - " + target + "/" + name + "-icons.css");
}

async function run()
{
    for (let i = 0; i < items.length; ++i)
    {
        await makeIconSet(items[i].name, items[i].target);
    }
}

console.log("Creating icon maps...");
run()
.then(() =>
{
    console.log("Finished.");
});
