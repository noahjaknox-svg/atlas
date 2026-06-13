/** User-provided JetInsight VEVENT examples for classification tests. */
export const FIXTURE_EVENTS = {
  ownerFlight: `BEGIN:VEVENT
DTSTAMP:20260608T200453Z
UID:c7a32ac6993248f0aa1b6bc69e17e4ac
DTSTART:20260609T163000Z
DTEND:20260609T190000Z
DESCRIPTION:Pax: 4\\n6/4 Times are accurate\\nPIC: Keith Michael Tully\\nSIC: Nicholas Roger Fournier\\n
LOCATION:IWA
SUMMARY:[N951NB] Earnhardt (IWA - COE) - Owner flight
URL;VALUE=URI:https://portal.jetinsight.com/trips/R7Y34T
END:VEVENT`,

  positioningFlight: `BEGIN:VEVENT
DTSTAMP:20260608T200453Z
UID:b3f62feba7374889854ee8d620e58153
DTSTART:20260609T193100Z
DTEND:20260609T215500Z
DESCRIPTION:Pax: 0\\nPIC: Michael Henry Keys\\nSIC: Jonathan Muncy\\n
LOCATION:SDL
SUMMARY:[N365AV] AvAir (SDL - COE) - Positioning flight
URL;VALUE=URI:https://portal.jetinsight.com/trips/K5E6JC
END:VEVENT`,

  charterFlight: `BEGIN:VEVENT
DTSTAMP:20260608T200453Z
UID:1ffa5c2cd50b40478623b553215f075a
DTSTART:20260609T210000Z
DTEND:20260609T234200Z
DESCRIPTION:Pax: 4\\nPIC: Trevor Blayne Clark\\nSIC: Ian Robert Crouse\\nCabin crew: Katelyn Mariah Sheffield\\n
LOCATION:OPF
SUMMARY:[N370EL] MPJets (OPF - AUS) - Charter flight
URL;VALUE=URI:https://portal.jetinsight.com/trips/0ZMIN2
END:VEVENT`,

  adminBlock: `BEGIN:VEVENT
DTSTAMP:20260608T200453Z
UID:69ad00539d754419a1d2ccf5193f7a67
DTSTART:20260610T070000Z
DTEND:20260611T065900Z
DESCRIPTION:Pax: 0\\n
LOCATION:SDL
SUMMARY:[N1213P] DONT QUOTE PER CASEY (SDL - SDL) - Other
URL;VALUE=URI:https://portal.jetinsight.com/schedule/aircraft
END:VEVENT`,

  softHold: `BEGIN:VEVENT
DTSTAMP:20260608T200453Z
UID:f4367a981726426993ca92ada2537f3d
DTSTART:20260611T070000Z
DTEND:20260616T065900Z
DESCRIPTION:Pax: 0\\n
LOCATION:SDL
SUMMARY:HOLD: [N698RS] Very Minimal Crew (SDL - SDL) - Other
URL;VALUE=URI:https://portal.jetinsight.com/schedule/aircraft
END:VEVENT`,
} as const;

export function wrapIcsCalendar(...events: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:Atlas-test",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
