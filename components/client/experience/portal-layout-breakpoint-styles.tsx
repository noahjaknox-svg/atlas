"use client";

import { useEffect } from "react";
import {
  breakpointStyleContent,
  DEFAULT_LAYOUT_SETTINGS,
  parsePortalLayoutSettings,
  resolveLayoutBreakpoints,
  type PortalLayoutSettings,
} from "@/lib/portal-layout-settings";

const STYLE_ID = "portal-layout-breakpoints";

export function PortalLayoutBreakpointStyles({
  layoutSettings,
}: {
  layoutSettings?: PortalLayoutSettings | null;
}) {
  useEffect(() => {
    const settings = parsePortalLayoutSettings(layoutSettings ?? DEFAULT_LAYOUT_SETTINGS);
    const css = breakpointStyleContent(resolveLayoutBreakpoints(settings));

    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [layoutSettings]);

  return null;
}
