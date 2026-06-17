import { CharterHeader } from "@/components/internal/charter/charter-header";

export function CharterShell({
  children,
  userName,
  isAdmin,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
}) {
  return (
    <div className="min-h-screen bg-atlas-bg pt-14">
      <CharterHeader userName={userName} isAdmin={isAdmin} />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
    </div>
  );
}
