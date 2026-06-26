// "Image of the day" pool — files live in /public/login. Shared by the /login
// hero and the app-launch SplashScreen. Each entry lists the formats that exist
// for it (best first); <picture> emits a <source> per format and the last is the
// <img> fallback. Add a photo by dropping the file(s) into /public/login and
// listing the base name below.

export interface PoolImage {
  base: string;
  formats: readonly string[];
}

// Always present — committed avif+webp, never pruned (so production never ends
// up with an empty pool even if the fs check below can't see /public).
export const BASE_IMAGES: readonly PoolImage[] = [
  { base: "a", formats: ["avif", "webp"] },
  { base: "crni-zdera", formats: ["avif", "webp"] },
  { base: "igor", formats: ["avif", "webp"] },
  { base: "linci", formats: ["avif", "webp"] },
];

// Added by dropping a file into /public/login — included only once the file is
// actually present (see availableLoginImages), so a missing file never renders
// as a broken image. Either format works; whichever exist get used.
export const OPTIONAL_IMAGES: readonly PoolImage[] = [
  { base: "ekipa-pivo", formats: ["webp", "jpg", "png"] },
  { base: "ekipa-festa", formats: ["webp", "jpg", "png"] },
];

const MIME: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/** <source> descriptors for a <picture>, in preference order. */
export function imageSources(img: PoolImage): { src: string; type: string }[] {
  return img.formats.map((f) => ({ src: `/login/${img.base}.${f}`, type: MIME[f] ?? "image/*" }));
}

/** The plain <img> fallback src (last/most-compatible format). */
export function imageFallback(img: PoolImage): string {
  const f = img.formats[img.formats.length - 1] ?? "webp";
  return `/login/${img.base}.${f}`;
}

export function pickRandom<T>(arr: readonly T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}
