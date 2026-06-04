"use client";

import Link from "next/link";
import { WIZARD_STEPS } from "@/lib/assumptions";
import { cn } from "@/lib/utils";

export function WizardShell({
  proposalId,
  currentStep,
  children,
}: {
  proposalId: string;
  currentStep: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <nav className="mb-10 flex flex-wrap gap-2 border-b border-atlas-border pb-6">
        {WIZARD_STEPS.map((step) => (
          <Link
            key={step.id}
            href={`/proposals/${proposalId}?step=${step.id}`}
            className={cn(
              "rounded-full px-3 py-1 text-xs transition-colors",
              currentStep === step.id
                ? "bg-atlas-accent text-atlas-bg"
                : step.id < currentStep
                  ? "bg-atlas-surface text-atlas-text"
                  : "text-atlas-muted hover:text-atlas-text"
            )}
          >
            {step.id}. {step.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
