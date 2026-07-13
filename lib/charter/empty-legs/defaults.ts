export type EmptyLegVisibleFields = {
  aircraftType: boolean;
  tailNumber: boolean;
  route: boolean;
  departure: boolean;
  price: boolean;
  seats: boolean;
  requestButton: boolean;
  aircraftPhoto: boolean;
  amenities: boolean;
  luggageNote: boolean;
  wifi: boolean;
  description: boolean;
};

export const DEFAULT_VISIBLE_FIELDS: EmptyLegVisibleFields = {
  aircraftType: true,
  tailNumber: false,
  route: true,
  departure: true,
  price: true,
  seats: true,
  requestButton: true,
  aircraftPhoto: true,
  amenities: false,
  luggageNote: false,
  wifi: false,
  description: false,
};

export const DEFAULT_CONSENT_TEXT =
  "I agree to be contacted about this empty leg request and understand my information will be used to provide a quote.";

export const DEFAULT_DISCLAIMER_TEXT =
  "Empty leg availability and pricing are subject to change without notice. Final quotes require operator confirmation.";

export const DEFAULT_INTERNAL_EMAIL_TEMPLATE = `<h2>New empty leg lead</h2>
<p><strong>{{fullName}}</strong> ({{email}} / {{phone}})</p>
<p>Request type: {{requestType}}</p>
<p>Requested route: {{requestedRoute}}</p>
<p>Requested date: {{requestedDate}}</p>
<p>Matched empty leg: {{matchedEmptyLeg}}</p>
<p>Source list: {{sourceList}}</p>
<p>Notes: {{notes}}</p>
<p>Assigned: {{assignedRepresentative}}</p>
<p><a href="{{leadUrl}}">Open in Atlas</a></p>`;

export const DEFAULT_CUSTOMER_EMAIL_TEMPLATE = `<p>Hi {{firstName}},</p>
<p>Thanks for your interest in our empty leg from {{route}}.</p>
<p>A PrismJet representative will follow up shortly.</p>
<p>— PrismJet Charter</p>`;

export type EmptyLegBranding = {
  logoUrl?: string | null;
  accentColor?: string | null;
  headerText?: string | null;
  buttonText?: string | null;
  footerText?: string | null;
  poweredByText?: string | null;
};

export function mergeVisibleFields(
  overrides?: Partial<EmptyLegVisibleFields> | null
): EmptyLegVisibleFields {
  return { ...DEFAULT_VISIBLE_FIELDS, ...(overrides ?? {}) };
}
