import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

nextConfig.env = {
  ...nextConfig.env,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
};

export default nextConfig;
