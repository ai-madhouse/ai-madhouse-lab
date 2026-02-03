import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "next-intl": path.resolve("./src/shims/next-intl"),
      "next-intl/middleware": path.resolve("./src/shims/next-intl-middleware"),
      "next-themes": path.resolve("./src/shims/next-themes"),
      "lucide-react": path.resolve("./src/shims/lucide-react"),
    };
    return config;
  },
};

export default nextConfig;
