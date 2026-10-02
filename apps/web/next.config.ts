import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Workspace packages ship TypeScript sources; Next compiles them in place so
  // the editor can import the schema and engine without a separate build step.
  transpilePackages: ["@aiphotoshop/design-schema", "@aiphotoshop/design-engine"],
};

export default nextConfig;
