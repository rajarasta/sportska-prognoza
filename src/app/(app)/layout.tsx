import TabBar from "@/components/TabBar";

// Shell for the authenticated tab screens — hosts the routed screen + bottom tab bar.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100dvh" }}>
      {children}
      <TabBar />
    </div>
  );
}
