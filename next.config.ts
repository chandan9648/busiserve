import type { NextConfig } from "next";

/**
 * Security response headers.
 *
 * Each of these was reported as missing by the security console's own
 * header audit. They are static, carry no behavioural risk, and are
 * applied to every route.
 *
 * Content-Security-Policy is deliberately absent from this list and
 * handled separately below.
 */
const securityHeaders = [
  {
    // Stops the sign-in and payment pages being framed and overlaid,
    // which is the setup for a clickjacking attempt.
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    // Stops a browser inferring a content type that differs from the
    // declared one.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Most browsers already default to this; setting it explicitly
    // removes the dependence on that default for paths such as
    // /payment/success, which can carry an order reference.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // The application requests none of these itself. Set because the
    // payment flow embeds a third-party frame.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    // Forces HTTPS on subsequent visits, closing the downgrade window
    // on the first navigation of a session. Ignored by browsers on a
    // plain-HTTP origin, so it is inert during local development.
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

/**
 * Content-Security-Policy, in report-only mode.
 *
 * Enforcing a policy here would be the one change in this file that
 * can break the site: the Razorpay checkout injects a script and an
 * iframe, Firebase Auth opens a popup to its own domain, Google Fonts
 * serves stylesheets, and Next.js emits inline bootstrap script. A
 * wrong directive takes payments down.
 *
 * Report-only never blocks anything. It reports violations to the
 * browser console, so the policy below can be verified against a real
 * checkout and a real sign-in first, and only then promoted to
 * `Content-Security-Policy` by renaming the header.
 *
 * 'unsafe-inline' appears because Next.js inlines its hydration
 * script; removing it requires nonce plumbing and is the main thing
 * to tighten once the rest of the policy is proven.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://*.razorpay.com wss://*.firebaseio.com",
  "frame-src 'self' https://*.razorpay.com https://*.firebaseapp.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://*.razorpay.com",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["firebase-admin"],

  // Removes the framework fingerprint from every response.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy,
          },
        ],
      },
    ];
  },
};

nextConfig.env = {
  ...nextConfig.env,
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
};

export default nextConfig;
