import { AppHeader } from "@/components/internal/app-header";
import type { DepartmentId } from "@/lib/departments";

export function InternalShell({
  children,
  userName,
  isAdmin,
  allowedDepartments,
  workspace,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  allowedDepartments?: DepartmentId[];
  /** Full-height layout for proposal workspace (no page scroll). */
  workspace?: boolean;
}) {
  return (
    <div className="min-h-screen bg-atlas-bg pt-14">
      <AppHeader userName={userName} isAdmin={isAdmin} allowedDepartments={allowedDepartments} />
      {workspace ? (
        <div className="h-[calc(100vh-3.5rem)] overflow-hidden">{children}</div>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
      )}
    </div>
  );
}
