import type { ExperienceContentBlocks, ExperienceSectionSnapshot } from "./experience-content";
import { PRISMJET_MEDIA } from "./prismjet-media";

export const EXPERIENCE_DEFAULT_SECTIONS: Omit<
  ExperienceSectionSnapshot,
  "visible" | "sortOrder"
>[] = [
  {
    sectionType: "welcome",
    title: "Welcome",
    bodyCopy: `Dear {contactName},

Thank you for the opportunity to present this management proposal for your aircraft. It is a privilege we take seriously, and one we have prepared for with the care your investment deserves.

Private aviation should feel effortless. Behind that ease sits a great deal of work — proactive planning, disciplined oversight, and a team that anticipates needs before they become decisions. That is the standard we hold ourselves to on every tail we manage.

What sets PrismJet apart is simple to say and harder to deliver: dedicated managers who know your aircraft intimately, a charter payback model built around block time rather than flight time, and a promise to never mark up outside expenses. Your interests and ours stay aligned, every step of the way.

The pages that follow detail how we operate, what your ownership experience will look like, and a transparent pro forma of the economics involved. We would be honored to earn your trust.`,
    imageUrl: PRISMJET_MEDIA.clouds,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.clouds,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "welcome_letter",
    signatoryName: "Scott Casey",
    signatoryTitle: "Vice President",
    contentBlocks: {
      aircraftMarketUrl: "https://prismjet.net/fleet/",
      aircraftMarketButtonLabel: "Available aircraft",
      gallery: [
        { url: PRISMJET_MEDIA.team, caption: "PrismJet leadership — Scottsdale, AZ" },
        { url: PRISMJET_MEDIA.hangarExterior, caption: "Scottsdale Airpark operations base" },
      ],
    },
  },
  {
    sectionType: "about_us",
    title: "About Us",
    bodyCopy:
      "PrismJet was founded by aviation professionals who share more than a century of combined experience across operations, maintenance, charter, and ownership. We built the company we wished existed when we were on the other side of the table — one that treats transparency as a standard rather than a courtesy, and treats every aircraft as if it were our own.",
    imageUrl: PRISMJET_MEDIA.team,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.team,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "mission_vision_values",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      pillars: [
        {
          title: "Mission",
          body: "To set a new standard in aviation with transparent aircraft management and charter services to create a seamless experience.",
        },
        {
          title: "Vision",
          body: "To exceed expectations and redefine excellence in the aircraft management and charter industry.",
        },
        {
          title: "Values",
          body: "Honesty, Accuracy, and Expertise",
        },
      ],
      gallery: [
        { url: PRISMJET_MEDIA.hangarExterior, caption: "PrismJet Scottsdale operations" },
        { url: PRISMJET_MEDIA.challenger350Cabin, caption: "Super-midsize cabin — managed fleet" },
      ],
    },
  },
  {
    sectionType: "aircraft_management",
    title: "Aircraft Management",
    bodyCopy:
      "Ownership should add freedom to your life, not obligations. We manage every detail that surrounds your aircraft — crew, maintenance, scheduling, compliance, and accounting — with the precision of a team that has done it for decades. From day-to-day operational oversight to optional revenue-generating charter, the experience is designed to feel seamless, so the only thing you think about is where you want to go next.",
    imageUrl: PRISMJET_MEDIA.hangarExterior,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.hangarExterior,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "management_pillars",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      pillars: [
        {
          title: "Dedicated Aircraft Manager",
          body: "Your primary point of contact who communicates with our entire team on your behalf — with direct access to PrismJet leadership when you need it.",
        },
        {
          title: "Full Operational Oversight",
          body: "From crew and maintenance to accounting and charter sales, every detail is handled with care by experienced professionals.",
        },
      ],
      callout: {
        label: "Why PrismJet",
        value: "One accountable team — not multiple points of contact that lead to miscommunication.",
      },
      gallery: [{ url: PRISMJET_MEDIA.challenger350, caption: "Managed aircraft on the PrismJet certificate" }],
    },
  },
  {
    sectionType: "aircraft_charter",
    title: "Aircraft Charter",
    bodyCopy:
      "Aircraft ownership carries real fixed costs — and your aircraft spends most of its life on the ground. Charter turns that idle time into offset, putting your asset to work when you are not flying. PrismJet's model is built to maximize utilization and return more of every charter hour to you, delivering up to a 15% higher average payback than industry standards.",
    imageUrl: PRISMJET_MEDIA.charterFlight,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.charterFlight,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "charter_payback",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      quote: {
        text: "PrismJet pays owners up to a 15% higher average charter payback than industry standards",
      },
      introBullets: [
        "Block time (taxi to taxi) compensation instead of wheels-up-only flight time",
        "Higher charter yield for owners",
        "Repositioning flights turned into revenue opportunities when possible",
      ],
      gallery: [
        { url: PRISMJET_MEDIA.charterFlight, caption: "Charter revenue program" },
        { url: PRISMJET_MEDIA.challenger350Cabin, caption: "Challenger 350 — PrismJet fleet" },
      ],
    },
  },
  {
    sectionType: "maintenance",
    title: "Maintenance",
    bodyCopy:
      "Maintenance is where ownership budgets are usually won or lost. Our flat-rate program is built for peace of mind: scheduled and unscheduled maintenance labor is covered under one predictable monthly rate, with no surprise invoices and no padded hours. Because we do not profit from your maintenance or parts, every recommendation we make is the one we would make for our own fleet.",
    imageUrl: PRISMJET_MEDIA.maintenance,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.maintenance,
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
        { item: "Flight Deck Flashlight Inspection", otherCost: "$200/h × 1 hour", prismjetNote: "Included in Monthly" },
        { item: "Static Wick Replacement", otherCost: "$200/h × 1 hour", prismjetNote: "Included in Monthly" },
        { item: "Outside Vendor Oversight", otherCost: "$1,000/day × 5 days", prismjetNote: "Included in Monthly" },
        { item: "Tire Replacement", otherCost: "$200/h × 4 hours", prismjetNote: "Included in Monthly" },
        { item: "Aircraft Return to Service Fee", otherCost: "$200/h × 3.5 hours", prismjetNote: "Included in Monthly" },
      ],
      gallery: [{ url: PRISMJET_MEDIA.maintenance, caption: "Maintenance oversight — no markup on parts or labor" }],
    },
  },
  {
    sectionType: "sales_acquisitions",
    title: "Sales and Acquisitions",
    bodyCopy:
      "The right aircraft, acquired the right way, sets the tone for the entire ownership experience. Whether you are acquiring your next aircraft, transitioning from a current one, or optimizing a fleet, PrismJet provides clear-eyed guidance at every stage of the transaction — from market analysis and inspection through closing and entry into service.",
    imageUrl: PRISMJET_MEDIA.global5000,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.global5000,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "sales_services",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      serviceTiles: [
        { title: "Fleet Insurance", description: "Coverage guidance tailored to your mission." },
        { title: "Consulting", description: "Strategic advisory for ownership decisions." },
        { title: "Hangar", description: "Premium hangar solutions in Scottsdale." },
        { title: "Aircraft Management", description: "Turnkey Part 91 operations." },
        { title: "Charter", description: "Revenue programs that offset fixed costs." },
        { title: "Join Our Fleet", description: "Explore partnership opportunities." },
      ],
      contactEmail: "fly@prismjet.net",
      contactPhone: "(480) 426-8180",
      contactWebsite: "prismjet.net",
      contactAddress: "15003 N Airport Dr, Scottsdale, AZ 85260",
      gallery: [
        { url: PRISMJET_MEDIA.global5000, caption: "Global 5000 — long-range missions" },
        { url: PRISMJET_MEDIA.challenger350, caption: "Challenger 350 — super-midsize" },
      ],
    },
  },
  {
    sectionType: "conformity_process",
    title: "Conformity Process",
    bodyCopy:
      "Bringing an aircraft onto a charter (FAA Part 135) certificate is a detailed operational and regulatory undertaking — and one that is far smoother when you know what to expect. This guide lays out the conformity process in plain terms: what it involves, what drives timeline and downtime, and how PrismJet manages each step proactively to keep your aircraft flying and your transition on schedule.",
    imageUrl: PRISMJET_MEDIA.hangarExterior,
    videoUrl: null,
    posterUrl: PRISMJET_MEDIA.hangarExterior,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "conformity_timeline",
    signatoryName: null,
    signatoryTitle: null,
    contentBlocks: {
      introBullets: [
        "What the conformity process involves",
        "What factors affect timeline and downtime",
        "How PrismJet works to minimize disruption",
        "What owners can do to help accelerate the process",
        "Realistic expectations during transition",
      ],
      goalBullets: [
        "Minimize aircraft downtime",
        "Preserve operational continuity",
        "Accelerate FAA approval processes where possible",
        "Identify risks early before they impact schedule",
        "Position the aircraft for successful charter utilization after entry into service",
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
      recordsIssues: [
        "Incomplete records",
        "Disorganized maintenance history",
        "Missing documentation",
        "Delayed access from current operators",
        "Lack of digital maintenance tracking",
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
      ownerRecommendations: [
        "Execute agreements early",
        "Provide records access as early as possible",
        "Coordinate proactively with current operators",
        "Remain flexible with FAA timing expectations",
        "Align onboarding with maintenance schedules when possible",
      ],
      downtimeStrategies: [
        "Align conformity with major maintenance inspections to reduce incremental downtime",
        "Begin pilot and maintenance training in parallel during transition",
        "Work with the current operator for early records access — avoid premature notice",
      ],
      explainerCards: [
        {
          title: "Letter of Authorization (91 LOA)",
          body: "For owners continuing Part 91 private operations, LOAs may be required for international ops, RVSM, CPDLC, and special navigation approvals — separate from Part 135 conformity.",
        },
        {
          title: "Minimum Equipment List (MEL)",
          body: "Required prior to revenue operations. Typically targeted ~30 days after agreement execution, depending on configuration, documentation quality, and FAA responsiveness.",
        },
        {
          title: "Maintenance Program Transfer",
          body: "Engine, APU, airframe, and avionics programs must be transferred or enrolled prior to entry into service. Begin immediately after agreement execution.",
        },
      ],
      gallery: [{ url: PRISMJET_MEDIA.hangarExterior, caption: "Conformity inspection at home base" }],
    },
  },
  {
    sectionType: "pro_forma",
    title: "Pro Forma",
    bodyCopy:
      "The pro forma below offers a transparent, practical estimate of the annual and monthly economics of ownership. Every figure traces back to a clear assumption — the selected aircraft, proposed home base, expected owner usage, charter activity, and PrismJet-controlled operating inputs — so you can see exactly how the numbers are built and adjust them to match your mission.",
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
    bodyCopy:
      "This proposal is an estimate for discussion purposes only. Final costs may vary based on aircraft records review, insurance underwriting, hangar availability, crew placement, maintenance program status, vendor quotes, fuel pricing, charter demand, and operational requirements. This proposal does not constitute a binding agreement.",
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

export function interpolateWelcomeCopy(bodyCopy: string | null, contactName: string): string {
  if (!bodyCopy) return "";
  return bodyCopy.replace(/\{contactName\}/g, contactName);
}
