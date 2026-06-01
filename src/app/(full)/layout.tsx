import TabBar from "@/components/TabBar";

// Full-screen overlay shell for drill-in views. The content animates in on each
// push; the bottom tab bar sits OUTSIDE that wrapper so it stays anchored and
// doesn't re-animate as you navigate between drill-in screens.
export default function FullLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={{ minHeight: "100dvh", animation: "viewIn .22s ease" }}>{children}</div>
      <TabBar />
    </>
  );
}
