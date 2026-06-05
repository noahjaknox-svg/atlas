import type { ExperienceContentBlocks, ExperienceSectionSnapshot } from "./experience-content";

export const EXPERIENCE_DEFAULT_SECTIONS: Omit<
  ExperienceSectionSnapshot,
  "visible" | "sortOrder"
>[] = [
  {
    sectionType: "welcome",
    title: "Welcome",
    bodyCopy: `Dear {contactName},

Thank you for allowing us to present this management proposal for your new aircraft acquisition.

PrismJet delivers excellence across every aspect of aircraft management. What truly sets us apart is our proactive aircraft managers, our unique charter payback model, and our promise to never mark up outside expenses.

It took over 100 years of combined experience to build the foundation of PrismJet. We hope you'll join us in redefining what professional aircraft management looks like.`,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    layoutVariant: "welcome_letter",
    signatoryName: "Scott Casey",
    signatoryTitle: "Vice President",
    contentBlocks: null,
  },
  {
    sectionType: "about_us",
    title: "About Us",
    bodyCopy:
      "PrismJet was founded by a team of aviation professionals with over a century of combined experience. Our expertise in private aviation management covers every aspect from operations and charter to maintenance.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "aircraft_management",
    title: "Aircraft Management",
    bodyCopy:
      "We handle every detail affecting your aircraft with precision and care, so you can focus on what matters most. From complete logistical and operational oversight to optional revenue-generating charter coordination, our team ensures a seamless ownership experience.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "aircraft_charter",
    title: "Aircraft Charter",
    bodyCopy:
      "Aircraft ownership is expensive. Let PrismJet make the ownership experience more cost-effective by chartering your aircraft when you're not flying. With a focus on maximizing utilization, we offer an economic model that provides up to a 15% higher average charter payback than industry standards.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "maintenance",
    title: "Maintenance",
    bodyCopy:
      "Our flat-rate maintenance program is designed to provide aircraft owners with complete peace of mind. By covering all scheduled and unscheduled maintenance labor under one predictable monthly rate, we eliminate the stress of surprise costs and fluctuating service fees.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "sales_acquisitions",
    title: "Sales and Acquisitions",
    bodyCopy:
      "Whether you are acquiring your next aircraft or optimizing your current fleet, PrismJet provides expert guidance through every stage of the transaction.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "conformity_process",
    title: "Conformity Process",
    bodyCopy:
      "Transitioning an aircraft onto a new charter (FAA Part 135) certificate is a detailed operational and regulatory process. This guide provides a transparent understanding of what conformity involves, what affects timeline and downtime, and how PrismJet works to minimize disruption.",
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
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
    },
  },
  {
    sectionType: "pro_forma",
    title: "Pro Forma",
    bodyCopy:
      "The pro forma below is designed to provide a practical estimate of annual and monthly aircraft ownership economics. These figures are based on the selected aircraft, proposed base, expected owner usage, charter assumptions, and PrismJet-controlled operating inputs.",
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
