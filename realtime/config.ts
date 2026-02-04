function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export const REALTIME_PORT = Number(getEnv("REALTIME_PORT") || "8787");
export const REALTIME_SECRET =
  getEnv("REALTIME_SECRET") || "dev-realtime-secret";
export const DB_PATH = getEnv("DB_PATH") || "data/app.db";

export { getEnv };
