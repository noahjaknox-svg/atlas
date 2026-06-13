export function runwayDesignator(le: string | null, he: string | null): string | null {
  if (le && he) return `${le}/${he}`;
  return le ?? he ?? null;
}
