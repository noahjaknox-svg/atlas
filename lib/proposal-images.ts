/** Local proposal photography served from /public/images/proposals/. */

export const PROPOSAL_IMAGE_FILES = {
  fleetThreeAircraft: "fleet_three_aircraft.jpg",
  teamCasey: "team_casey.jpg",
  teamBianco: "team_bianco.jpg",
  teamPixley: "team_pixley.png",
  teamTurcott: "team_turcott.jpg",
  lifestyle060: "lifestyle_060.jpg",
  lifestyle087: "lifestyle_087.jpg",
  hangarJet: "IMG_9461.jpg",
  charterFlight: "contentday_094.png",
  maintenanceHangar: "contentday_061.jpg",
  charterCatering: "DSC03648.jpg",
  charterGuest: "untitled_design.jpg",
  engineWingDetail: "engine_wing_detail.jpg",
  scottsdaleOverhead: "wm_overhead.jpg",
} as const;

export type ProposalImageKey = keyof typeof PROPOSAL_IMAGE_FILES;

export function proposalImage(file: string): string {
  return `/images/proposals/${file}`;
}

export function proposalImageKey(key: ProposalImageKey): string {
  return proposalImage(PROPOSAL_IMAGE_FILES[key]);
}

export function isLocalProposalImage(url: string): boolean {
  return url.startsWith("/images/proposals/");
}
