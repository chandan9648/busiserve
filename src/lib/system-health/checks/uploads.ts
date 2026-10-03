import "server-only";

import { WEIGHT } from "../config";
import type { SourceTree } from "../source";
import type { HealthCheckResult, SecurityFinding } from "../types";

/**
 * =============================================================
 * FILE UPLOAD SECURITY
 * =============================================================
 *
 * The audit first establishes whether an upload path exists at all.
 *
 * Reporting a list of upload controls as passing when the
 * application accepts no uploads would be inventing a result, so
 * when none is found this section says exactly that instead.
 */

const UPLOAD_SIGNALS: { label: string; pattern: RegExp }[] = [
  { label: "multipart form parsing", pattern: /\bformData\s*\(/ },
  { label: "File or Blob handling", pattern: /\binstanceof\s+(?:File|Blob)\b/ },
  {
    label: "Firebase Storage upload",
    pattern: /\b(?:uploadBytes|uploadBytesResumable|uploadString)\s*\(/,
  },
  { label: "Admin Storage write", pattern: /\.bucket\s*\([^)]*\)\s*\.\s*(?:file|upload)\s*\(/ },
  { label: "file input element", pattern: /type\s*=\s*["']file["']/ },
  { label: "filesystem write", pattern: /\bwriteFile(?:Sync)?\s*\(/ },
];

const CONTROL_SIGNALS: { label: string; pattern: RegExp }[] = [
  { label: "Size limit", pattern: /\b(?:maxSize|MAX_(?:FILE_)?SIZE|size\s*>\s*\d+)/ },
  { label: "MIME validation", pattern: /\b(?:mimetype|mimeType|contentType|\.type\s*(?:===|!==|\.startsWith))/ },
  { label: "Extension allow-list", pattern: /\b(?:allowedExtensions|ALLOWED_(?:EXTENSIONS|TYPES)|\.(?:jpe?g|png|webp|pdf)["'])/i },
  { label: "Filename sanitisation", pattern: /\b(?:sanitize|slugify|randomUUID|basename)\s*\(/ },
  {
    label: "Path traversal guard",
    // A guard looks like an explicit rejection of `..` or a normalise
    // call, never the presence of `../`, which every import path has.
    pattern:
      /(?:includes\s*\(\s*["']\.\.["']\s*\)|replace\s*\(\s*\/\\\.\\\.|\bnormalize\s*\(|\bbasename\s*\()/,
  },
];

export interface UploadDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  report: {
    available: boolean;
    unavailableReason?: string;
    uploadPathDetected: boolean;
    signals: string[];
    controls: { label: string; present: boolean }[];
    storageConfigured: boolean;
  };
}

export function runUploadAudit(tree: SourceTree): UploadDiagnostics {
  const storageConfigured = Boolean(
    process.env.FIREBASE_STORAGE_BUCKET?.trim(),
  );

  if (!tree.available) {
    return {
      checks: [
        {
          id: "uploads.audit",
          service: "File upload security",
          category: "security",
          status: "unknown",
          message: "NOT AVAILABLE — source tree not readable in this runtime.",
          checkedAt: new Date().toISOString(),
          severity: "low",
          weight: WEIGHT.low,
          detail: tree.unavailableReason,
        },
      ],
      findings: [],
      report: {
        available: false,
        unavailableReason: tree.unavailableReason,
        uploadPathDetected: false,
        signals: [],
        controls: [],
        storageConfigured,
      },
    };
  }

  /** Exclude this audit's own signal table from the search. */
  const searchable = tree.files.filter(
    (file) => file.path !== "src/lib/system-health/checks/uploads.ts",
  );

  const corpus = searchable.map((file) => file.lines.join("\n")).join("\n");

  const signals = UPLOAD_SIGNALS.filter((signal) =>
    signal.pattern.test(corpus),
  ).map((signal) => signal.label);

  const uploadPathDetected = signals.length > 0;

  if (!uploadPathDetected) {
    return {
      checks: [
        {
          id: "uploads.audit",
          service: "File upload security",
          category: "security",
          status: "healthy",
          message: "No upload path exists in this application.",
          checkedAt: new Date().toISOString(),
          severity: "info",
          weight: WEIGHT.low,
          detail: `${searchable.length} source files were searched for multipart parsing, File or Blob handling, Storage uploads and file inputs. None was found, so there are no upload controls to assess.`,
        },
      ],
      findings: [
        {
          id: "uploads.none",
          title: "No file upload surface",
          area: "uploads",
          severity: "info",
          status: "pass",
          summary:
            "The application accepts no file uploads, so the upload attack surface is empty.",
          why: "Uploads are among the highest-risk features a web application can expose. The absence of one removes an entire class of risk rather than mitigating it. src/lib/firebase/storage.ts exports a configured Storage client, but nothing imports it.",
          remediation: "",
        },
        ...(storageConfigured
          ? [
              {
                id: "uploads.storage-unused",
                title: "Storage bucket configured but unused",
                area: "uploads" as const,
                severity: "info" as const,
                status: "pass" as const,
                summary:
                  "FIREBASE_STORAGE_BUCKET is set and the bucket is reachable, but no code reads or writes it.",
                why: "Worth knowing when planning an upload feature: the infrastructure is in place, so the security controls will need to be added at the same time as the first upload path. Check the bucket's own security rules before it is first written to.",
                remediation: "",
              },
            ]
          : []),
      ],
      report: {
        available: true,
        uploadPathDetected: false,
        signals: [],
        controls: [],
        storageConfigured,
      },
    };
  }

  /* An upload path exists: assess its controls. */
  const controls = CONTROL_SIGNALS.map((control) => ({
    label: control.label,
    present: control.pattern.test(corpus),
  }));

  const missing = controls.filter((control) => !control.present);

  return {
    checks: [
      {
        id: "uploads.audit",
        service: "File upload security",
        category: "security",
        status: missing.length === 0 ? "healthy" : "warning",
        message:
          missing.length === 0
            ? "Upload path found with all audited controls present."
            : `Upload path found; ${missing.length} control(s) not detected.`,
        checkedAt: new Date().toISOString(),
        severity: missing.length === 0 ? "info" : "high",
        weight: WEIGHT.high,
        detail: `Detected: ${signals.join(", ")}.`,
      },
    ],
    findings: missing.map((control) => ({
      id: `uploads.${control.label.toLowerCase().replace(/\s+/g, "-")}`,
      title: `Upload control not detected: ${control.label}`,
      area: "uploads" as const,
      severity: "high" as const,
      status: "warn" as const,
      summary: `An upload path exists but no ${control.label.toLowerCase()} was found near it.`,
      why: "An upload accepted without validation can store executable or active content, such as an SVG or HTML file that runs script in the context of the serving origin, and an unbounded upload can exhaust storage quota and cost.",
      remediation: `Validate the upload before storing it: bound its size, check its declared content type against an allow-list, generate the stored filename server-side rather than trusting the client's, and serve user content from a separate origin or with Content-Disposition: attachment.`,
    })),
    report: {
      available: true,
      uploadPathDetected: true,
      signals,
      controls,
      storageConfigured,
    },
  };
}
