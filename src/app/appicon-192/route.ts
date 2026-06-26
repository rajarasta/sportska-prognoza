import { iconPngResponse } from "@/lib/icon-data";

// Served as a Next route — Firebase App Hosting does not serve files from /public,
// so the PWA manifest must point at routes like this instead of /icons/*.png.
export const dynamic = "force-static";

export function GET() {
  return iconPngResponse();
}
