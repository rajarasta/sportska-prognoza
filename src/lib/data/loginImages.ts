// "Image of the day" pool — pre-optimized into /public/login/<name>.{avif,webp}.
// Shared by the /login hero and the app-launch SplashScreen. Add a new photo by
// dropping <name>.avif + <name>.webp into /public/login and listing it here.
export const LOGIN_IMAGES = ["a", "crni-zdera", "igor", "linci"] as const;

/** Pick a random login image name (call per request on a dynamic route). */
export function randomLoginImage(): string {
  return LOGIN_IMAGES[Math.floor(Math.random() * LOGIN_IMAGES.length)];
}
