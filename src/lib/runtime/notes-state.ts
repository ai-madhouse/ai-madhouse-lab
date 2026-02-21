import { atom } from "jotai";

import type { NoteSnapshot, NotesEvent } from "@/lib/notes-e2ee/model";

export const notesCsrfTokenAtom = atom("");
export const notesDekKeyAtom = atom<CryptoKey | null>(null);
export const notesListAtom = atom<NoteSnapshot[]>([]);
export const notesEventsAtom = atom<NotesEvent[]>([]);
export const notesCanUndoAtom = atom(false);
export const notesCanRedoAtom = atom(false);
export const notesUndoTargetEventIdAtom = atom<string | null>(null);
export const notesRedoTargetEventIdAtom = atom<string | null>(null);
export const notesLoadingAtom = atom(false);
export const notesErrorAtom = atom<string | null>(null);
