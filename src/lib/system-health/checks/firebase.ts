import "server-only";

import { getStorage } from "firebase-admin/storage";

import {
  FirebaseConfigurationError,
  getAdminApp,
  getAdminAuth,
  getAdminDb,
} from "@/lib/firebase-admin";

import { WEIGHT } from "../config";
import { elapsed, isPresent, now, runProbe, withTimeout } from "../probe";
import type {
  ConfigItem,
  HealthCheckResult,
  SecurityFinding,
} from "../types";

/**
 * =============================================================
 * FIREBASE // CORE SERVICES
 * =============================================================
 *
 * Every probe here is read-only. The scan never creates, updates
 * or deletes a document, a user or an object, and it never reads a
 * customer record: collection reachability is measured with a
 * server-side COUNT aggregation, which returns a number and no
 * document data at all.
 *
 * Firebase Admin is reached only through the project's existing
 * `@/lib/firebase-admin` singletons, so the scan cannot create a
 * second Admin app or a second credential path.
 */

/**
 * Health probe document.
 *
 * A document `get()` succeeds whether or not the document exists, and
 * a missing document still proves the credential, the network path
 * and read permission. So nothing has to be created for this check,
 * and the scan never writes it.
 */
const PROBE_DOC = "_systemHealth/probe";

/** Collections the application actually uses, measured by count only. */
const MEASURED_COLLECTIONS = [
  "portalUsers",
  "portalSubscriptions",
  "portalOrders",
] as const;

export interface FirebaseDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  configuration: ConfigItem[];
  /** Document counts, which contain no personal data. */
  collectionCounts: { collection: string; count: number | null }[];
}

