/**
 * The name a downloaded statement is saved under. The server suggests one in its headers; it is
 * used only when it is a plain "name.pdf", so nothing a response says can point the write
 * outside the cache folder.
 */
export function statementFilename(suggested: string | null | undefined, year: number): string {
  return suggested && /^[a-z0-9][a-z0-9-]{0,80}\.pdf$/.test(suggested) ? suggested : `pugbuild-earnings-${year}.pdf`;
}

/** "2026" from the Year view's pager; anything else is not a year we can export. */
export function statementYear(at: string | undefined): number | null {
  return at && /^\d{4}$/.test(at) ? Number(at) : null;
}
