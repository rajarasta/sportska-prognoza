import TabBar from "@/components/TabBar";
import SplashScreen from "@/components/SplashScreen";
import { availableLoginImages } from "@/lib/server/login-images";

// Shell for the authenticated tab screens — hosts the routed screen + bottom tab bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh" }}>
      {/* Launch "slika dana" — once per app session, fades to reveal the app. */}
      <SplashScreen images={availableLoginImages()} />
      {children}
      <TabBar />
    </div>
  );
}
