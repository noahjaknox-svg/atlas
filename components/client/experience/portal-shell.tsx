"use client";

import type { ComponentProps, ReactNode } from "react";
import { isExperienceRenderV2 } from "@/lib/experience-content";
import { ExperienceShell } from "./experience-shell";
import { ExperienceShellV2 } from "./v2/experience-shell-v2";
import type { ExperienceBootstrap } from "./v2/experience-bootstrap-context";

type PortalShellProps = ComponentProps<typeof ExperienceShell>;

/** Routes v1 vs v2 chrome based on published snapshot render schema. */
export function PortalShell({
  renderSchemaVersion,
  experienceBootstrap,
  children,
  ...props
}: PortalShellProps & {
  renderSchemaVersion?: number;
  experienceBootstrap?: ExperienceBootstrap;
  children?: ReactNode;
}) {
  if (isExperienceRenderV2(renderSchemaVersion)) {
    return (
      <ExperienceShellV2
        {...props}
        experienceBootstrap={experienceBootstrap}
      >
        {experienceBootstrap ? null : children}
      </ExperienceShellV2>
    );
  }
  return <ExperienceShell {...props}>{children}</ExperienceShell>;
}
