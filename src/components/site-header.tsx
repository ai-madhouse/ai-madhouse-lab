"use client";

import { Toolbar } from "@/components/toolbar";

export function SiteHeader({ isAuthed = false }: { isAuthed?: boolean }) {
  return <Toolbar isAuthed={isAuthed} />;
}
