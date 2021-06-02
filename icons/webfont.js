const webfont = require("webfont");
const fs = require("fs");

console.log("Creating icon font...");
webfont.webfont({
    files: "icons/core/*.svg",
    fontName: "core",
    template: "icons/fontmap.template",
    formats: "woff2"
})
.then(result =>
{
    const fontData = Buffer.from(result.woff2, "binary").toString("base64");
    fs.writeFileSync("lib/style/core-icons.css", result.template.replace("FONT_DATA_GOES_HERE", fontData));
    console.log("Created font map: core-icons.css");
});
