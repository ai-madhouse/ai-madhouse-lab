import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProd = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },

  // NOTE: CSP is set dynamically in src/proxy.ts (nonce per request), so it
  // cannot live in next.config headers().
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  // React Compiler: enables automatic memoization so components can often avoid
  // manual useMemo/useCallback.
  reactCompiler: true,

  // Don't leak framework in headers.
  poweredByHeader: false,

  // Avoid bundling native/dynamic-require libsql packages in webpack builds.
  // (They pull in non-JS assets via require contexts and can break compilation.)
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client", "libsql"],

  webpack: (config, context) => {
    // libsql uses dynamic requires and native bindings. When webpack tries to
    // statically analyze it, it can crawl entire package trees (README/LICENSE,
    // `.node` binaries, etc.) and break compilation. Force these packages to be
    // treated as server externals.
    if (context.isServer) {
      const existing = config.externals ?? [];
      const externals = Array.isArray(existing) ? existing : [existing];

      externals.push(
        (
          _context: unknown,
          request: string | undefined,
          callback: (error: Error | null, result?: string) => void,
        ) => {
          if (
            typeof request === "string" &&
            (request === "libsql" || request.startsWith("@libsql/"))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback(null);
        },
      );

      config.externals = externals;
    }

    return config;
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const configWithPlugins = withNextIntl(nextConfig);

export default withSentryConfig(configWithPlugins, {
  // No source maps upload by default (no auth token configured).
  silent: true,
});
