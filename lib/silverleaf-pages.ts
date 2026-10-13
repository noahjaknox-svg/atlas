import type { ExperiencePageBlock } from "./experience-content";
import type { ExperienceMasterTemplate } from "./experience-master";
import { CLUB_PRISMJET_PAGE_SLUG } from "./club-client-view";

/**
 * The Silverleaf Air Golf Club proposal: ten custom pages in three groups.
 *   Members → Silverleaf owner → PrismJet economics (hidden before sharing with the owner).
 *
 * Numbers in text use {{club…}} placeholders (lib/club-variables.ts) so copy follows the
 * proposal's club inputs. Live, adjustable figures come from `clubEconomics` blocks.
 *
 * Compliance (spec §16): the initiation fee is never a deposit, capital contribution or
 * redeemable. Members never see sourcing logic, buy rates or per-trip margin.
 */

let seq = 0;
const id = () => `slc_${(seq++).toString(36)}`;

const header = { widthDesktop: "wide", widthMobile: "normal" };
const wide = { widthDesktop: "wide", widthMobile: "normal" };
const normal = { widthDesktop: "wide", widthMobile: "normal" };

type Block = ExperiencePageBlock;

const eyebrow = (label: string): Block => ({
  id: id(),
  type: "html",
  html: `<p style="margin:0;font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:rgba(110,231,183,.9)">${label}</p>`,
  blockLayout: header,
});

const h1 = (text: string): Block => ({
  id: id(),
  type: "heading",
  level: 1,
  text,
  blockLayout: header,
});

const lede = (markdown: string): Block => ({
  id: id(),
  type: "text",
  markdown,
  blockLayout: header,
});

const spacer = (): Block => ({ id: id(), type: "spacer", size: "md" });

const text = (markdown: string): Block => ({ id: id(), type: "text", markdown, blockLayout: { align: "left" } });

const heading = (t: string, level: 2 | 3 = 2): Block => ({ id: id(), type: "heading", level, text: t });

/** Single glass panel holding blocks. */
const panel = (children: Block[], layout = normal): Block => ({
  id: id(),
  type: "container",
  rows: 1,
  cols: 1,
  gap: "md",
  columnWeights: [1],
  rowWeights: [1],
  cellAlign: "start",
  cells: [[children]],
  blockLayout: { ...layout, panel: true, panelOpacity: 75 },
});

/** N glass panels side by side (stacks on mobile). */
const panels = (cols: Block[][], layout = normal): Block => ({
  id: id(),
  type: "container",
  rows: 1,
  cols: cols.length as 2 | 3,
  gap: "md",
  columnWeights: cols.map(() => 1),
  rowWeights: [1],
  cellAlign: "stretch",
  cellCardStyle: true,
  cells: [cols],
  blockLayout: layout,
});

const club = (view: Extract<Block, { type: "clubEconomics" }>["view"]): Block => ({
  id: id(),
  type: "clubEconomics",
  view,
  blockLayout: wide,
});

type PageDef = {
  slug: string;
  title: string;
  blocks: Block[];
};

const members = (n: string) => eyebrow(`Members · ${n}`);
const owner = (n: string) => eyebrow(`Silverleaf owner · ${n}`);

