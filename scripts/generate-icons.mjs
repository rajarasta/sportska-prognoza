// Generate the PWA icon set from a single square master.
//   assets/icon-src/icon.svg  (512x512, ink background + brand bolt)
// → public/icons/{icon-192,icon-512,icon-maskable-512,apple-touch-icon}.png
// Run with: npm run icons
//
// The browser-tab favicon (src/app/favicon.ico) is intentionally left untouched;
// this script only produces PWA/home-screen icons referenced by the web manifest
// and the Apple touch-icon link tag.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = join(process.cwd(), "assets", "icon-src", "icon.svg");
const OUT = join(process.cwd(), "public", "icons");
const INK = "#0E1116";
const DENSITY = 384; // supersample the SVG, then resize down for crisp edges

await mkdir(OUT, { recursive: true });

// "any" icons — the master is full-bleed ink, so a straight resize is correct.
for (const size of [192, 512]) {
  await sharp(SRC, { density: DENSITY })
    .resize(size, size)
    .png()
    .toFile(join(OUT, `icon-${size}.png`));
}

// maskable — the bolt stays within the inner safe zone, so the master doubles as
// maskable; emitted as its own file so padding can change later without touching
// the "any" icons.
await sharp(SRC, { density: DENSITY })
  .resize(512, 512)
  .png()
  .toFile(join(OUT, "icon-maskable-512.png"));

// apple-touch-icon — 180, flattened opaque on ink (iOS dislikes transparency).
await sharp(SRC, { density: DENSITY })
  .resize(180, 180)
  .flatten({ background: INK })
  .png()
  .toFile(join(OUT, "apple-touch-icon.png"));

console.log("Generated PWA icons → public/icons/ (192, 512, maskable-512, apple-touch-icon)");
