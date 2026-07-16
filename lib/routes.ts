/** Internal app paths grouped by department. */
export const ROUTES = {
  home: "/aircraft-management/pipeline",
  aircraftManagement: {
    pipeline: "/aircraft-management/pipeline",
    proposalDesign: "/aircraft-management/proposal-design",
    proposal: (id: string, step?: number) =>
      step != null
        ? `/aircraft-management/proposals/${id}?step=${step}`
        : `/aircraft-management/proposals/${id}`,
    proposalNew: "/aircraft-management/proposals/new",
    proposalDesignView: (id: string) => `/aircraft-management/proposals/${id}/design`,
    proposalProForma: (id: string, aircraftId?: string) =>
      aircraftId
        ? `/aircraft-management/proposals/${id}/pro-forma?aircraft=${aircraftId}`
        : `/aircraft-management/proposals/${id}/pro-forma`,
  },
  charter: {
    find: "/charter/find",
    trips: "/charter/trips",
    schedule: "/charter/schedule",
    emptyLegs: "/charter/empty-legs",
    emptyLegsPublicLists: "/charter/empty-legs/public-lists",
    emptyLegsRoutingProfiles: "/charter/empty-legs/routing-profiles",
    emptyLegsAircraftProfiles: "/charter/empty-legs/aircraft-profiles",
    emptyLegsFleet: "/charter/empty-legs/fleet",
    emptyLegsSettings: "/charter/empty-legs/settings",
    leads: "/charter/leads",
    settings: "/charter/settings",
  },
  dataWarehouse: {
    data: "/data-warehouse/data",
    /** @deprecated Legacy path; redirects to Aircraft tab. Prefer ROUTES.dataWarehouse.data */
    performanceData: "/data-warehouse/data?tab=aircraft",
  },
} as const;
