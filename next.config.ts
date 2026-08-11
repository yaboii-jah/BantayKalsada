import type { NextConfig } from "next";
import withSerwist from "@serwist/next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(
  withSerwist({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV !== "production",
  })(nextConfig),
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    suppressOnRouterTransitionStartWarning: true,
    webpack: {
      treeshake: {
        removeTracing: true,
        removeDebugLogging: true,
      },
    },
  },
);
