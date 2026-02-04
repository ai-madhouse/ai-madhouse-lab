import type { Ws } from "./types";

export function getRealtimeMetrics(socketsByUser: Map<string, Set<Ws>>) {
  let connectionsTotal = 0;
  for (const set of socketsByUser.values()) connectionsTotal += set.size;

  return {
    connectionsTotal,
    usersConnected: socketsByUser.size,
  };
}
