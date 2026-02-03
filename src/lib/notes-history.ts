export type NoteSnapshot = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export type NotesAction =
  | { kind: "create"; note: NoteSnapshot }
  | { kind: "delete"; note: NoteSnapshot }
  | { kind: "update"; before: NoteSnapshot; after: NoteSnapshot };

export function pushUndo(
  undo: NotesAction[],
  action: NotesAction,
  max = 100,
): NotesAction[] {
  const next = [...undo, action];
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}

export function popLast<T>(arr: T[]): { item: T | null; rest: T[] } {
  if (arr.length === 0) return { item: null, rest: arr };
  const rest = arr.slice(0, -1);
  const item = arr[arr.length - 1] ?? null;
  return { item, rest };
}
