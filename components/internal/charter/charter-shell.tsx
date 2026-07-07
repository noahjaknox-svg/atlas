import { AppHeader } from "@/components/internal/app-header";
import type { DepartmentId } from "@/lib/departments";

export function CharterShell({
  children,
  userName,
  isAdmin,
  allowedDepartments,
}: {
  children: React.ReactNode;
  userName?: string;
  isAdmin?: boolean;
  allowedDepartments?: DepartmentId[];
}) {
  return (
    <div className="min-h-screen bg-atlas-bg pt-14">
      <AppHeader userName={userName} isAdmin={isAdmin} allowedDepartments={allowedDepartments} />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">{children}</main>
    </div>
  );
}
