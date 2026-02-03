"use client";

import { useEffect } from "react";

export function ClearNotesHistoryOnMount({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    try {
      window.localStorage.removeItem("madhouse-notes-undo");
      window.localStorage.removeItem("madhouse-notes-redo");
    } catch {
      // ignore
    }
  }, [enabled]);

  return null;
}
