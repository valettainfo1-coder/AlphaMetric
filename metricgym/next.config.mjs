import withSerwistInit from "@serwist/next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Service worker only matters in production builds; dev stays fast.
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // METRICGYM is a standalone project inside a multi-project repository —
  // pin the tracing root so Next never reaches into the repo root.
  outputFileTracingRoot: __dirname,
};

export default withSerwist(nextConfig);
