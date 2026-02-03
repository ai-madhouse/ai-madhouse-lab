export function getRealtimeWsUrl() {
  const port = process.env.NEXT_PUBLIC_REALTIME_PORT || "8787";
  if (typeof window === "undefined") return null;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;

  return `${protocol}://${host}:${port}/ws`;
}
