export const NOTES_EDITOR_SHORTCUTS_STORAGE_KEY =
  "madhouse-notes-editor-shortcuts";

export const NOTES_EDITOR_ACTIONS = ["save", "bold", "italic", "link"] as const;

export type NotesEditorAction = (typeof NOTES_EDITOR_ACTIONS)[number];

export type NotesEditorShortcut = string;

export type NotesEditorShortcutMap = Record<
  NotesEditorAction,
  NotesEditorShortcut
>;

export type NotesEditorShortcutError =
  | "empty"
  | "missing_mod"
  | "reserved"
  | "duplicate"
  | "invalid";

export const DEFAULT_NOTES_EDITOR_SHORTCUTS = {
  save: "Mod+S",
  bold: "Mod+B",
  italic: "Mod+I",
  link: "Mod+K",
} as const satisfies NotesEditorShortcutMap;

const reservedModKeys = new Set(["R", "W", "T", "N"]);
const modifierKeySet = new Set(["Shift", "Alt", "Control", "Meta"]);

function normalizeShortcutKey(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (value.length === 1 && /^[a-z0-9]$/i.test(value)) {
    return value.toUpperCase();
  }

  return null;
}

export function normalizeNotesEditorShortcutString(
  raw: string,
): NotesEditorShortcut | null {
  const input = raw.trim();
  if (!input) return null;

  const parts = input
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  let hasMod = false;
  let shift = false;
  let alt = false;
  const keys: string[] = [];

  for (const part of parts) {
    const token = part.toLowerCase();
    if (token === "mod") {
      hasMod = true;
      continue;
    }
    if (token === "shift") {
      shift = true;
      continue;
    }
    if (token === "alt" || token === "option") {
      alt = true;
      continue;
    }
    keys.push(part);
  }

  if (!hasMod) return null;
  if (keys.length !== 1) return null;

  const key = normalizeShortcutKey(keys[0] ?? "");
  if (!key) return null;

  let shortcut = "Mod";
  if (shift) shortcut += "+Shift";
  if (alt) shortcut += "+Alt";
  shortcut += `+${key}`;
  return shortcut;
}

export function isReservedNotesEditorShortcut(shortcut: string): boolean {
  const normalized = normalizeNotesEditorShortcutString(shortcut);
  if (!normalized) return false;

  const parts = normalized.split("+");
  if (!parts.includes("Mod")) return false;

  const key = parts.at(-1);
  if (!key) return false;

  return reservedModKeys.has(key.toUpperCase());
}

export function isDuplicateNotesEditorShortcut(
  action: NotesEditorAction,
  shortcut: string,
  map: NotesEditorShortcutMap,
): boolean {
  for (const other of NOTES_EDITOR_ACTIONS) {
    if (other === action) continue;
    if (map[other] === shortcut) return true;
  }
  return false;
}

export function getModLabel(isMacPlatform: boolean): string {
  return isMacPlatform ? "Cmd" : "Ctrl";
}

export function formatNotesEditorShortcut(
  shortcut: string,
  isMacPlatform: boolean,
): string {
  const normalized = normalizeNotesEditorShortcutString(shortcut);
  if (!normalized) return shortcut;

  const parts = normalized.split("+");
  const key = parts.at(-1);
  if (!key) return shortcut;

  const tokens: string[] = [];
  tokens.push(getModLabel(isMacPlatform));
  if (parts.includes("Shift")) tokens.push("Shift");
  if (parts.includes("Alt")) tokens.push(isMacPlatform ? "Option" : "Alt");
  tokens.push(key);

  return tokens.join("+");
}

export function formatNotesEditorShortcutForUi(shortcut: string): string {
  const normalized = normalizeNotesEditorShortcutString(shortcut);
  if (!normalized) return shortcut;

  const parts = normalized.split("+");
  const key = parts.at(-1);
  if (!key) return shortcut;

  const tokens: string[] = [];
  tokens.push("Ctrl/Cmd");
  if (parts.includes("Shift")) tokens.push("Shift");
  if (parts.includes("Alt")) tokens.push("Alt/Option");
  tokens.push(key);

  return tokens.join("+");
}

export function buildNotesEditorShortcutFromKeyEvent(
  event: {
    key: string;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  },
  isMacPlatform: boolean,
):
  | { ok: true; shortcut: NotesEditorShortcut }
  | { ok: false; error: NotesEditorShortcutError } {
  if (!event.key) return { ok: false, error: "invalid" };
  if (modifierKeySet.has(event.key)) return { ok: false, error: "invalid" };

  const modPressed = isMacPlatform ? event.metaKey : event.ctrlKey;
  if (!modPressed) return { ok: false, error: "missing_mod" };

  const key = normalizeShortcutKey(event.key);
  if (!key) return { ok: false, error: "invalid" };

  let shortcut = "Mod";
  if (event.shiftKey) shortcut += "+Shift";
  if (event.altKey) shortcut += "+Alt";
  shortcut += `+${key}`;

  if (isReservedNotesEditorShortcut(shortcut)) {
    return { ok: false, error: "reserved" };
  }

  return { ok: true, shortcut };
}

export function normalizeNotesEditorShortcutMap(
  raw: unknown,
): NotesEditorShortcutMap {
  const fallback: NotesEditorShortcutMap = {
    ...DEFAULT_NOTES_EDITOR_SHORTCUTS,
  };
  if (!raw || typeof raw !== "object") return fallback;

  const record = raw as Record<string, unknown>;
  const next: NotesEditorShortcutMap = { ...fallback };
  const used = new Set<string>();

  for (const action of NOTES_EDITOR_ACTIONS) {
    const value = record[action];
    if (typeof value !== "string") {
      used.add(next[action]);
      continue;
    }

    const normalized = normalizeNotesEditorShortcutString(value);
    if (!normalized) {
      used.add(next[action]);
      continue;
    }

    if (isReservedNotesEditorShortcut(normalized)) {
      used.add(next[action]);
      continue;
    }

    if (used.has(normalized)) {
      used.add(next[action]);
      continue;
    }

    next[action] = normalized;
    used.add(normalized);
  }

  return next;
}

function safeParseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function readNotesEditorShortcutMapFromLocalStorage():
  | { ok: true; shortcuts: NotesEditorShortcutMap }
  | { ok: false; error: "unavailable" } {
  if (typeof window === "undefined") {
    return { ok: false, error: "unavailable" };
  }

  try {
    const raw = safeParseJson(
      window.localStorage.getItem(NOTES_EDITOR_SHORTCUTS_STORAGE_KEY),
    );
    return { ok: true, shortcuts: normalizeNotesEditorShortcutMap(raw) };
  } catch {
    return { ok: true, shortcuts: { ...DEFAULT_NOTES_EDITOR_SHORTCUTS } };
  }
}

export function writeNotesEditorShortcutMapToLocalStorage(
  shortcuts: NotesEditorShortcutMap,
): boolean {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(
      NOTES_EDITOR_SHORTCUTS_STORAGE_KEY,
      JSON.stringify(shortcuts),
    );
    return true;
  } catch {
    return false;
  }
}
