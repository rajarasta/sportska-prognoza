import TabBar from "@/components/TabBar";
import SplashScreen from "@/components/SplashScreen";
import { pickRandom } from "@/lib/data/loginImages";
import { availableLoginImages } from "@/lib/server/login-images";

// Rendered per request so the splash picks a fresh image each launch.
export const dynamic = "force-dynamic";

// Shell for the authenticated tab screens — hosts the routed screen + bottom tab bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh" }}>
      {/* Launch "slika dana" — server-picked + painted immediately, once per session. */}
      <SplashScreen image={pickRandom(availableLoginImages())} />
      {children}
      <TabBar />
    </div>
  );
}