export async function runFirebaseChecks(): Promise<FirebaseDiagnostics> {
  const checks: HealthCheckResult[] = [];
  const findings: SecurityFinding[] = [];
  const collectionCounts: FirebaseDiagnostics["collectionCounts"] = [];

  /* ---------------------------------------------------------------- */
  /* 1. Admin SDK initialisation                                      */
  /* ---------------------------------------------------------------- */

  let adminReady = false;

  const initCheck = await runProbe(
    {
      id: "firebase.admin.init",
      service: "Firebase Admin SDK",
      category: "firebase",
      weight: WEIGHT.critical,
    },
    async () => {
      try {
        const app = getAdminApp();
        adminReady = true;

        return {
          message: `Admin app initialised (${app.name}).`,
          detail:
            "Service-account credential loaded and validated as an RSA key.",
        };
      } catch (error) {
        // FirebaseConfigurationError messages are authored by the project
        // and contain no key material, so they are safe to surface.
        if (error instanceof FirebaseConfigurationError) {
          return {
            status: "critical" as const,
            message: error.message,
            detail: `Configuration code: ${error.code}`,
            severity: "critical" as const,
            ignoreDuration: true,
          };
        }

        throw error;
      }
    },
  );

  checks.push(initCheck);

  if (initCheck.status !== "healthy") {
    findings.push({
      id: "firebase.admin.init",
      title: "Firebase Admin SDK is not initialising",
      area: "firebase",
      severity: "critical",
      status: "fail",
      summary: initCheck.message,
      why: "Every authenticated API route verifies its ID token through Admin Auth and reads Firestore through the Admin SDK. While initialisation fails, the portal, the admin dashboard and payment activation are all unavailable.",
      remediation:
        "Confirm FIREBASE_ADMIN_PROJECT_ID / FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY / FIREBASE_PRIVATE_KEY in the deployment environment, and that the private key keeps its newline escapes.",
    });
  }

  /* ---------------------------------------------------------------- */
  /* 2. Firebase Authentication — read-only                           */
  /* ---------------------------------------------------------------- */

  if (adminReady) {
    checks.push(
      await runProbe(
        {
          id: "firebase.auth",
          service: "Firebase Authentication",
          category: "firebase",
          weight: WEIGHT.critical,
        },
        async () => {
          /**
           * `listUsers(1)` is the lightest call that proves the service
           * account can reach Identity Platform. It reads one record's
           * metadata, and nothing about that record is returned to the
           * client beyond the fact that the call succeeded.
           */
          const result = await getAdminAuth().listUsers(1);

          return {
            message: "Authentication service reachable and authorised.",
            detail: `Directory responded${
              result.users.length > 0
                ? " and holds at least one account"
                : " with an empty first page"
            }. No account data leaves the server.`,
          };
        },
      ),
    );
  } else {
    checks.push(
      skipped(
        "firebase.auth",
        "Firebase Authentication",
        WEIGHT.critical,
        "Admin SDK did not initialise.",
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* 3. Firestore read path                                           */
  /* ---------------------------------------------------------------- */

  if (adminReady) {
    checks.push(
      await runProbe(
        {
          id: "firebase.firestore.read",
          service: "Firestore (read)",
          category: "firebase",
          weight: WEIGHT.critical,
        },
        async () => {
          const snapshot = await getAdminDb().doc(PROBE_DOC).get();

          return {
            message: "Firestore read path healthy.",
            detail: `Probe document ${PROBE_DOC} ${
              snapshot.exists ? "exists" : "does not exist"
            }; either answer confirms connectivity and read permission. The scan never writes it.`,
          };
        },
      ),
    );

    /* -------------------------------------------------------------- */
    /* 4. Collection reachability, by COUNT only                      */
    /* -------------------------------------------------------------- */

    checks.push(
      await runProbe(
        {
          id: "firebase.firestore.count",
          service: "Firestore (collections)",
          category: "firebase",
          weight: WEIGHT.high,
        },
        async () => {
          const started = now();

          for (const collection of MEASURED_COLLECTIONS) {
            try {
              /**
               * A COUNT aggregation runs inside Firestore and returns a
               * single integer. No document is transferred, so this
               * dashboard reads no personal data.
               */
              const result = await withTimeout(
                getAdminDb().collection(collection).count().get(),
                4000,
              );

              collectionCounts.push({
                collection,
                count: result.data().count,
              });
            } catch {
              collectionCounts.push({ collection, count: null });
            }
          }

          const failed = collectionCounts.filter(
            (entry) => entry.count === null,
          );

          if (failed.length === collectionCounts.length) {
            return {
              status: "critical" as const,
              message: "No application collection could be counted.",
              detail:
                "Check the service account's Firestore IAM role and that the Firestore API is enabled for this project.",
              responseTime: elapsed(started),
            };
          }

          if (failed.length > 0) {
            return {
              status: "warning" as const,
              message: `${failed.length} of ${collectionCounts.length} collections did not answer.`,
              detail: `Unavailable: ${failed
                .map((entry) => entry.collection)
                .join(", ")}.`,
              responseTime: elapsed(started),
            };
          }

          return {
            message: `All ${collectionCounts.length} application collections reachable.`,
            detail:
              "Measured with server-side COUNT aggregations: document counts only, never record contents.",
            responseTime: elapsed(started),
          };
        },
      ),
    );
  } else {
    checks.push(
      skipped(
        "firebase.firestore.read",
        "Firestore (read)",
        WEIGHT.critical,
        "Admin SDK did not initialise.",
      ),
      skipped(
        "firebase.firestore.count",
        "Firestore (collections)",
        WEIGHT.high,
        "Admin SDK did not initialise.",
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* 5. Firebase Storage                                              */
  /* ---------------------------------------------------------------- */

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    "";

  if (!bucketName) {
    checks.push({
      id: "firebase.storage",
      service: "Firebase Storage",
      category: "firebase",
      status: "unknown",
      message: "No storage bucket is configured.",
      checkedAt: new Date().toISOString(),
      severity: "low",
      weight: WEIGHT.low,
      detail:
        "FIREBASE_STORAGE_BUCKET is not set. The application has no upload path today, so this is informational rather than a fault.",
    });
  } else if (!adminReady) {
    checks.push(
      skipped(
        "firebase.storage",
        "Firebase Storage",
        WEIGHT.medium,
        "Admin SDK did not initialise.",
      ),
    );
  } else {
    checks.push(
      await runProbe(
        {
          id: "firebase.storage",
          service: "Firebase Storage",
          category: "firebase",
          weight: WEIGHT.medium,
        },
        async () => {
          /**
           * The Admin app is created without a `storageBucket`, so the
           * bucket is named explicitly here rather than relying on a
           * default that does not exist. `exists()` is a metadata read.
           */
          const [exists] = await getStorage(getAdminApp())
            .bucket(bucketName)
            .exists();

          if (!exists) {
            return {
              status: "critical" as const,
              message: "The configured storage bucket was not found.",
              detail:
                "The service account reached the Storage API, but the bucket named by FIREBASE_STORAGE_BUCKET does not exist or is not visible to it.",
              severity: "high" as const,
            };
          }

          return {
            message: "Storage bucket reachable from the server.",
            detail:
              "Metadata read only; no object was listed, uploaded or deleted.",
          };
        },
      ),
    );
  }

  /* ---------------------------------------------------------------- */
  /* 6. Configuration completeness — presence only                    */
  /* ---------------------------------------------------------------- */

  const configuration = firebaseConfiguration();

  const missingRequired = configuration.filter(
    (item) => item.required && !item.present,
  );

  checks.push({
    id: "firebase.configuration",
    service: "Firebase configuration",
    category: "configuration",
    status: missingRequired.length === 0 ? "healthy" : "critical",
    message:
      missingRequired.length === 0
        ? "All required Firebase variables are configured."
        : `${missingRequired.length} required Firebase variable(s) are missing.`,
    checkedAt: new Date().toISOString(),
    severity: missingRequired.length === 0 ? "info" : "critical",
    weight: WEIGHT.critical,
    detail:
      missingRequired.length === 0
        ? "Presence verified without reading any value."
        : `Missing: ${missingRequired.map((item) => item.name).join(", ")}.`,
  });

  /* ---------------------------------------------------------------- */
  /* 7. Server-only credential boundary                               */
  /* ---------------------------------------------------------------- */

  findings.push(...credentialBoundaryFindings());

  return { checks, findings, configuration, collectionCounts };
}

/**
 * Required and optional Firebase variables, reported by presence.
 *
 * `@/lib/firebase-admin` accepts either the `FIREBASE_ADMIN_*` name or
 * the legacy `FIREBASE_*` name for each credential, so a pair counts as
 * satisfied when either side is set.
 */
function firebaseConfiguration(): ConfigItem[] {
  const pair = (
    adminName: string,
    legacyName: string,
    label: string,
  ): ConfigItem => ({
    name: label,
    present: isPresent(adminName) || isPresent(legacyName),
    scope: "server",
    required: true,
    note: `Satisfied by ${adminName} or ${legacyName}.`,
  });

  return [
    pair("FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_PROJECT_ID", "Project ID"),
    pair(
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_CLIENT_EMAIL",
      "Service-account client email",
    ),
    pair(
      "FIREBASE_ADMIN_PRIVATE_KEY",
      "FIREBASE_PRIVATE_KEY",
      "Service-account private key",
    ),
    {
      name: "FIREBASE_API_KEY",
      present: isPresent("FIREBASE_API_KEY"),
      scope: "public",
      required: true,
      note: "Browser Firebase config. Public by design, and restricted by Firebase security rules rather than by secrecy.",
    },
    {
      name: "FIREBASE_AUTH_DOMAIN",
      present: isPresent("FIREBASE_AUTH_DOMAIN"),
      scope: "public",
      required: true,
    },
    {
      name: "FIREBASE_APP_ID",
      present: isPresent("FIREBASE_APP_ID"),
      scope: "public",
      required: true,
    },
    {
      name: "FIREBASE_STORAGE_BUCKET",
      present: isPresent("FIREBASE_STORAGE_BUCKET"),
      scope: "public",
      required: false,
      note: "Required only once an upload path exists.",
    },
    {
      name: "FIREBASE_MESSAGING_SENDER_ID",
      present: isPresent("FIREBASE_MESSAGING_SENDER_ID"),
      scope: "public",
      required: false,
    },
    {
      name: "FIREBASE_DATABASE_ID",
      present: isPresent("FIREBASE_DATABASE_ID"),
      scope: "server",
      required: false,
      note: "Optional. The default database is used when unset.",
    },
  ];
}

/**
 * Verify that the Admin credential cannot reach the browser.
 */
function credentialBoundaryFindings(): SecurityFinding[] {
  /**
   * A `NEXT_PUBLIC_` copy of any Admin credential would be inlined
   * into the client bundle by the compiler.
   */
  const leaked = [
    "NEXT_PUBLIC_FIREBASE_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_ADMIN_PRIVATE_KEY",
    "NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL",
    "NEXT_PUBLIC_FIREBASE_ADMIN_CLIENT_EMAIL",
  ].filter(isPresent);

  return [
    leaked.length === 0
      ? {
          id: "firebase.credentials.server-only",
          title: "Admin credentials are server-only",
          area: "firebase",
          severity: "info",
          status: "pass",
          summary:
            "No Firebase Admin credential is exposed through a NEXT_PUBLIC_ variable.",
          why: "Anything prefixed NEXT_PUBLIC_ is compiled into the JavaScript bundle and is readable by every visitor.",
          remediation: "",
        }
      : {
          id: "firebase.credentials.server-only",
          title: "Firebase Admin credential exposed to the browser",
          area: "firebase",
          severity: "critical",
          status: "fail",
          summary: `${leaked.length} Admin credential variable(s) carry the NEXT_PUBLIC_ prefix.`,
          why: "A NEXT_PUBLIC_ variable is inlined into the client bundle. A service-account key published that way grants full administrative access to the Firebase project and bypasses every security rule.",
          remediation: `Remove ${leaked.join(
            ", ",
          )} from the environment, rotate the exposed service-account key in the Google Cloud console, and read the credential only through the server-only helper in src/lib/firebase-admin.ts.`,
        },
  ];
}

function skipped(
  id: string,
  service: string,
  weight: number,
  reason: string,
): HealthCheckResult {
  return {
    id,
    service,
    category: "firebase",
    status: "unknown",
    message: "Not checked.",
    checkedAt: new Date().toISOString(),
    severity: "low",
    weight,
    detail: reason,
  };
}
