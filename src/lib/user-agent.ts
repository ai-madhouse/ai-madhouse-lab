export function describeUserAgent(userAgent: string | null | undefined) {
  const ua = (userAgent ?? "").toLowerCase();

  const os = (() => {
    if (ua.includes("windows nt")) return "Windows";
    if (ua.includes("android")) return "Android";
    if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
    if (ua.includes("mac os x") || ua.includes("macintosh")) return "macOS";
    if (ua.includes("linux")) return "Linux";
    return "Unknown OS";
  })();

  const browser = (() => {
    if (ua.includes("edg/")) return "Edge";
    if (ua.includes("firefox/")) return "Firefox";
    if (ua.includes("chrome/") && !ua.includes("edg/") && !ua.includes("opr/"))
      return "Chrome";
    if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
    if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
    return "Unknown browser";
  })();

  return { os, browser };
}
