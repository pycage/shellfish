const webfont = require("webfont");
const fs = require("fs");

const items = [
    { name: "core", target: "shellfish-ui/style" },

    { name: "camera", target: "dist/icons" },
    { name: "comm", target: "dist/icons" },
    { name: "emote", target: "dist/icons" },
    { name: "fs", target: "dist/icons" },
    { name: "input", target: "dist/icons" },
    { name: "map", target: "dist/icons" },
    { name: "media", target: "dist/icons" },
    { name: "text", target: "dist/icons" },
    { name: "ui", target: "dist/icons" }
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
