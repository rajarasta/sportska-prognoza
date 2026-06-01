// Full-screen overlay shell for drill-in views (no tab bar).
export default function FullLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div style={{ minHeight: "100dvh", animation: "viewIn .22s ease" }}>{children}</div>;
}
