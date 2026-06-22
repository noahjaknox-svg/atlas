import { prisma } from "./db";
import { hashPin } from "./auth";
import { decryptPinFromStorage, encryptPinForStorage } from "./pin-vault";
import { generatePin } from "./utils";

import { getExternalAppUrl } from "./app-url";

export function getPortalUrl(slug: string): string {
  const base = getExternalAppUrl();
  return `${base}/${slug}`;
}

export async function getPortalCredentials(proposalId: string) {
  const portal = await prisma.clientPortal.findUnique({
    where: { proposalId },
    select: {
      slug: true,
      active: true,
      viewCount: true,
      pinCiphertext: true,
    },
  });

  if (!portal) return null;

  const pin = portal.pinCiphertext
    ? decryptPinFromStorage(portal.pinCiphertext)
    : null;

  return {
    slug: portal.slug,
    portalUrl: getPortalUrl(portal.slug),
    active: portal.active,
    viewCount: portal.viewCount,
    pin,
  };
}

/**
 * Toggle whether clients can reach a published portal. Setting `active = false`
 * "takes down" the proposal without touching the deal, snapshot, slug, or PIN, so
 * it can be restored later with the exact same published version.
 */
export async function setPortalActive(proposalId: string, active: boolean) {
  const portal = await prisma.clientPortal.findUnique({
    where: { proposalId },
    select: { slug: true },
  });

  if (!portal) {
    throw new Error("Portal not found");
  }

  const updated = await prisma.clientPortal.update({
    where: { proposalId },
    data: { active },
    select: { slug: true, active: true },
  });

  return {
    slug: updated.slug,
    active: updated.active,
    portalUrl: getPortalUrl(updated.slug),
  };
}

export async function regeneratePortalPin(proposalId: string) {
  const portal = await prisma.clientPortal.findUnique({
    where: { proposalId },
  });

  if (!portal) {
    throw new Error("Portal not found");
  }

  const pin = generatePin();
  const pinHash = await hashPin(pin);
  const pinCiphertext = encryptPinForStorage(pin);

  await prisma.clientPortal.update({
    where: { proposalId },
    data: { pinHash, pinCiphertext },
  });

  return {
    slug: portal.slug,
    portalUrl: getPortalUrl(portal.slug),
    pin,
  };
}
