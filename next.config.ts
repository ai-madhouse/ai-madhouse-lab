import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler: enables automatic memoization so components can often avoid
  // manual useMemo/useCallback.
  reactCompiler: true,
};

export default nextConfig;
