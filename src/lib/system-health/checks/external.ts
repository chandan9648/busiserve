import "server-only";

import { SCAN_TIMEOUT_MS, WEIGHT } from "../config";
import { isPresent, runProbe } from "../probe";
import type { HealthCheckResult, SecurityFinding } from "../types";

/**
 * =============================================================
 * EXTERNAL SERVICES
 * =============================================================
 *
 * Razorpay and Resend are probed with read-only endpoints.
 *
 * The scan never creates an order, captures a payment, issues a
 * refund or sends an email. Credentials are used to authenticate the
 * read and are never returned, logged or included in a report.
 */

export interface RazorpayStatus {
  configured: boolean;
  /** Derived from the key's own `rzp_test_` / `rzp_live_` prefix. */
  mode: "test" | "live" | "unknown";
  keyIdPresent: boolean;
  keySecretPresent: boolean;
  webhookSecretPresent: boolean;
  /** Whether the webhook secret is distinct from the API secret. */
  webhookSecretDistinct: boolean | null;
  reachable: "yes" | "no" | "unknown";
}

export interface ExternalDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  razorpay: RazorpayStatus;
  email: {
    configured: boolean;
    provider: string;
    reachable: "yes" | "no" | "unknown";
  };
}

export async function runExternalChecks(): Promise<ExternalDiagnostics> {
  const checks: HealthCheckResult[] = [];
  const findings: SecurityFinding[] = [];

  /* ---------------------------------------------------------------- */
  /* Razorpay                                                         */
  /* ---------------------------------------------------------------- */

  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() ?? "";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "";

  const razorpay: RazorpayStatus = {
    configured: Boolean(keyId && keySecret),
    mode: keyId.startsWith("rzp_live_")
      ? "live"
      : keyId.startsWith("rzp_test_")
        ? "test"
        : "unknown",
    keyIdPresent: Boolean(keyId),
    keySecretPresent: Boolean(keySecret),
    webhookSecretPresent: Boolean(webhookSecret),
    // Compared without either value being retained or reported.
    webhookSecretDistinct:
      webhookSecret && keySecret ? webhookSecret !== keySecret : null,
    reachable: "unknown",
  };

  if (!razorpay.configured) {
    checks.push({
      id: "external.razorpay",
      service: "Razorpay",
      category: "external",
      status: "critical",
      message: "Razorpay credentials are not configured.",
      checkedAt: new Date().toISOString(),
      severity: "critical",
      weight: WEIGHT.medium,
      detail:
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are both required before any checkout can be created.",
    });

    findings.push({
      id: "payments.razorpay.unconfigured",
      title: "Razorpay is not configured",
      area: "payments",
      severity: "high",
      status: "fail",
      summary:
        "The payment credentials are missing, so order creation and payment verification will fail.",
      why: "Both the website checkout and the portal plan purchase call Razorpay on the server. Without credentials every purchase attempt returns an error.",
      remediation:
        "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the deployment environment, and RAZORPAY_WEBHOOK_SECRET for webhook verification.",
    });
  } else {
    checks.push(
      await runProbe(
        {
          id: "external.razorpay",
          service: "Razorpay",
          category: "external",
          weight: WEIGHT.medium,
        },
        async () => {
          /**
           * `GET /v1/payments?count=1` is a read. It lists at most one
           * existing payment's metadata and creates nothing. The scan
           * discards the response and keeps only the status code, so no
           * payment or customer detail is retained.
           */
          const credentials = Buffer.from(`${keyId}:${keySecret}`).toString(
            "base64",
          );

          const response = await fetch(
            "https://api.razorpay.com/v1/payments?count=1",
            {
              method: "GET",
              headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/json",
              },
              cache: "no-store",
              signal: AbortSignal.timeout(SCAN_TIMEOUT_MS.probe),
            },
          );

          // Drain without reading, so the connection is released.
          await response.body?.cancel().catch(() => undefined);

          if (response.status === 401) {
            razorpay.reachable = "no";

            return {
              status: "critical" as const,
              statusCode: 401,
              message: "Razorpay rejected the configured credentials.",
              detail:
                "The API is reachable but the key id and secret are not a valid pair, or the key has been revoked.",
              severity: "critical" as const,
            };
          }

          if (!response.ok) {
            razorpay.reachable = "no";

            return {
              status: "warning" as const,
              statusCode: response.status,
              message: `Razorpay returned ${response.status}.`,
              detail:
                "The credentials may be valid; the gateway refused this read.",
              severity: "medium" as const,
            };
          }

          razorpay.reachable = "yes";

          return {
            statusCode: response.status,
            message: `API reachable and credentials accepted (${razorpay.mode} mode).`,
            detail:
              "Verified with a read-only payments list. No order, payment or refund was created.",
          };
        },
      ),
    );

    /* Webhook configuration. */
    if (!razorpay.webhookSecretPresent) {
      findings.push({
        id: "payments.webhook.secret",
        title: "Razorpay webhook secret is not configured",
        area: "payments",
        severity: "high",
        status: "fail",
        summary:
          "RAZORPAY_WEBHOOK_SECRET is unset, so webhook signature verification cannot succeed.",
        why: "Both webhook handlers verify an HMAC over the raw body before acting on it. With no secret configured, /api/portal/webhook throws on every delivery and /api/razorpay/webhook returns a 500, so a payment captured out-of-band is never reconciled and the customer's subscription is not activated.",
        remediation:
          "Create a webhook in the Razorpay dashboard, copy its signing secret into RAZORPAY_WEBHOOK_SECRET, and keep it distinct from the API secret.",
      });
    } else if (razorpay.webhookSecretDistinct === false) {
      findings.push({
        id: "payments.webhook.reused",
        title: "Webhook secret reuses the API secret",
        area: "payments",
        severity: "medium",
        status: "warn",
        summary:
          "RAZORPAY_WEBHOOK_SECRET holds the same value as RAZORPAY_KEY_SECRET.",
        why: "The two keys have different exposure profiles and different rotation needs. Sharing one value means rotating the webhook secret also invalidates API access, which makes rotation risky enough to be deferred.",
        remediation:
          "Set a dedicated signing secret in the Razorpay webhook configuration and store that distinct value in RAZORPAY_WEBHOOK_SECRET.",
      });
    } else {
      findings.push({
        id: "payments.webhook.ok",
        title: "Webhook verification is configured correctly",
        area: "payments",
        severity: "info",
        status: "pass",
        summary:
          "A distinct webhook signing secret is configured, and the handlers verify it with a constant-time comparison over the raw body.",
        why: "Comparing HMACs in constant time prevents a timing oracle, and verifying over the raw text rather than the re-serialised JSON prevents a signature bypass through key reordering.",
        remediation: "",
        reference: "src/lib/portal/server.ts",
      });
    }

    /* Live-mode notice. */
    if (razorpay.mode === "live") {
      findings.push({
        id: "payments.mode.live",
        title: "Razorpay is in live mode",
        area: "payments",
        severity: "info",
        status: "pass",
        summary:
          "The configured key id carries the rzp_live_ prefix, so real money moves through this deployment.",
        why: "Recorded so the operating mode is never in doubt while reading a diagnostic. Confirm this is intended for the environment you are looking at.",
        remediation: "",
      });
    } else if (razorpay.mode === "test" && isLikelyProduction()) {
      findings.push({
        id: "payments.mode.mismatch",
        title: "Test payment keys in a production environment",
        area: "payments",
        severity: "high",
        status: "warn",
        summary:
          "This deployment reports a production environment but holds an rzp_test_ key.",
        why: "Customers can complete a checkout that never charges them. The order is marked paid, a subscription is activated and an invoice is emailed, with no payment received.",
        remediation:
          "Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with the live pair for this environment, and update the webhook secret to match the live webhook.",
      });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Resend — invoice email                                           */
  /* ---------------------------------------------------------------- */

  const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";

  const email: ExternalDiagnostics["email"] = {
    configured: Boolean(resendKey),
    provider: "Resend",
    reachable: "unknown",
  };

  if (!resendKey) {
    checks.push({
      id: "external.resend",
      service: "Email service (Resend)",
      category: "external",
      status: "warning",
      message: "No email API key is configured.",
      checkedAt: new Date().toISOString(),
      severity: "medium",
      weight: WEIGHT.low,
      detail:
        "Invoice email is skipped when RESEND_API_KEY is absent. Payment verification itself still succeeds, so this degrades a receipt rather than a purchase.",
    });

    findings.push({
      id: "email.unconfigured",
      title: "Invoice email is not configured",
      area: "api",
      severity: "low",
      status: "warn",
      summary:
        "RESEND_API_KEY is unset, so no invoice is emailed after a successful payment.",
      why: "The verify-payment handler guards the send on this key being present, so a purchase still completes. The customer simply receives no receipt, which tends to become a support request rather than an outage.",
      remediation:
        "Set RESEND_API_KEY, and set INVOICE_FROM_EMAIL to an address on a domain verified in Resend so delivery is not rejected.",
    });
  } else {
    checks.push(
      await runProbe(
        {
          id: "external.resend",
          service: "Email service (Resend)",
          category: "external",
          weight: WEIGHT.low,
        },
        async () => {
          /**
           * `GET /domains` lists verified sending domains. It is a read:
           * no message is composed, queued or sent by this check.
           */
          const response = await fetch("https://api.resend.com/domains", {
            method: "GET",
            headers: { Authorization: `Bearer ${resendKey}` },
            cache: "no-store",
            signal: AbortSignal.timeout(SCAN_TIMEOUT_MS.probe),
          });

          await response.body?.cancel().catch(() => undefined);

          if (response.status === 401 || response.status === 403) {
            email.reachable = "no";

            return {
              status: "critical" as const,
              statusCode: response.status,
              message: "Resend rejected the configured API key.",
              detail:
                "Invoice email will fail after a successful payment. The key may have been revoked.",
              severity: "high" as const,
            };
          }

          if (!response.ok) {
            email.reachable = "no";

            return {
              status: "warning" as const,
              statusCode: response.status,
              message: `Resend returned ${response.status}.`,
              severity: "medium" as const,
            };
          }

          email.reachable = "yes";

          return {
            statusCode: response.status,
            message: "API reachable and key accepted.",
            detail:
              "Verified by listing sending domains. No email was sent by this check.",
          };
        },
      ),
    );

    if (!isPresent("INVOICE_FROM_EMAIL")) {
      findings.push({
        id: "email.from-address",
        title: "Invoice sender falls back to a shared test address",
        area: "api",
        severity: "low",
        status: "warn",
        summary:
          "INVOICE_FROM_EMAIL is unset, so src/lib/email.ts sends from onboarding@resend.dev.",
        why: "That fallback is Resend's shared testing address. It is not on a domain you control, so delivery to real customers is unreliable and the receipt does not come from your brand.",
        remediation:
          "Verify a sending domain in Resend and set INVOICE_FROM_EMAIL to an address on it.",
        reference: "src/lib/email.ts",
      });
    }
  }

  return { checks, findings, razorpay, email };
}

function isLikelyProduction(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  );
}
