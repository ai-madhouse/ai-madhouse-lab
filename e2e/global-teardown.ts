import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import type { FullConfig } from "@playwright/test";

const execFileAsync = promisify(execFile);

function isE2eTmpDir(input: string) {
  const normalized = path.normalize(input);
  return normalized.includes(`${path.sep}tmp${path.sep}e2e${path.sep}`);
}

function parsePort(raw: string | undefined, fallback: number) {
  const parsed = Number(raw?.trim() || "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function uniqueNumbers(values: number[]) {
  return [
    ...new Set(values.filter((value) => Number.isFinite(value) && value > 0)),
  ];
}

function tryParsePid(raw: string) {
  const pid = Number(raw.trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function extractAddressPort(localAddress: string) {
  const separatorIndex = localAddress.lastIndexOf(":");
  if (separatorIndex < 0) return null;
  const portText = localAddress.slice(separatorIndex + 1);
  const port = Number(portText);
  return Number.isInteger(port) && port > 0 ? port : null;
}

async function pidsByPortOnWindows(port: number) {
  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set<number>();

  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const [protocol, localAddress, , state, pidText] = parts;
    if (protocol !== "TCP" || state !== "LISTENING") continue;
    if (extractAddressPort(localAddress) !== port) continue;
    const pid = tryParsePid(pidText);
    if (pid) pids.add(pid);
  }

  return [...pids];
}

async function pidsByPortOnUnix(port: number) {
  const { stdout } = await execFileAsync("lsof", [
    "-nP",
    `-iTCP:${port}`,
    "-sTCP:LISTEN",
    "-t",
  ]);
  const pids = stdout
    .split(/\r?\n/)
    .map(tryParsePid)
    .filter((value): value is number => value !== null);
  return uniqueNumbers(pids);
}

async function pidsByPort(port: number) {
  try {
    return process.platform === "win32"
      ? await pidsByPortOnWindows(port)
      : await pidsByPortOnUnix(port);
  } catch {
    return [];
  }
}

async function stopProcess(pid: number) {
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Ignore processes that already exited.
  }
}

async function stopServersByPorts(ports: number[]) {
  const pids = new Set<number>();

  for (const port of ports) {
    for (const pid of await pidsByPort(port)) {
      pids.add(pid);
    }
  }

  for (const pid of pids) {
    try {
      await stopProcess(pid);
    } catch {
      // Ignore kill failures and still perform a one-shot listener check below.
    }
  }

  const listeners = await Promise.all(ports.map((port) => pidsByPort(port)));
  for (const [index, pidsOnPort] of listeners.entries()) {
    if (pidsOnPort.length > 0) {
      throw new Error(
        `[e2e teardown] port ${ports[index]} still has active listeners: ${pidsOnPort.join(", ")}`,
      );
    }
  }
}

async function removeDirIfExists(target: string) {
  try {
    await rm(target, { recursive: true, force: true });
  } catch (error) {
    throw new Error(
      `[e2e teardown] failed to remove ${target}: ${String(error)}`,
    );
  }
}

export default async function globalTeardown(_config: FullConfig) {
  const tmpDir = process.env.PW_E2E_TMP_DIR?.trim();
  if (!tmpDir || !isE2eTmpDir(tmpDir)) {
    return;
  }

  const appPort = parsePort(process.env.PW_PORT || process.env.PORT, 3005);
  const realtimePort = parsePort(
    process.env.PW_REALTIME_PORT || process.env.REALTIME_PORT,
    appPort + 4000,
  );
  await stopServersByPorts(uniqueNumbers([appPort, realtimePort]));

  // Deterministic teardown: single-pass cleanup, no retries/backoff.
  await removeDirIfExists(tmpDir);

  // Also remove parent e2e/tmp folders so no tmp artifacts remain.
  const e2eRoot = path.dirname(tmpDir); // .../tmp/e2e
  const tmpRoot = path.dirname(e2eRoot); // .../tmp

  await removeDirIfExists(e2eRoot);
  await removeDirIfExists(tmpRoot);
}
