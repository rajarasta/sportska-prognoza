// Convert the raw login photos (assets/login-src/*.png) into bundle-friendly
// AVIF + WebP at the display size, written to public/login/. Run with:
//   npm run optimize:images
import { mkdir, readdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";
import sharp from "sharp";

const SRC = join(process.cwd(), "assets", "login-src");
const OUT = join(process.cwd(), "public", "login");
const MAX_WIDTH = 860; // retina for the ~430px app column

const files = (await readdir(SRC)).filter((f) => /\.(png|jpe?g)$/i.test(f));
await mkdir(OUT, { recursive: true });

let totalIn = 0;
let totalOut = 0;
for (const file of files) {
  const { name } = parse(file);
  const inPath = join(SRC, file);
  totalIn += (await stat(inPath)).size;

  const base = sharp(inPath).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true });

  const avifPath = join(OUT, `${name}.avif`);
  const webpPath = join(OUT, `${name}.webp`);
  await base.clone().avif({ quality: 50 }).toFile(avifPath);
  await base.clone().webp({ quality: 72 }).toFile(webpPath);

  totalOut += (await stat(avifPath)).size + (await stat(webpPath)).size;
  console.log(`  ${file} → ${name}.avif + ${name}.webp`);
}

console.log(
  `Optimized ${files.length} image(s): ${(totalIn / 1024).toFixed(0)}KB → ${(totalOut / 1024).toFixed(0)}KB (avif+webp).`,
);
