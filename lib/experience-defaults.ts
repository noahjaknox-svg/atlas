import type { ExperienceContentBlocks, ExperienceSectionSnapshot } from "./experience-content";
import { proposalImageKey } from "./proposal-images";

const IMG = {
  fleet: proposalImageKey("fleetThreeAircraft"),
  casey: proposalImageKey("teamCasey"),
  bianco: proposalImageKey("teamBianco"),
  pixley: proposalImageKey("teamPixley"),
  turcott: proposalImageKey("teamTurcott"),
  life060: proposalImageKey("lifestyle060"),
  life087: proposalImageKey("lifestyle087"),
  hangar: proposalImageKey("hangarJet"),
  charter: proposalImageKey("charterFlight"),
  maint: proposalImageKey("maintenanceHangar"),
  catering: proposalImageKey("charterCatering"),
  guest: proposalImageKey("charterGuest"),
  engine: proposalImageKey("engineWingDetail"),
  overhead: proposalImageKey("scottsdaleOverhead"),
};

export const EXPERIENCE_DEFAULT_SECTIONS: Omit<
  ExperienceSectionSnapshot,
  "visible" | "sortOrder"
>[] = [
  {
    sectionType: "welcome",
    title: "Aircraft Management & Charter",
    bodyCopy: `Dear {contactName},

Thank you for the opportunity to present this management proposal for your {aircraftName}. This outlook was built specifically for you — your aircraft, your base, your expected flying — not a template.

PrismJet was founded on a simple idea: ownership should be transparent, predictable, and genuinely enjoyable. What sets us apart is the combination of proactive aircraft managers who anticipate rather than react, a charter payback model that pays you on block time rather than flight time, and a promise to never mark up an outside expense.

It took more than 100 years of combined experience to build the foundation of PrismJet. We would be honored to put that experience to work for you.

Sincerely,
Scott Casey — Vice President`,
    imageUrl: IMG.fleet,
    videoUrl: null,
    posterUrl: IMG.fleet,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "welcome_letter",
    signatoryName: "Scott Casey",
    signatoryTitle: "Vice President",
    contentBlocks: {
      aircraftMarketUrl: "https://prismjet.net/fleet/",
      aircraftMarketButtonLabel: "Available aircraft",
      gallery: [
        { url: IMG.casey, caption: "Scott Casey — Vice President" },
        { url: IMG.life060, caption: "Executive cabin lifestyle" },
      ],
    },
  },
  {
    sectionType: "about_us",
    title: "About PrismJet",
    bodyCopy: `PrismJet was founded by a team of aviation professionals with over a century of combined experience across operations, charter, and maintenance. We built the company we wished existed when we were owners and operators ourselves — one accountable team, clear numbers, and no surprises.

From our base in Scottsdale, Arizona, we manage and operate aircraft for discerning owners who expect more than a logo on an invoice. Every relationship is built on three commitments: honesty in what we tell you, accuracy in what we report, and expertise in how we operate your asset.`,
    imageUrl: IMG.life060,
    videoUrl: null,
    posterUrl: IMG.life060,
    calloutMetricLabel: "Combined experience",
    calloutMetricValue: "100+ years",
    layoutVariant: "mission_vision_values",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      pillars: [
        {
          title: "Mission",
          body: "To set a new standard in aviation: transparent aircraft management and charter that creates a seamless ownership experience.",
        },
        {
          title: "Vision",
          body: "To redefine excellence in aircraft management and charter — and consistently exceed what owners expect.",
        },
        {
          title: "Values",
          body: "Honesty. Accuracy. Expertise.",
        },
      ],
      gallery: [
        { url: IMG.bianco, caption: "Leadership — PrismJet" },
        { url: IMG.pixley, caption: "Leadership — PrismJet" },
        { url: IMG.turcott, caption: "Leadership — PrismJet" },
        { url: IMG.casey, caption: "Scott Casey — Vice President" },
      ],
    },
  },
  {
    sectionType: "aircraft_management",
    title: "Aircraft Management",
    bodyCopy: `We handle every detail affecting your aircraft with precision and care, so you can focus on what matters most. From complete logistical and operational oversight to optional, revenue-generating charter coordination, our team ensures a seamless ownership experience from day one.`,
    imageUrl: IMG.hangar,
    videoUrl: null,
    posterUrl: IMG.hangar,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "management_pillars",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      pillars: [
        {
          title: "Dedicated Aircraft Manager",
          body: "Your single point of contact, coordinating our entire team on your behalf — with direct access to PrismJet leadership whenever you need it.",
        },
        {
          title: "Full Operational Oversight",
          body: "Crew, maintenance, accounting, scheduling, and charter sales — every detail handled by experienced professionals under one roof.",
        },
      ],
      callout: {
        label: "Why PrismJet",
        value: "One accountable team — not a chain of vendors and hand-offs that lead to miscommunication.",
      },
      gallery: [{ url: IMG.life087, caption: "Focus on what matters — PrismJet management" }],
    },
  },
  {
    sectionType: "aircraft_charter",
    title: "Aircraft Charter",
    bodyCopy: `Aircraft ownership is a significant investment. PrismJet makes it more cost-effective by chartering your aircraft when you're not flying it — turning idle time into revenue while you stay in complete control of your schedule.`,
    imageUrl: IMG.charter,
    videoUrl: null,
    posterUrl: IMG.charter,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "charter_payback",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      quote: {
        text: "PrismJet pays owners up to a 15% higher average charter payback than industry standards.",
      },
      introBullets: [
        "Block-time compensation — We pay you taxi-to-taxi, not just wheels-up to wheels-down, so more of every trip is paid back to you.",
        "Higher charter yield — Active fleet management and demand-based pricing maximize what your aircraft earns.",
        "Repositioning turned to revenue — Empty legs and repositioning flights become earning opportunities, not sunk cost.",
      ],
      gallery: [
        { url: IMG.catering, caption: "Onboard catering — charter guest experience" },
        { url: IMG.guest, caption: "In-flight experience" },
      ],
    },
  },
  {
    sectionType: "maintenance",
    title: "Maintenance",
    bodyCopy: `Our flat-rate maintenance program is designed to give owners complete peace of mind — predictable monthly costs and zero incentive for us to over-service your aircraft.`,
    imageUrl: IMG.maint,
    videoUrl: null,
    posterUrl: IMG.maint,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "maintenance_comparison",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      callout: {
        label: "Our commitment",
        value: "We do not profit from your aircraft maintenance or parts.",
      },
      comparisonRows: [
        { item: "Flight deck flashlight inspection", otherCost: "Billed hourly", prismjetNote: "Included in monthly program" },
        { item: "Static wick replacement", otherCost: "Billed hourly", prismjetNote: "Included in monthly program" },
        { item: "Outside vendor oversight", otherCost: "Billed daily", prismjetNote: "Included in monthly program" },
        { item: "Tire replacement", otherCost: "Billed hourly", prismjetNote: "Included in monthly program" },
        { item: "Aircraft return-to-service", otherCost: "Billed hourly", prismjetNote: "Included in monthly program" },
      ],
      gallery: [{ url: IMG.engine, caption: "Hands-on maintenance oversight" }],
    },
  },
  {
    sectionType: "sales_acquisitions",
    title: "Sales and Acquisitions",
    bodyCopy: `Whether you're acquiring your next aircraft or optimizing your current fleet, PrismJet provides expert guidance through every stage of the transaction — pre-buy strategy, inspection oversight, negotiation support, and a smooth transition onto management.`,
    imageUrl: IMG.overhead,
    videoUrl: null,
    posterUrl: IMG.overhead,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "sales_services",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      serviceTiles: [
        { title: "Acquisitions & Sales", description: "Sourcing, valuation, and transaction guidance." },
        { title: "Fleet Insurance", description: "Competitive placement and underwriting support." },
        { title: "Consulting", description: "Operational and financial strategy for your aircraft." },
        { title: "Hangar", description: "Storage solutions at your home base." },
        { title: "Aircraft Management", description: "Full operational oversight." },
        { title: "Charter", description: "Revenue strategy through our certificate." },
      ],
      contactEmail: "fly@prismjet.net",
      contactPhone: "(480) 426-8180",
      contactWebsite: "prismjet.net",
      contactAddress: "15003 N Airport Dr, Scottsdale, AZ 85260",
      gallery: [{ url: IMG.fleet, caption: "PrismJet fleet — Scottsdale" }],
    },
  },
  {
    sectionType: "conformity_process",
    title: "Transition & Conformity Process Guide",
    bodyCopy: `Bringing an aircraft onto a management certificate is a defined, well-managed process. Here's what to expect — and how we keep your aircraft flying and your timeline on track.

Our objective is simple: a transition you barely feel, and an aircraft ready to perform.`,
    imageUrl: IMG.engine,
    videoUrl: null,
    posterUrl: IMG.engine,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "conformity_timeline",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      introBullets: [
        "Records and airworthiness review",
        "Conformity inspection at your home base",
        "Letter of Authorization (91 LOA) and Minimum Equipment List (MEL) setup",
        "Maintenance program enrollment and transfer",
        "Crew placement and operational onboarding",
      ],
      goalBullets: [
        "Minimize aircraft downtime",
        "Preserve operational continuity",
        "Accelerate FAA approvals",
        "Identify risks early",
        "Position your aircraft for charter utilization from the start",
      ],
      checklist: [
        { label: "Physical inspection of the aircraft" },
        { label: "Review and validation of maintenance records" },
        { label: "Verification of maintenance program compliance" },
        { label: "Approving a minimum equipment list (MEL)" },
        { label: "Alignment with PrismJet operational procedures and manuals" },
        { label: "Crew training program approval and adoption" },
        { label: "FAA review and approval processes" },
      ],
      timeline: [
        {
          phase: "Early planning",
          window: "2–3 months before giving notice",
          ownerActions: ["Execute agreement with PrismJet"],
          prismjetActions: [
            "Begin pilot training program development (30–45 days) if needed",
            "Begin development of Part 91 LOA",
            "Begin MEL development",
          ],
        },
        {
          phase: "Pre-conformity",
          window: "1–2 months prior to conformity",
          ownerActions: [
            "Give notice to current operator (per contract)",
            "Provide read-only access to maintenance tracking systems",
          ],
          prismjetActions: [
            "Identify potential maintenance discrepancies or gaps",
            "Begin detailed records audit",
            "Coordinate physical inspection planning",
            "Begin training program submissions",
            "Coordinate crew training schedules or hire if necessary",
            "Begin maintenance program transfers or enrollments",
          ],
        },
        {
          phase: "Final preparation",
          window: "2–4 weeks prior to conformity",
          ownerActions: [],
          prismjetActions: [
            "Coordinate physical logbook transfer",
            "Finalize records validation",
            "Finalize maintenance program alignment",
            "Finalize conformity scheduling",
          ],
        },
        {
          phase: "Conformity period",
          window: "FAA review (typically 2–6 weeks after submission)",
          ownerActions: ["Remain flexible with FAA timing expectations"],
          prismjetActions: [
            "Complete FAA aircraft inspection",
            "Validate documentation",
            "Resolve discrepancies",
            "Complete MEL approval process",
          ],
        },
      ],
      explainerCards: [
        {
          title: "Letter of Authorization (91 LOA)",
          body: "Authorizes specific operations for your aircraft.",
        },
        {
          title: "Minimum Equipment List (MEL)",
          body: "Defines what equipment must be operational for dispatch.",
        },
        {
          title: "Maintenance Program Transfer",
          body: "Moves your aircraft onto a tracked, compliant program with no gaps.",
        },
      ],
      gallery: [{ url: IMG.maint, caption: "Conformity inspection and maintenance readiness" }],
    },
  },
  {
    sectionType: "pro_forma",
    title: "Pro Forma",
    bodyCopy: `The pro forma below is a practical estimate of your annual and monthly aircraft ownership economics for the {aircraftName}. Figures are based on the selected aircraft, your proposed base, expected owner usage, charter assumptions, and PrismJet-controlled operating inputs.

Adjust Aircraft value and Owner annual hours to model your own scenario — every number updates live. Select "Restore to PrismJet assumptions" at any time to return to our recommended baseline.

These figures are an estimate for discussion purposes; final costs may vary based on records review, insurance underwriting, hangar availability, and crew placement.`,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "pro_forma",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: null,
  },
  {
    sectionType: "disclaimer",
    title: "Disclaimer",
    bodyCopy: `This proposal is an estimate prepared for discussion purposes only and does not constitute an offer, contract, or guarantee of pricing or performance. Final costs may vary based on aircraft records review, insurance underwriting, hangar availability, crew placement, charter demand, fuel pricing, regulatory requirements, and other factors. Charter payback figures are illustrative; actual block-versus-flight time and revenue vary with routing and market demand. All figures are subject to change. © PrismJet. Prepared for {contactName}.`,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: null,
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: null,
  },
];

