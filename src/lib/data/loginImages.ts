// Login "image of the day" pool — pre-optimized into /public/login/<name>.{avif,webp}.
export const LOGIN_IMAGES = ["a", "crni-zdera", "igor", "linci"] as const;

/** Pick a random login image name (call per request on a dynamic route). */
export function randomLoginImage(): string {
  return LOGIN_IMAGES[Math.floor(Math.random() * LOGIN_IMAGES.length)];
}
