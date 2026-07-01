"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getSectionBySlug,
  isProFormaSectionVisible,
  type ExperienceSectionSnapshot,
} from "@/lib/experience-content";
import { sectionNavSlug } from "@/lib/experience-page-slug";
import {
  serializeClientSnapshotFromPayload,
  type ClientSnapshotView,
} from "@/lib/client-serializer-payload";
import type { ProposalSnapshotPayload } from "@/lib/snapshot";
import {
  experienceHref,
  getExperiencePageSlugs,
  withExperienceDraftQuery,
} from "@/lib/prefetch-experience-routes";

export type ExperienceBootstrap = {
  payload: ProposalSnapshotPayload;
  contactName: string;
  initialPageSlug: string;
  aircraftParam?: string | null;
  initialClientSnapshot?: ClientSnapshotView | null;
  proposalId?: string;
};

type ExperienceBootstrapContextValue = {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  payload: ProposalSnapshotPayload;
  contactName: string;
  branding: {
    heroCloudImageUrl: string;
    heroCloudVideoUrl: string | null;
    logoUrl?: string | null;
  };
  draftMode: boolean;
  aircraftParam: string | null;
  pageSlugs: string[];
  activeSlug: string;
  slideIndex: number;
  direction: number;
  navigate: (pageSlug: string, options?: { replace?: boolean }) => void;
  goToAdjacentSlide: (delta: number) => void;
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  clientSnapshot: ClientSnapshotView | null;
  clientLoading: boolean;
  mountedSlugs: ReadonlySet<string>;
  markSlugVisited: (pageSlug: string) => void;
  withDraft: (href: string) => string;
  tabHref: (section: ExperienceSectionSnapshot) => string;
  isActive: (section: ExperienceSectionSnapshot) => boolean;
  currentSlug: string;
};

const ExperienceBootstrapContext = createContext<ExperienceBootstrapContextValue | null>(null);

export { ExperienceBootstrapContext };

function parseExperienceSlug(pathname: string | null): string | null {
  const match = pathname?.match(/\/experience\/([^/?]+)/);
  return match?.[1] ?? null;
}

