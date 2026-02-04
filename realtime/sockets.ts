import type { Ws } from "./types";

export const socketsByUser = new Map<string, Set<Ws>>();

export function addSocket(username: string, ws: Ws) {
  const set = socketsByUser.get(username) ?? new Set<Ws>();
  set.add(ws);
  socketsByUser.set(username, set);
}

export function removeSocket(username: string, ws: Ws) {
  const set = socketsByUser.get(username);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) socketsByUser.delete(username);
}

export function broadcast(username: string, payload: unknown) {
  const set = socketsByUser.get(username);
  if (!set) return;
  const message = JSON.stringify(payload);
  for (const ws of set) {
    try {
      ws.send(message);
    } catch {
      // ignore
    }
  }
}
