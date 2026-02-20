import { afterEach, describe, expect, test } from "bun:test";

import { getRealtimeWsUrl } from "@/lib/realtime-url";

function setWindowLocation({
  protocol,
  host,
  hostname,
  origin,
}: {
  protocol: string;
  host: string;
  hostname: string;
  origin: string;
}) {
  Object.defineProperty(globalThis, "window", {
    value: {
      location: {
        protocol,
        host,
        hostname,
        origin,
      },
    },
    configurable: true,
  });
}

function clearRealtimeEnv() {
  delete process.env.NEXT_PUBLIC_REALTIME_URL;
  delete process.env.NEXT_PUBLIC_REALTIME_PORT;
}

afterEach(() => {
  clearRealtimeEnv();
  // Keep tests isolated from browser globals.
  Object.defineProperty(globalThis, "window", {
    value: undefined,
    configurable: true,
  });
});

describe("getRealtimeWsUrl", () => {
  test("returns null during server rendering", () => {
    clearRealtimeEnv();
    expect(getRealtimeWsUrl()).toBeNull();
  });

  test("uses NEXT_PUBLIC_REALTIME_URL when provided", () => {
    process.env.NEXT_PUBLIC_REALTIME_URL = "https://realtime.example.test";
    setWindowLocation({
      protocol: "https:",
      host: "app.example.test",
      hostname: "app.example.test",
      origin: "https://app.example.test",
    });

    expect(getRealtimeWsUrl()).toBe("wss://realtime.example.test/ws");
  });

  test("uses NEXT_PUBLIC_REALTIME_PORT when provided", () => {
    process.env.NEXT_PUBLIC_REALTIME_PORT = "9443";
    setWindowLocation({
      protocol: "https:",
      host: "app.example.test",
      hostname: "app.example.test",
      origin: "https://app.example.test",
    });

    expect(getRealtimeWsUrl()).toBe("wss://app.example.test:9443/ws");
  });

  test("defaults to localhost realtime port in local development", () => {
    setWindowLocation({
      protocol: "http:",
      host: "localhost:3000",
      hostname: "localhost",
      origin: "http://localhost:3000",
    });

    expect(getRealtimeWsUrl()).toBe("ws://localhost:8787/ws");
  });

  test("defaults to same-origin /ws in non-localhost deployments", () => {
    setWindowLocation({
      protocol: "https:",
      host: "app.example.test",
      hostname: "app.example.test",
      origin: "https://app.example.test",
    });

    expect(getRealtimeWsUrl()).toBe("wss://app.example.test/ws");
  });
});