function pages(): PageDef[] {
  seq = 0;
  return [
    // ---------------------------------------------------------------- Members
    {
      slug: "silverleaf-welcome",
      title: "The club",
      blocks: [
        members("Welcome"),
        h1("Silverleaf Air Golf Club"),
        lede(
          "Prepared for **{{contactName}}**  \nGuaranteed access to a Bombardier Challenger 350 at one published rate, bundled with golf access and a peer network drawn from the Silverleaf membership."
        ),
        spacer(),
        club("program-stats"),
        spacer(),
        panels([
          [
            heading("What it is", 3),
            text(
              "A right to call for an airplane and get one. You are not buying a block of hours and you are not buying a share of an aircraft."
            ),
          ],
          [
            heading("How it works", 3),
            text(
              "One initiation, monthly dues, and a fixed rate for the time you fly. {{clubAllocationHours}} hours a year are included in your membership."
            ),
          ],
          [
            heading("Who it is for", 3),
            text(
              "Silverleaf members in good standing. Club membership is contingent on Silverleaf membership, and lapsing one triggers a review of the other."
            ),
          ],
        ]),
      ],
    },
    {
      slug: "silverleaf-membership",
      title: "Your membership",
      blocks: [
        members("Membership"),
        h1("Three things you pay"),
        lede("One initiation on joining, monthly dues for as long as you are a member, and a published rate for the time you fly."),
        spacer(),
        panel([
          text(
            [
              "| Component | Amount | Billed |",
              "| --- | --- | --- |",
              "| Initiation fee | {{clubInitiationFee}} | Once, on admission. Not refundable by the club. |",
              "| Monthly dues | {{clubMonthlyDues}} | Monthly, in advance |",
              "| Block hour rate | {{clubBlockRate}} | Per trip, in arrears |",
              "| Overage | Cost plus {{clubOverageMarkup}} | Hours beyond your allocation |",
            ].join("\n")
          ),
        ]),
        spacer(),
        club("member-cost"),
        spacer(),
        panel([
          heading("About the initiation fee", 3),
          text(
            "The initiation fee is not a deposit, not a capital contribution and not redeemable. It is a one-time fee to join the club, and the club does not buy memberships back. A member who wishes to leave may sell their membership to a buyer the club approves, on terms they negotiate. The club does not guarantee that a buyer exists."
          ),
          text("Unused hours do not roll over. Dues hold your capacity whether or not you use it."),
        ]),
      ],
    },
    {
      slug: "silverleaf-access",
      title: "How access works",
      blocks: [
        members("Access"),
        h1("Rules written before anyone needs them"),
        lede("A club that promises availability and cannot deliver it in the weeks members want it is worse than no club. These rules are the product."),
        spacer(),
        panel([
          text(
            [
              "| Rule | Value |",
              "| --- | --- |",
              "| Annual allocation | {{clubAllocationHours}} occupied hours per member |",
              "| Standard booking notice | 48 hours |",
              "| Booking window opens | 12 months ahead |",
              "| Maximum continuous possession | 7 days |",
              "| Peak period claims | 2 per member per year |",
              "| Peak declaration deadline | 90 days before the period opens |",
              "| Cancellation without charge | 72 hours before departure |",
            ].join("\n")
          ),
        ]),
        spacer(),
        panels([
          [
            heading("Peak periods", 3),
            text(
              "A published list set each year: Thanksgiving week, Christmas through New Year, Masters week, Memorial Day weekend and Labor Day weekend. Contested claims rotate: the member who lost a contested claim last year wins it this year, and you can see your own position."
            ),
          ],
          [
            heading("Inside 48 hours", 3),
            text(
              "We still work the trip. You will be told plainly at request time if crew duty or aircraft position may require an outside aircraft."
            ),
          ],
          [
            heading("Service recovery", 3),
            text(
              "If the club cannot deliver an aircraft on a confirmed booking, the trip is sourced elsewhere at the club's expense. You pay your normal block rate, and the hours count against your allocation."
            ),
          ],
        ]),
        spacer(),
        panel([
          heading("When requests compete", 3),
          text("Confirmed bookings first, then peak claims by rotation, then standard requests by submission time, then overage requests."),
        ]),
      ],
    },
    {
      slug: "silverleaf-fleet",
      title: "The aircraft",
      blocks: [
        members("Fleet"),
        h1("One type, ten members per aircraft"),
        lede("Every aircraft is a Bombardier Challenger 350, so one published rate, one cabin and one crew standard apply to every trip."),
        spacer(),
        panels([
          [
            heading("Sized to deliver", 3),
            text(
              "Each aircraft supports {{clubMembersPerAircraft}} members, not more. The fleet grows as membership grows: a new aircraft is acquired once {{clubAcquisitionTrigger}} initiations are received, and it is filled before the next is added."
            ),
          ],
          [
            heading("Atlas member app", 3),
            text(
              "Request a trip, see your hours against your allocation, review statements, claim peak periods and manage passengers, all from your phone or desktop."
            ),
          ],
        ]),
        spacer(),
        panel([
          text(
            [
              "| Fleet | Members | Acquired at |",
              "| --- | --- | --- |",
              "| 1 aircraft | 7 to 10 | 7 paid initiations |",
              "| 2 aircraft | 17 to 20 | 17 paid initiations |",
              "| 3 aircraft | 27 to 30 | 27 paid initiations |",
              "| 4 aircraft | 37 to 40 | 37 paid initiations |",
            ].join("\n")
          ),
        ]),
        spacer(),
        panel([
          heading("What a request looks like", 3),
          text(
            "You send a request and see a short confirming window, then your confirmation, the aircraft and the crew. Expect confirmation within about two hours in business hours and four hours otherwise. Golf bags are a real input, so tell us how many."
          ),
        ]),
      ],
    },
    {
      slug: "silverleaf-billing",
      title: "Transfers & billing",
      blocks: [
        members("Account"),
        h1("Billing you can reconcile line by line"),
        lede("One statement a month: dues for the coming period and flight charges for the period just closed."),
        spacer(),
        panel([
          text(
            [
              "| Line | Timing | Basis |",
              "| --- | --- | --- |",
              "| Initiation fee | On admission | {{clubInitiationFee}}, one time |",
              "| Monthly dues | 1st of month, in advance | {{clubMonthlyDues}} |",
              "| Flight charges | Monthly, in arrears | Block hours at {{clubBlockRate}} |",
              "| Overage | Monthly, in arrears | Cost plus {{clubOverageMarkup}} |",
              "| Cancellation | Monthly, in arrears | Per the access rules |",
              "| Incidentals | Monthly, in arrears | At cost, itemised |",
            ].join("\n")
          ),
        ]),
        spacer(),
        panels([
          [
            heading("Never added", 3),
            text("No fuel surcharges, repositioning charges, peak-season premiums or short-notice fees. The published rate is the product."),
          ],
          [
            heading("Transfers", 3),
            text(
              "The club has a 30 day right of first refusal on any transfer. The incoming member must be a Silverleaf member in good standing and pass the same approval as a new applicant. A 5% transfer fee applies."
            ),
          ],
          [
            heading("Annual review", 3),
            text("Dues and the block rate are reviewed once a year with 90 days notice, not adjusted mid-year."),
          ],
        ]),
      ],
    },
    // ------------------------------------------------------- Silverleaf owner
    {
      slug: "silverleaf-program",
      title: "The program",
      blocks: [
        owner("Program"),
        h1("Two entities, two jobs"),
        lede("The club owns the aircraft and the member relationship. PrismJet operates the aircraft under its Part 135 certificate."),
        spacer(),
        panels([
          [
            heading("Silverleaf Air Golf Club LLC", 3),
            text(
              "**Holds** aircraft title, acquisition debt and membership agreements.  \n**Does** collect initiation fees, dues and flight revenue, and owns the member relationship.  \n**Earns** the residual after operating costs, debt service and the operator's share."
            ),
          ],
          [
            heading("PrismJet", 3),
            text(
              "**Holds** the Part 135 certificate, crew, dispatch and maintenance oversight.  \n**Does** operate the aircraft, source supplemental lift, run Atlas and fulfil member trips."
            ),
          ],
        ]),
        spacer(),
        panel([
          heading("Why the separation matters", 3),
          text(
            "- FAA-regulated flight operations stay inside the certificated operator, not inside a lifestyle club.\n- Silverleaf owns airplanes, not an aviation business.\n- The structure keeps aircraft debt with the club and operating liability inside the certificate."
          ),
        ]),
      ],
    },
    {
      slug: "silverleaf-structure",
      title: "Ownership structure",
      blocks: [
        owner("Structure"),
        h1("How much to put at risk"),
        lede("Three structures, one axis: how much capital Silverleaf commits and how much of the fleet it owns at the end."),
        spacer(),
        club("structures"),
        spacer(),
        panels([
          [
            heading("Licensing", 3),
            text("An annual fee plus a royalty on club gross revenue. No capital at risk, and PrismJet guarantees the loan."),
          ],
          [
            heading("Joint venture", 3),
            text("Equal ownership with shared bridge capital and a shared guarantee. The only structure that carries 50/50 deadlock risk."),
          ],
          [
            heading("Owner-financed", 3),
            text("Silverleaf arranges the financing and owns 75% of the fleet. Down payments are funded by member initiations, not by Silverleaf."),
          ],
        ]),
        spacer(),
        panel([
          heading("Open term", 3),
          text("Whether the guarantee is several or joint and several must be settled before term sheets. Under a joint and several guarantee either party can be pursued for the full loan balance."),
        ]),
      ],
    },
    {
      slug: "silverleaf-pro-forma",
      title: "Pro forma",
      blocks: [
        owner("Pro forma"),
        h1("The club's numbers, in your hands"),
        lede("Adjust membership growth and flying hours and watch cash, fleet and structure outcomes recalculate."),
        spacer(),
        club("pro-forma"),
        spacer(),
        panel([
          heading("How to read this", 3),
          text(
            "Cash includes each aircraft's down payment, funded by initiation fees, and the months an aircraft is carried before it enters service. The operator share is shown as a single cost line. Charter on idle capacity is not included."
          ),
        ]),
      ],
    },
    {
      slug: "silverleaf-launch",
      title: "Launch & risk",
      blocks: [
        owner("Launch"),
        h1("From first member to first aircraft"),
        lede("The period between the first paid member and the first club aircraft is the most delicate part of the program."),
        spacer(),
        panel([
          text(
            [
              "1. Structure agreed with Silverleaf.",
              "2. Membership agreement drafted and reviewed by counsel.",
              "3. Validation round with twenty prospective members.",
              "4. Founding member cohort admitted.",
              "5. Atlas member app and operations console live.",
              "6. Seventh initiation received and the acquisition process begins.",
              "7. Aircraft delivered and conformed. Budget {{clubConformityMonths}} months for conformity.",
              "8. Club transitions to its own aircraft.",
            ].join("\n")
          ),
        ]),
        spacer(),
        club("cash-timeline"),
        spacer(),
        panel([
          heading("Managed risks", 3),
          text(
            [
              "| Risk | Mitigation |",
              "| --- | --- |",
              "| Demand concentrated in peak weeks | Claim limits, rotation and budgeted supplemental lift |",
              "| Deadhead above model | Trip sourcing logic and routing discipline |",
              "| Member attrition before transfer | Right of first refusal, waiting list and founding cohort quality |",
              "| Interest rate movement | Rate lock at acquisition |",
              "| Silverleaf brand exposure | Service levels in the licence, escalation path and quarterly review |",
            ].join("\n")
          ),
        ]),
        spacer(),
        panel([
          heading("Before any member signs", 3),
          text("Securities and aviation counsel review, member hour validation, a settled structure, and the founding member terms."),
        ]),
      ],
    },
    // -------------------------------------------------------------- PrismJet
    {
      slug: CLUB_PRISMJET_PAGE_SLUG,
      title: "PrismJet economics",
      blocks: [
        eyebrow("PrismJet · Internal"),
        h1("PrismJet economics"),
        lede("Internal. Hide this page before sharing the proposal with Silverleaf."),
        spacer(),
        club("prismjet"),
        spacer(),
        panel([
          heading("Why the operating share", 3),
          text(
            "It is paid whether or not the club is profitable, and it covers the certificate, crew, dispatch, Atlas and member fulfilment. The club would otherwise buy these at market from a third-party manager."
          ),
          text(
            "**Charter share.** When a club aircraft flies third-party charter on idle capacity, revenue is split 70% to the club and 30% to PrismJet after direct operating cost. Charter is only sold into capacity outside member allocation and declared peak periods."
          ),
        ]),
      ],
    },
  ];
}

export const SILVERLEAF_PAGE_SLUGS = pages().map((p) => p.slug);

/** Master templates for the Silverleaf pages, applying only to the given usage type. */
export function silverleafMasterTemplates(
  usageTypeId: string,
  baseSortOrder = 100
): ExperienceMasterTemplate[] {
  return pages().map((p, i) => ({
    sectionType: "custom_page",
    pageSlug: p.slug,
    title: p.title,
    bodyCopy: null,
    // Hidden by default: proposals copy master pages with this flag, and usage-type filtering
    // only runs afterwards. Visibility is switched on when a proposal's usage type is Silverleaf
    // (applyUsageTypeVisibility), so other types never see these pages, even briefly.
    visible: false,
    sortOrder: baseSortOrder + i + 1,
    imageUrl: null,
    videoUrl: null,
    posterUrl: null,
    signatoryName: null,
    signatoryTitle: null,
    layoutVariant: null,
    calloutMetricLabel: null,
    calloutMetricValue: null,
    contentBlocks: { pageBlocks: p.blocks },
    usageTypeIds: [usageTypeId],
  }));
}
