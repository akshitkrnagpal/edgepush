import { Resvg } from "@resvg/resvg-js";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.join(__dirname, "JetBrainsMono-ExtraBold.ttf");

const W = 1200;
const H = 630;
const TYPE_PX = 184;
const DOT_R = 36;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#000000"/>
  <text x="${W / 2 - 70}" y="${H / 2 + TYPE_PX * 0.32}" text-anchor="end"
        font-family="JetBrains Mono" font-weight="800" font-size="${TYPE_PX}"
        letter-spacing="-8.28" fill="#F5F3EE">edge</text>
  <circle cx="${W / 2}" cy="${H / 2 - TYPE_PX * 0.05}" r="${DOT_R}" fill="#FF6B1A"/>
  <text x="${W / 2 + 70}" y="${H / 2 + TYPE_PX * 0.32}" text-anchor="start"
        font-family="JetBrains Mono" font-weight="800" font-size="${TYPE_PX}"
        letter-spacing="-8.28" fill="#F5F3EE">push</text>
  <text x="${W / 2}" y="${H / 2 + 170}" text-anchor="middle"
        font-family="JetBrains Mono" font-weight="500" font-size="26"
        letter-spacing="2" fill="#9a9a9a">OPEN SOURCE PUSH NOTIFICATIONS · CLOUDFLARE WORKERS</text>
</svg>`;

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: W },
  font: {
    fontFiles: [FONT],
    defaultFontFamily: "JetBrains Mono",
    loadSystemFonts: false,
    serifFamily: "JetBrains Mono",
    sansSerifFamily: "JetBrains Mono",
    monospaceFamily: "JetBrains Mono",
  },
});
const png = resvg.render().asPng();
writeFileSync("og.png", png);
console.log(`wrote og.png ${png.length}b`);
