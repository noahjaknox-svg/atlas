import { requireInternalUser } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import {
  getPortalContent,
  getFleetShowcase,
  upsertPortalContent,
  replaceFleetShowcase,
  type FleetShowcaseItem,
} from "@/lib/portal-content";

export async function GET() {
  try {
    const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);
    return jsonOk({ content, fleet });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireInternalUser();
    const body = await request.json();

    if (body.content) {
      await upsertPortalContent(body.content);
    }
    if (Array.isArray(body.experienceTemplates)) {
      await upsertPortalContent({ experienceTemplates: body.experienceTemplates });
    }
    if (Array.isArray(body.fleet)) {
      await replaceFleetShowcase(body.fleet as FleetShowcaseItem[]);
    }

    const [content, fleet] = await Promise.all([getPortalContent(), getFleetShowcase()]);
    return jsonOk({ content, fleet });
  } catch (e) {
    return handleApiError(e);
  }
}
