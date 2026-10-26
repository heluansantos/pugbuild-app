// Renders the app icon, splash and favicon from the brand mark. Uses sharp from the web app's node_modules.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const webModules = path.resolve(process.cwd(), "../pugbuild-web/node_modules/.pnpm");
const sharpDir = readdirSync(webModules).find((d) => d.startsWith("sharp@"));
if (!sharpDir) throw new Error("sharp not found in ../pugbuild-web/node_modules");
const sharp = require(path.join(webModules, sharpDir, "node_modules/sharp"));
const paths = await import(path.resolve(process.cwd(), "scripts/pug-mark-paths.mjs"));

const { PUG_SILHOUETTE_PATH, PUG_HAT_PATH, PUG_INK_PATH, PUG_ANCHOR_Y, PUG_SCALE } = paths;
const INK = "#141414", BG = "#F4F3EF", ACCENT = "#FFC83D";

function mark({ bg, body, ink, frame = true }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ""}
  ${frame ? `<rect x="206" y="206" width="612" height="612" rx="88" fill="none" stroke="${ACCENT}" stroke-width="24"/>` : ""}
  <g transform="translate(512,${PUG_ANCHOR_Y}) scale(${PUG_SCALE}) translate(-512,-${PUG_ANCHOR_Y})">
    <path fill="${body}" d="${PUG_SILHOUETTE_PATH}"/>
    <path fill-rule="evenodd" fill="${ACCENT}" d="${PUG_HAT_PATH}"/>
    <path fill-rule="evenodd" fill="${ink}" d="${PUG_INK_PATH}"/>
  </g>
</svg>`;
}

const out = (name) => path.resolve(process.cwd(), "assets", name);
mkdirSync(path.resolve(process.cwd(), "assets"), { recursive: true });

const light = mark({ bg: BG, body: BG, ink: INK });
await sharp(Buffer.from(light)).resize(1024, 1024).png().toFile(out("icon.png"));
await sharp(Buffer.from(mark({ bg: null, body: BG, ink: INK }))).resize(1024, 1024).png().toFile(out("splash-icon.png"));
await sharp(Buffer.from(mark({ bg: null, body: BG, ink: INK }))).resize(1024, 1024).png().toFile(out("android-icon-foreground.png"));
await sharp(Buffer.from(mark({ bg: null, body: "#FFFFFF", ink: "#FFFFFF" }))).resize(1024, 1024).png().toFile(out("android-icon-monochrome.png"));
await sharp(Buffer.from(light)).resize(64, 64).png().toFile(out("favicon.png"));
writeFileSync(out("icon.svg"), light);
console.log("icons written to assets/");
