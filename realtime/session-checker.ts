import type { Ws } from "./types";

export function startSessionChecker(opts: {
  socketsByUser: Map<string, Set<Ws>>;
  getSession: (sessionId: string) => Promise<unknown | null>;
  intervalMs?: number;
}) {
  const intervalMs = opts.intervalMs ?? 30_000;

  return setInterval(async () => {
    // Best-effort: close sockets whose session has been revoked/expired.
    for (const set of opts.socketsByUser.values()) {
      for (const ws of set) {
        try {
          const session = await opts.getSession(ws.data.sessionId);
          if (!session) {
            ws.close();
          }
        } catch {
          // ignore
        }
      }
    }
  }, intervalMs);
}
