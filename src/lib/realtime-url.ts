function normalizeWsUrl(input: string, origin: string) {
  try {
    const url = new URL(input, origin);

    if (url.protocol === "http:") url.protocol = "ws:";
    if (url.protocol === "https:") url.protocol = "wss:";

    if (url.protocol !== "ws:" && url.protocol !== "wss:") return null;

    if (url.pathname === "/") {
      url.pathname = "/ws";
    }

    return url.toString();
  } catch {
    return null;
  }
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

export function getRealtimeWsUrl() {
  if (typeof window === "undefined") return null;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const explicitUrl = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (explicitUrl) {
    return normalizeWsUrl(explicitUrl, window.location.origin);
  }

  const explicitPort = process.env.NEXT_PUBLIC_REALTIME_PORT?.trim();
  if (explicitPort) {
    return `${protocol}://${window.location.hostname}:${explicitPort}/ws`;
  }

  if (isLocalHost(window.location.hostname)) {
    return `${protocol}://${window.location.hostname}:8787/ws`;
  }

  return `${protocol}://${window.location.host}/ws`;
}