export const EXPERIENCE_DEFAULT_SECTIONS_FOR_CREATE = EXPERIENCE_DEFAULT_SECTIONS.map(
  (s, i) => ({
    sectionType: s.sectionType,
    title: s.title,
    sortOrder: i + 1,
    visible: s.sectionType !== "disclaimer",
    bodyCopy: s.bodyCopy,
    layoutVariant: s.layoutVariant,
    contentBlocks: s.contentBlocks,
    signatoryName: s.signatoryName,
    signatoryTitle: s.signatoryTitle,
    imageUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    posterUrl: s.posterUrl,
    calloutMetricLabel: s.calloutMetricLabel,
    calloutMetricValue: s.calloutMetricValue,
  })
);

export function getExperienceDefault(sectionType: string): ExperienceSectionSnapshot | null {
  const idx = EXPERIENCE_DEFAULT_SECTIONS.findIndex((s) => s.sectionType === sectionType);
  if (idx < 0) return null;
  const d = EXPERIENCE_DEFAULT_SECTIONS[idx]!;
  return {
    ...d,
    visible: true,
    sortOrder: idx + 1,
  };
}

export type ExperienceCopyVars = {
  contactName?: string;
  aircraftName?: string;
};

export function interpolateExperienceCopy(
  bodyCopy: string | null,
  vars: ExperienceCopyVars
): string {
  if (!bodyCopy) return "";
  let out = bodyCopy;
  if (vars.contactName) {
    out = out.replace(/\{contactName\}/g, vars.contactName);
  }
  if (vars.aircraftName) {
    out = out.replace(/\{aircraftName\}/g, vars.aircraftName);
  }
  return out;
}

/** @deprecated Use interpolateExperienceCopy */
export function interpolateWelcomeCopy(bodyCopy: string | null, contactName: string): string {
  return interpolateExperienceCopy(bodyCopy, { contactName });
}
