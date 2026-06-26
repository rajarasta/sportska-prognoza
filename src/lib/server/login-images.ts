import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { BASE_IMAGES, OPTIONAL_IMAGES, type PoolImage } from "@/lib/data/loginImages";

const DIR = path.join(process.cwd(), "public", "login");

/** The full rotation pool: the always-present base images plus any optional
 *  image whose file has been added to /public/login. Optional entries are
 *  pruned to the formats that actually exist, so a newly-dropped photo lights
 *  up immediately and a not-yet-added one is simply skipped. */
export function availableLoginImages(): PoolImage[] {
  const optional = OPTIONAL_IMAGES.map((img) => ({
    base: img.base,
    formats: img.formats.filter((f) => existsSync(path.join(DIR, `${img.base}.${f}`))),
  })).filter((img) => img.formats.length > 0);
  return [...BASE_IMAGES, ...optional];
}
