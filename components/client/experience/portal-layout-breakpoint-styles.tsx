import {
  breakpointStyleContent,
  DEFAULT_LAYOUT_SETTINGS,
  parsePortalLayoutSettings,
  resolveLayoutBreakpoints,
  type PortalLayoutSettings,
} from "@/lib/portal-layout-settings";

/**
 * Branding-configurable layout breakpoints (when widths switch to their mobile value, when grids stack,
 * where "Show on" flips). Rendered as a <style> in the markup — not injected after hydration — so the
 * first paint already uses the configured values. The CSS is built from numbers only.
 */
export function PortalLayoutBreakpointStyles({
  layoutSettings,
}: {
  layoutSettings?: PortalLayoutSettings | null;
}) {
  const settings = parsePortalLayoutSettings(layoutSettings ?? DEFAULT_LAYOUT_SETTINGS);
  const css = breakpointStyleContent(resolveLayoutBreakpoints(settings));
  return <style data-portal-layout-breakpoints dangerouslySetInnerHTML={{ __html: css }} />;
}
