export type MigrateSelection = { kind: "all" } | { kind: "selected"; ids: string[] };

/**
 * Interpret the raw `ids` form value. A blank value means "move everything";
 * any present value is a JSON array of entry ids and must be non-empty to be
 * a valid selection.
 */
export function resolveMigrateSelection(idsRaw: string): MigrateSelection {
  if (!idsRaw) {
    return { kind: "all" };
  }
  try {
    const parsed = JSON.parse(idsRaw);
    if (!Array.isArray(parsed)) {
      return { kind: "selected", ids: [] };
    }
    return { kind: "selected", ids: parsed.map((id) => (id == null ? "" : String(id))).filter(Boolean) };
  } catch {
    return { kind: "selected", ids: [] };
  }
}