import type { ComponentProps } from "react";
import { isExperienceRenderV2 } from "@/lib/experience-content";
import { ExperienceShell } from "./experience-shell";
import { ExperienceShellV2 } from "./v2/experience-shell-v2";

type PortalShellProps = ComponentProps<typeof ExperienceShell>;

/** Routes v1 vs v2 chrome based on published snapshot render schema. */
export function PortalShell({
  renderSchemaVersion,
  ...props
}: PortalShellProps & { renderSchemaVersion?: number }) {
  if (isExperienceRenderV2(renderSchemaVersion)) {
    return <ExperienceShellV2 {...props} />;
  }
  return <ExperienceShell {...props} />;
}
