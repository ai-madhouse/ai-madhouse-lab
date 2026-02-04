import { publishRealtimeEvent } from "@/lib/realtime-client";
import { deleteSession } from "@/lib/sessions";

export type SessionsChangedEvent = { type: "sessions:changed" };

type Deps = {
  deleteSession: (sessionId: string) => Promise<void>;
  publishRealtimeEvent: (args: {
    username: string;
    event: unknown;
  }) => Promise<void>;
};

function resolveDeps(deps?: Partial<Deps>): Deps {
  return {
    deleteSession: deps?.deleteSession ?? deleteSession,
    publishRealtimeEvent: deps?.publishRealtimeEvent ?? publishRealtimeEvent,
  };
}

export function sessionsChangedEvent(): SessionsChangedEvent {
  return { type: "sessions:changed" };
}

export async function notifySessionsChanged({
  username,
  deps,
}: {
  username: string;
  deps?: Partial<Deps>;
}) {
  const resolved = resolveDeps(deps);
  await resolved.publishRealtimeEvent({
    username,
    event: sessionsChangedEvent(),
  });
}

export async function revokeSessionAndNotify({
  username,
  sessionId,
  deps,
}: {
  username: string;
  sessionId: string;
  deps?: Partial<Deps>;
}) {
  const resolved = resolveDeps(deps);
  await resolved.deleteSession(sessionId);
  await notifySessionsChanged({ username, deps });
}