function buildExperienceUrl(
  slug: string,
  pageSlug: string,
  draftMode: boolean,
  search: string
): string {
  const base = withExperienceDraftQuery(experienceHref(slug, pageSlug), draftMode);
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("draft");
  const qs = params.toString();
  if (!qs) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}${qs}`;
}

function buildPublishedClientSnapshot(
  payload: ProposalSnapshotPayload,
  aircraftInstanceId: string | null
): ClientSnapshotView | null {
  return serializeClientSnapshotFromPayload(payload, {
    aircraftInstanceId: aircraftInstanceId ?? payload.primaryAircraftInstanceId ?? null,
  });
}

async function fetchClientSnapshotFromApi(options: {
  slug: string;
  draftMode: boolean;
  proposalId?: string;
  aircraftParam: string | null;
  primaryAircraftInstanceId?: string | null;
}): Promise<ClientSnapshotView | null> {
  const { slug, draftMode, proposalId, aircraftParam, primaryAircraftInstanceId } = options;
  const params = new URLSearchParams();
  if (aircraftParam) params.set("aircraft", aircraftParam);
  const qs = params.toString();

  const fetchUrl =
    draftMode && proposalId
      ? (() => {
          const draftParams = new URLSearchParams();
          const aircraftId = aircraftParam ?? primaryAircraftInstanceId ?? null;
          if (aircraftId) draftParams.set("aircraftInstanceId", aircraftId);
          const draftQs = draftParams.toString();
          return `/api/proposals/${encodeURIComponent(proposalId)}/portal-preview/client${draftQs ? `?${draftQs}` : ""}`;
        })()
      : `/api/portal/${encodeURIComponent(slug)}/proposal${qs ? `?${qs}` : ""}`;

  const res = await fetch(fetchUrl);
  if (!res.ok) return null;
  return (await res.json()) as ClientSnapshotView;
}

export function ExperienceBootstrapProvider({
  slug,
  sections,
  branding,
  draftMode = false,
  bootstrap,
  children,
}: {
  slug: string;
  sections: ExperienceSectionSnapshot[];
  branding: {
    heroCloudImageUrl: string;
    heroCloudVideoUrl: string | null;
    logoUrl?: string | null;
  };
  draftMode?: boolean;
  bootstrap: ExperienceBootstrap;
  children: ReactNode;
}) {
  const pageSlugs = useMemo(() => getExperiencePageSlugs(sections), [sections]);
  const initialSlug = bootstrap.initialPageSlug;

  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [direction, setDirection] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [mountedSlugs, setMountedSlugs] = useState<Set<string>>(() => new Set([initialSlug]));
  const [clientSnapshot, setClientSnapshot] = useState<ClientSnapshotView | null>(
    bootstrap.initialClientSnapshot ?? null
  );
  const [clientLoading, setClientLoading] = useState(false);
  const [aircraftParam, setAircraftParam] = useState<string | null>(
    bootstrap.aircraftParam ?? null
  );

  const clientFetchRef = useRef<Promise<ClientSnapshotView | null> | null>(null);
  const clientFetchGenerationRef = useRef(0);
  const prevIndexRef = useRef(pageSlugs.indexOf(initialSlug));
  const isTransitioningRef = useRef(false);

  const slideIndex = useMemo(() => {
    const index = pageSlugs.indexOf(activeSlug);
    return index >= 0 ? index : 0;
  }, [activeSlug, pageSlugs]);

  const withDraft = useCallback(
    (href: string) => withExperienceDraftQuery(href, draftMode),
    [draftMode]
  );

  const markSlugVisited = useCallback((pageSlug: string) => {
    setMountedSlugs((prev) => {
      if (prev.has(pageSlug)) return prev;
      const next = new Set(prev);
      next.add(pageSlug);
      return next;
    });
  }, []);

  const navigate = useCallback(
    (pageSlug: string, options?: { replace?: boolean }) => {
      if (!pageSlugs.includes(pageSlug) || pageSlug === activeSlug) return;

      const nextIndex = pageSlugs.indexOf(pageSlug);
      const prevIndex = pageSlugs.indexOf(activeSlug);
      setDirection(nextIndex >= prevIndex ? 1 : -1);
      prevIndexRef.current = nextIndex;

      markSlugVisited(pageSlug);
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setActiveSlug(pageSlug);

      if (typeof window === "undefined") return;

      const url = buildExperienceUrl(
        slug,
        pageSlug,
        draftMode,
        window.location.search
      );

      if (options?.replace) {
        window.history.replaceState({ pageSlug }, "", url);
      } else {
        window.history.pushState({ pageSlug }, "", url);
      }
    },
    [activeSlug, draftMode, markSlugVisited, pageSlugs, slug]
  );

  const goToAdjacentSlide = useCallback(
    (delta: number) => {
      const index = pageSlugs.indexOf(activeSlug);
      if (index < 0) return;
      const next = pageSlugs[index + delta];
      if (!next) return;
      navigate(next);
    },
    [activeSlug, navigate, pageSlugs]
  );

  const onTransitionComplete = useCallback(() => {
    if (!isTransitioningRef.current) return;
    isTransitioningRef.current = false;
    setIsTransitioning(false);
  }, []);

  useEffect(() => {
    function onPopState() {
      const slugFromUrl = parseExperienceSlug(window.location.pathname);
      if (!slugFromUrl || !pageSlugs.includes(slugFromUrl)) return;

      const nextIndex = pageSlugs.indexOf(slugFromUrl);
      const prevIndex = pageSlugs.indexOf(activeSlug);
      setDirection(nextIndex >= prevIndex ? 1 : -1);
      prevIndexRef.current = nextIndex;
      markSlugVisited(slugFromUrl);
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setActiveSlug(slugFromUrl);

      const params = new URLSearchParams(window.location.search);
      setAircraftParam(params.get("aircraft"));
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [activeSlug, markSlugVisited, pageSlugs]);

  /** Build pro forma from embedded snapshot (published portals — no API). */
  useEffect(() => {
    if (draftMode) return;
    const built = buildPublishedClientSnapshot(bootstrap.payload, aircraftParam);
    if (!built) return;
    setClientSnapshot(built);
    if (isProFormaSectionVisible(sections)) {
      markSlugVisited("pro-forma");
    }
  }, [aircraftParam, bootstrap.payload, draftMode, markSlugVisited, sections]);

  useEffect(() => {
    if (activeSlug !== "pro-forma") return;

    if (draftMode && bootstrap.initialClientSnapshot) {
      if (!clientSnapshot) {
        setClientSnapshot(bootstrap.initialClientSnapshot);
      }
      return;
    }

    if (clientSnapshot) return;

    const built = buildPublishedClientSnapshot(bootstrap.payload, aircraftParam);
    if (built) {
      setClientSnapshot(built);
      return;
    }

    if (clientFetchRef.current) return;

    const generation = ++clientFetchGenerationRef.current;
    setClientLoading(true);

    clientFetchRef.current = fetchClientSnapshotFromApi({
      slug,
      draftMode,
      proposalId: bootstrap.proposalId,
      aircraftParam,
      primaryAircraftInstanceId: bootstrap.payload.primaryAircraftInstanceId,
    })
      .catch(() => null)
      .finally(() => {
        if (generation === clientFetchGenerationRef.current) {
          setClientLoading(false);
        }
      });

    clientFetchRef.current.then((data) => {
      if (generation !== clientFetchGenerationRef.current) {
        clientFetchRef.current = null;
        return;
      }
      if (data) {
        setClientSnapshot(data);
      }
      clientFetchRef.current = null;
    });
  }, [
    activeSlug,
    aircraftParam,
    bootstrap.initialClientSnapshot,
    bootstrap.payload,
    bootstrap.proposalId,
    clientSnapshot,
    draftMode,
    slug,
  ]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") goToAdjacentSlide(1);
      if (e.key === "ArrowLeft") goToAdjacentSlide(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goToAdjacentSlide]);

  const tabHref = useCallback(
    (section: ExperienceSectionSnapshot) =>
      withDraft(experienceHref(slug, sectionNavSlug(section))),
    [slug, withDraft]
  );

  const isActive = useCallback(
    (section: ExperienceSectionSnapshot) => activeSlug === sectionNavSlug(section),
    [activeSlug]
  );

  const value = useMemo(
    (): ExperienceBootstrapContextValue => ({
      slug,
      sections,
      payload: bootstrap.payload,
      contactName: bootstrap.contactName,
      branding,
      draftMode,
      aircraftParam,
      pageSlugs,
      activeSlug,
      slideIndex,
      direction,
      navigate,
      goToAdjacentSlide,
      isTransitioning,
      onTransitionComplete,
      clientSnapshot,
      clientLoading,
      mountedSlugs,
      markSlugVisited,
      withDraft,
      tabHref,
      isActive,
      currentSlug: activeSlug,
    }),
    [
      slug,
      sections,
      bootstrap.payload,
      bootstrap.contactName,
      branding,
      draftMode,
      aircraftParam,
      pageSlugs,
      activeSlug,
      slideIndex,
      direction,
      navigate,
      goToAdjacentSlide,
      isTransitioning,
      onTransitionComplete,
      clientSnapshot,
      clientLoading,
      mountedSlugs,
      markSlugVisited,
      withDraft,
      tabHref,
      isActive,
    ]
  );

  return (
    <ExperienceBootstrapContext.Provider value={value}>
      {children}
    </ExperienceBootstrapContext.Provider>
  );
}

export function useExperienceBootstrap(): ExperienceBootstrapContextValue {
  const ctx = useContext(ExperienceBootstrapContext);
  if (!ctx) {
    throw new Error("useExperienceBootstrap must be used within ExperienceBootstrapProvider");
  }
  return ctx;
}

export function useExperienceBootstrapOptional(): ExperienceBootstrapContextValue | null {
  return useContext(ExperienceBootstrapContext);
}

export function useExperienceDeck() {
  return useExperienceBootstrap();
}

export function getBootstrapSection(
  sections: ExperienceSectionSnapshot[],
  pageSlug: string
): ExperienceSectionSnapshot | undefined {
  return getSectionBySlug(sections, pageSlug);
}
