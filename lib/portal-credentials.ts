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
