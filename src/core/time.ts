// Returns ISO 8601 UTC timestamp ending with "Z" — see CLAUDE.md §4.3.
export const nowIsoUtc = (): string => new Date().toISOString();

// Validate helper used in tests and parsers.
export const isIsoUtcZ = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(s);
