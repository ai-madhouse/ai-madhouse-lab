import path from "node:path";

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export const REALTIME_PORT = Number(getEnv("REALTIME_PORT") || "8787");
export const REALTIME_SECRET =
  getEnv("REALTIME_SECRET") || "dev-realtime-secret";
const configuredDbPath = getEnv("DB_PATH");
export const DB_PATH = path.resolve(
  configuredDbPath || path.join(process.cwd(), "data", "app.db"),
);

export { getEnv };
