export type NotesBoardOrder = {
  pinned: string[];
  other: string[];
};

export function toUniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    if (seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
  }

  return ids;
}

export function mergeNoteOrderIds(
  savedIds: readonly string[],
  currentIds: readonly string[],
): string[] {
  const currentSet = new Set(currentIds);

  const seen = new Set<string>();
  const keptSavedIds: string[] = [];

  for (const id of savedIds) {
    if (!currentSet.has(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    keptSavedIds.push(id);
  }

  const missingIds: string[] = [];

  for (const id of currentIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    missingIds.push(id);
  }

  return [...missingIds, ...keptSavedIds];
}

export function arrayMove<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(to, 0, item);
  return next;
}
