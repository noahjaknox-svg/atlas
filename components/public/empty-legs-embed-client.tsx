"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EmptyLegVisibleFields } from "@/lib/charter/empty-legs/defaults";

type PublicItem = {
  placementId: string;
  emptyLegId: string;
  tripNumber: string;
  routeKey: string;
  depIcao: string;
  arrIcao: string;
  scheduledDepartureAt: string;
  slidingWindowStartAt: string | null;
  slidingWindowEndAt: string | null;
  isFeatured: boolean;
  tailNumber: string | null;
  aircraftType: string | null;
  seatCount: number | null;
  luggageNote: string | null;
  wifi: boolean;
  amenities: string[];
  description: string | null;
  primaryPhotoUrl: string | null;
  photoUrls: string[];
  pricing: {
    priceHidden: boolean;
    finalDisplayPrice: number | null;
    basePrice: number | null;
    discountApplied: number | null;
    displayDiscountMode: string;
  };
};

type Payload = {
  revoked?: boolean;
  message?: string;
  list?: { id: string; name: string; layoutStyle: string; token: string };
  promotionLabel?: string;
  consentText?: string;
  disclaimerText?: string;
  branding?: {
    logoUrl?: string | null;
    accentColor?: string | null;
    headerText?: string | null;
    buttonText?: string | null;
    footerText?: string | null;
    poweredByText?: string | null;
  };
  visibleFields?: EmptyLegVisibleFields;
  items?: PublicItem[];
};

function money(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function departureLabel(item: PublicItem) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  if (item.slidingWindowStartAt && item.slidingWindowEndAt) {
    return `${fmt(item.slidingWindowStartAt)} – ${fmt(item.slidingWindowEndAt)}`;
  }
  return fmt(item.scheduledDepartureAt);
}

