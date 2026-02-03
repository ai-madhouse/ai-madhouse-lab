type RealtimePublishBody = {
  username: string;
  event: unknown;
};

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export async function publishRealtimeEvent({
  username,
  event,
}: {
  username: string;
  event: unknown;
}) {
  if (getEnv("REALTIME_DISABLED") === "1") return;

  const baseUrl = getEnv("REALTIME_URL") || "http://127.0.0.1:8787";
  const secret = getEnv("REALTIME_SECRET") || "dev-realtime-secret";

  const body: RealtimePublishBody = { username, event };

  await fetch(`${baseUrl}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-realtime-secret": secret,
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // best-effort
  });
}
