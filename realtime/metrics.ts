import type { Ws } from "./types";

export function getRealtimeMetrics(socketsByUser: Map<string, Set<Ws>>) {
  let connectionsTotal = 0;
  let usersConnected = 0;
  for (const set of socketsByUser.values()) {
    if (set.size === 0) continue;
    usersConnected += 1;
    const sessions = new Set<string>();
    for (const ws of set) sessions.add(ws.data.sessionId);
    connectionsTotal += sessions.size;
  }

  return {
    connectionsTotal,
    usersConnected,
  };
}
