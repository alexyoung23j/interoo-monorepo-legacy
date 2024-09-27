import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { withSentryConfig } from "@sentry/nextjs";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from a parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    externalDir: true, // This allows importing from external directories
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@shared": path.resolve(__dirname, "../shared"),
    };
    return config;
  },
  images: {
    domains: [
      "placehold.co",
      "www.taxmann.com",
      "https://kpgpsbovjhjvnskyaydv.supabase.co",
      "storage.googleapis.com",
    ],
  },
};

const sentryConfig = {
  org: "interoo",
  project: "interoo-app",
  sentryUrl: "https://sentry.io/",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(config, sentryConfig);
