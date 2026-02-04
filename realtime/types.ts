import type { ServerWebSocket } from "bun";

export type SessionRow = {
  id: string;
  username: string;
  expires_at: string;
};

export type PublishBody = {
  username: string;
  event: unknown;
};

export type WsData = {
  username: string;
  sessionId: string;
  connectionId: string;
};
export type Ws = ServerWebSocket<WsData>;
