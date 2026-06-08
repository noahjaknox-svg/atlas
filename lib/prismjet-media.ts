/**
 * Curated media from prismjet.net for default report heroes and galleries.
 * Hotlinked from the public site; replace via Proposal Design uploads if a URL changes.
 */
export const PRISMJET_MEDIA = {
  /** Scottsdale hangar / operations (about & management heroes) */
  hangarExterior:
    "https://prismjet.net/wp-content/uploads/2023/06/PrismJet-Hangar-Exterior.jpg",
  /** Challenger 350 — flagship fleet hero */
  challenger350:
    "https://prismjet.net/wp-content/uploads/2023/06/Challenger-350-Exterior.jpg",
  challenger350Cabin:
    "https://prismjet.net/wp-content/uploads/2023/06/Challenger-350-Cabin.jpg",
  /** Global 5000 long-range cabin */
  global5000:
    "https://prismjet.net/wp-content/uploads/2023/06/Global-5000-Exterior.jpg",
  /** Charter / revenue program */
  charterFlight:
    "https://prismjet.net/wp-content/uploads/2023/06/Challenger-350-In-Flight.jpg",
  /** Maintenance & conformity */
  maintenance:
    "https://prismjet.net/wp-content/uploads/2023/06/Aircraft-Maintenance.jpg",
  /** Sales & acquisitions */
  sales:
    "https://prismjet.net/wp-content/uploads/2023/06/Global-5000-Cabin.jpg",
  /** Team / welcome letter */
  team:
    "https://prismjet.net/wp-content/uploads/2023/06/PrismJet-Team.jpg",
  /** Sky / clouds hero fallback */
  clouds:
    "https://prismjet.net/wp-content/uploads/2023/06/PrismJet-Clouds.jpg",
} as const;

export type PrismJetMediaKey = keyof typeof PRISMJET_MEDIA;