export function EmptyLegsEmbedClient({ token }: { token: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dep, setDep] = useState("");
  const [arr, setArr] = useState("");
  const [date, setDate] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [offRouting, setOffRouting] = useState<PublicItem[]>([]);
  const [promptCustom, setPromptCustom] = useState(false);
  const [detail, setDetail] = useState<PublicItem | null>(null);
  const [requestFor, setRequestFor] = useState<{
    item: PublicItem | null;
    type: "direct_empty_leg" | "off_routing_empty_leg" | "custom_quote";
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const postHeight = useCallback(() => {
    if (!rootRef.current) return;
    const height = rootRef.current.scrollHeight;
    window.parent?.postMessage({ type: "atlas-empty-legs-resize", height, token }, "*");
  }, [token]);

  useEffect(() => {
    postHeight();
    const ro = new ResizeObserver(() => postHeight());
    if (rootRef.current) ro.observe(rootRef.current);
    return () => ro.disconnect();
  }, [postHeight, payload, items, detail, requestFor, searchMsg]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch(`/api/public/empty-legs/${token}`);
      const json = await res.json();
      setPayload(json);
      setItems(json.items ?? []);
      setLoading(false);
      if (json.status !== "revoked" && !json.revoked) {
        void fetch(`/api/public/empty-legs/${token}/list-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
      }
    })();
  }, [token]);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (dep) params.set("dep", dep);
    if (arr) params.set("arr", arr);
    if (date) params.set("date", date);
    const res = await fetch(`/api/public/empty-legs/${token}/search?${params}`);
    const json = await res.json();
    if (json.mode === "exact" || json.mode === "browse") {
      setItems(json.matches ?? []);
      setOffRouting([]);
      setPromptCustom(false);
      setSearchMsg(null);
    } else if (json.mode === "off_routing") {
      setItems([]);
      setOffRouting(json.offRoutingCandidates ?? []);
      setPromptCustom(false);
      setSearchMsg("No exact match. Related empty legs may work with off-routing.");
    } else {
      setItems([]);
      setOffRouting([]);
      setPromptCustom(true);
      setSearchMsg("No empty legs matched. Request a custom quote.");
    }
  }

  async function openDetail(item: PublicItem) {
    setDetail(item);
    await fetch(`/api/public/empty-legs/${token}/detail-open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emptyLegId: item.emptyLegId, placementId: item.placementId }),
    });
  }

  const accent = payload?.branding?.accentColor || "#1d4ed8";
  const vf = payload?.visibleFields;
  const layout = payload?.list?.layoutStyle ?? "card_grid";

  if (loading) {
    return (
      <div ref={rootRef} className="p-6 text-sm text-slate-600">
        Loading empty legs…
      </div>
    );
  }

  if (payload?.revoked) {
    return (
      <div ref={rootRef} className="p-8 text-center text-slate-700">
        <p className="text-lg font-medium">
          {payload.message ?? "This empty leg list is no longer available."}
        </p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="min-h-[200px] bg-white p-4 text-slate-900 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {payload?.branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={payload.branding.logoUrl} alt="" className="h-8 w-auto" />
        ) : null}
        <h1 className="text-xl font-semibold tracking-tight">
          {payload?.branding?.headerText || payload?.list?.name || "Empty Legs"}
        </h1>
      </div>

      <form
        onSubmit={runSearch}
        className="mb-6 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center"
      >
        <input
          value={dep}
          onChange={(e) => setDep(e.target.value)}
          placeholder="From (airport or city)"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
        />
        <input
          value={arr}
          onChange={(e) => setArr(e.target.value)}
          placeholder="To (airport or city)"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-400 sm:w-40"
        />
        <button
          type="submit"
          className="h-10 shrink-0 rounded-lg px-5 text-sm font-medium text-white"
          style={{ backgroundColor: accent }}
        >
          Search
        </button>
      </form>

      {searchMsg && <p className="mb-4 text-sm text-slate-600">{searchMsg}</p>}

      {promptCustom && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-700">Need a trip that isn’t listed?</p>
          <button
            type="button"
            className="h-10 shrink-0 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
            onClick={() =>
              setRequestFor({ item: null, type: "custom_quote" })
            }
          >
            Request custom quote
          </button>
        </div>
      )}

      {offRouting.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium">Off-routing options</p>
          <ItemGrid
            items={offRouting}
            layout={layout}
            vf={vf}
            promotionLabel={payload?.promotionLabel}
            accent={accent}
            buttonText={payload?.branding?.buttonText}
            onOpen={openDetail}
            onRequest={(item) =>
              setRequestFor({ item, type: "off_routing_empty_leg" })
            }
          />
        </div>
      )}

      <ItemGrid
        items={items}
        layout={layout}
        vf={vf}
        promotionLabel={payload?.promotionLabel}
        accent={accent}
        buttonText={payload?.branding?.buttonText}
        onOpen={openDetail}
        onRequest={(item) => setRequestFor({ item, type: "direct_empty_leg" })}
      />

      {payload?.branding?.footerText || payload?.branding?.poweredByText ? (
        <p className="mt-6 text-center text-xs text-slate-500">
          {payload.branding.footerText}
          {payload.branding.poweredByText
            ? ` · ${payload.branding.poweredByText}`
            : ""}
        </p>
      ) : null}

      {detail && (
        <DetailModal
          item={detail}
          vf={vf}
          disclaimer={payload?.disclaimerText}
          accent={accent}
          buttonText={payload?.branding?.buttonText}
          promotionLabel={payload?.promotionLabel}
          onClose={() => setDetail(null)}
          onRequest={() => {
            setRequestFor({ item: detail, type: "direct_empty_leg" });
            setDetail(null);
          }}
        />
      )}

      {requestFor && (
        <RequestModal
          token={token}
          accent={accent}
          consentText={payload?.consentText ?? ""}
          disclaimer={payload?.disclaimerText ?? ""}
          item={requestFor.item}
          requestType={requestFor.type}
          requestedDep={dep}
          requestedArr={arr}
          requestedDate={date}
          onClose={() => setRequestFor(null)}
        />
      )}
    </div>
  );
}

