import { AppHeader } from "@/components/internal/app-header";

export function InternalShell({
  children,
  userName,
  isAdmin,
  workspace,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  /** Full-height layout for proposal workspace (no page scroll). */
  workspace?: boolean;
}) {
  return (
    <div className="min-h-screen bg-atlas-bg pt-14">
      <AppHeader userName={userName} isAdmin={isAdmin} />
      {workspace ? (
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden">{children}</div>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
      )}
    </div>
  );
}