function ItemGrid({
  items,
  layout,
  vf,
  promotionLabel,
  accent,
  buttonText,
  onOpen,
  onRequest,
}: {
  items: PublicItem[];
  layout: string;
  vf?: EmptyLegVisibleFields;
  promotionLabel?: string;
  accent: string;
  buttonText?: string | null;
  onOpen: (item: PublicItem) => void;
  onRequest: (item: PublicItem) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No empty legs to show.</p>;
  }

  if (layout === "compact_list") {
    return (
      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
        {items.map((item) => (
          <li
            key={item.placementId}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onOpen(item)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {vf?.aircraftType !== false
                    ? (item.aircraftType ?? "Aircraft")
                    : "Empty leg"}
                </span>
                {item.isFeatured ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    {promotionLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {vf?.route !== false ? (
                  <span className="font-medium text-slate-800">
                    {item.depIcao} → {item.arrIcao}
                  </span>
                ) : null}
                {vf?.departure !== false ? (
                  <span className="block text-xs text-slate-500 sm:mt-0.5">
                    {departureLabel(item)}
                  </span>
                ) : null}
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-3 sm:justify-end">
              {vf?.price !== false && !item.pricing.priceHidden && (
                <span className="min-w-[4.5rem] text-right text-sm font-semibold tabular-nums">
                  {money(item.pricing.finalDisplayPrice) ?? "—"}
                </span>
              )}
              {vf?.requestButton !== false && (
                <button
                  type="button"
                  className="h-9 rounded-lg px-4 text-sm font-medium text-white"
                  style={{ backgroundColor: accent }}
                  onClick={() => onRequest(item)}
                >
                  {buttonText || "Request"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.placementId}
          className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          <button
            type="button"
            className="flex min-h-0 flex-1 flex-col text-left"
            onClick={() => onOpen(item)}
          >
            {vf?.aircraftPhoto !== false && item.primaryPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.primaryPhotoUrl}
                alt=""
                className="h-36 w-full shrink-0 object-cover"
              />
            ) : (
              <div className="flex h-24 shrink-0 items-center justify-center bg-slate-100 text-sm text-slate-500">
                {item.aircraftType ?? "Aircraft"}
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              {item.isFeatured ? (
                <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                  {promotionLabel}
                </p>
              ) : null}
              {vf?.aircraftType !== false ? (
                <h2 className="text-base font-semibold leading-snug">
                  {item.aircraftType ?? "Aircraft"}
                </h2>
              ) : null}
              {vf?.tailNumber && item.tailNumber ? (
                <p className="font-mono text-xs text-slate-500">{item.tailNumber}</p>
              ) : null}
              {vf?.route !== false ? (
                <p className="text-sm font-medium text-slate-800">
                  {item.depIcao} → {item.arrIcao}
                </p>
              ) : null}
              {vf?.departure !== false ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  {departureLabel(item)}
                </p>
              ) : null}
              {vf?.seats !== false && item.seatCount != null ? (
                <p className="text-xs text-slate-500">{item.seatCount} seats</p>
              ) : null}
              <div className="mt-auto pt-3">
                {vf?.price !== false && !item.pricing.priceHidden ? (
                  <p className="text-lg font-semibold tabular-nums">
                    {item.pricing.displayDiscountMode === "show_both" &&
                    item.pricing.basePrice != null &&
                    item.pricing.discountApplied ? (
                      <>
                        <span className="mr-2 text-sm font-normal text-slate-400 line-through">
                          {money(item.pricing.basePrice)}
                        </span>
                        {money(item.pricing.finalDisplayPrice)}
                      </>
                    ) : (
                      (money(item.pricing.finalDisplayPrice) ?? "—")
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">Price on request</p>
                )}
              </div>
            </div>
          </button>
          {vf?.requestButton !== false ? (
            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                className="h-10 w-full rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: accent }}
                onClick={() => onRequest(item)}
              >
                {buttonText || "Request"}
              </button>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function DetailModal({
  item,
  vf,
  disclaimer,
  accent,
  buttonText,
  promotionLabel,
  onClose,
  onRequest,
}: {
  item: PublicItem;
  vf?: EmptyLegVisibleFields;
  disclaimer?: string;
  accent: string;
  buttonText?: string | null;
  promotionLabel?: string;
  onClose: () => void;
  onRequest: () => void;
}) {
  const photos = [
    ...(item.primaryPhotoUrl ? [item.primaryPhotoUrl] : []),
    ...item.photoUrls.filter((u) => u !== item.primaryPhotoUrl),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {item.isFeatured && (
              <p className="text-xs font-medium text-amber-700">{promotionLabel}</p>
            )}
            <h2 className="text-lg font-semibold">{item.aircraftType ?? "Empty leg"}</h2>
          </div>
          <button type="button" className="text-sm text-slate-500" onClick={onClose}>
            Close
          </button>
        </div>
        {vf?.aircraftPhoto !== false && photos.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-28 w-full rounded object-cover" />
            ))}
          </div>
        )}
        <dl className="space-y-1 text-sm">
          {vf?.route !== false && (
            <div>
              <dt className="text-slate-500">Route</dt>
              <dd>
                {item.depIcao} → {item.arrIcao}
              </dd>
            </div>
          )}
          {vf?.departure !== false && (
            <div>
              <dt className="text-slate-500">Departure</dt>
              <dd>{departureLabel(item)}</dd>
            </div>
          )}
          {vf?.tailNumber && item.tailNumber && (
            <div>
              <dt className="text-slate-500">Tail</dt>
              <dd className="font-mono">{item.tailNumber}</dd>
            </div>
          )}
          {vf?.seats !== false && item.seatCount != null && (
            <div>
              <dt className="text-slate-500">Seats</dt>
              <dd>{item.seatCount}</dd>
            </div>
          )}
          {vf?.wifi && <div>Wi-Fi: {item.wifi ? "Yes" : "No"}</div>}
          {vf?.luggageNote && item.luggageNote && <div>Luggage: {item.luggageNote}</div>}
          {vf?.amenities && item.amenities.length > 0 && (
            <div>Amenities: {item.amenities.join(", ")}</div>
          )}
          {vf?.description && item.description && <p className="pt-2">{item.description}</p>}
          {vf?.price !== false && !item.pricing.priceHidden && (
            <div className="pt-2 font-semibold">{money(item.pricing.finalDisplayPrice)}</div>
          )}
        </dl>
        {disclaimer && <p className="mt-3 text-xs text-slate-500">{disclaimer}</p>}
        {vf?.requestButton !== false && (
          <button
            type="button"
            className="mt-4 w-full rounded px-3 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
            onClick={onRequest}
          >
            {buttonText || "Request"}
          </button>
        )}
      </div>
    </div>
  );
}

function RequestModal({
  token,
  accent,
  consentText,
  disclaimer,
  item,
  requestType,
  requestedDep,
  requestedArr,
  requestedDate,
  onClose,
}: {
  token: string;
  accent: string;
  consentText: string;
  disclaimer: string;
  item: PublicItem | null;
  requestType: "direct_empty_leg" | "off_routing_empty_leg" | "custom_quote";
  requestedDep: string;
  requestedArr: string;
  requestedDate: string;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [customDep, setCustomDep] = useState(requestedDep);
  const [customArr, setCustomArr] = useState(requestedArr);
  const [customDate, setCustomDate] = useState(requestedDate);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/public/empty-legs/${token}/submit-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        notes,
        consentAccepted: consent,
        companyWebsite: honeypot,
        requestType,
        emptyLegId: item?.emptyLegId ?? null,
        placementId: item?.placementId ?? null,
        requestedDep: customDep || item?.depIcao || null,
        requestedArr: customArr || item?.arrIcao || null,
        requestedDate: customDate || null,
        requestedSearchJson: { dep: customDep, arr: customArr, date: customDate },
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Submission failed");
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Request</h2>
          <button type="button" className="text-sm text-slate-500" onClick={onClose}>
            Close
          </button>
        </div>
        {done ? (
          <p className="text-sm text-slate-700">Thanks — we received your request.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {item && (
              <div className="rounded border border-slate-200 bg-slate-50 p-2 text-sm">
                <p className="font-medium">{item.aircraftType}</p>
                <p>
                  {item.depIcao} → {item.arrIcao}
                </p>
              </div>
            )}
            {(requestType === "custom_quote" || requestType === "off_routing_empty_leg") && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customDep}
                  onChange={(e) => setCustomDep(e.target.value)}
                  placeholder="From"
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={customArr}
                  onChange={(e) => setCustomArr(e.target.value)}
                  placeholder="To"
                  className="rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="col-span-2 rounded border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
              aria-hidden
            />
            {disclaimer && <p className="text-xs text-slate-500">{disclaimer}</p>}
            <label className="flex items-start gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>{consentText}</span>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !consent}
              className="w-full rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: accent }}
            >
              {submitting ? "Sending…" : "Submit request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
