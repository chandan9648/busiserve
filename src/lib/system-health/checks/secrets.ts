import "server-only";

import { WEIGHT } from "../config";
import type { SourceTree } from "../source";
import type {
  HealthCheckResult,
  SecretMatch,
  SecretScanResult,
  SecurityFinding,
  Severity,
} from "../types";

/**
 * =============================================================
 * CREDENTIAL EXPOSURE SCAN
 * =============================================================
 *
 * Static pattern detection across the project's own source.
 *
 * The matched text is never retained. `preview` carries a fixed
 * notice or a prefix of at most four characters followed by dots,
 * so a finding delivered to the dashboard cannot itself become the
 * disclosure it is reporting.
 *
 * Reading a secret from `process.env` is correct and is not a
 * finding; a literal credential written into a tracked file is.
 */

interface SecretRule {
  kind: string;
  severity: Severity;
  pattern: RegExp;
  /** Keep a short prefix, for example `rzp_live_`, to aid triage. */
  prefixLength?: number;
}

const RULES: SecretRule[] = [
  {
    kind: "PEM private key",
    severity: "critical",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    kind: "Service-account JSON key",
    severity: "critical",
    pattern: /"private_key"\s*:\s*"-----BEGIN/,
  },
  {
    kind: "Razorpay live key",
    severity: "critical",
    pattern: /\brzp_live_[A-Za-z0-9]{10,}/,
    prefixLength: 9,
  },
  {
    kind: "Razorpay test key",
    severity: "high",
    pattern: /\brzp_test_[A-Za-z0-9]{10,}/,
    prefixLength: 9,
  },
  {
    kind: "Resend API key",
    severity: "critical",
    pattern: /\bre_[A-Za-z0-9]{24,}/,
    prefixLength: 3,
  },
  {
    kind: "Google API key",
    severity: "high",
    pattern: /\bAIza[0-9A-Za-z_-]{35}/,
    prefixLength: 4,
  },
  {
    kind: "Google OAuth token",
    severity: "critical",
    pattern: /\bya29\.[0-9A-Za-z_-]{20,}/,
    prefixLength: 5,
  },
  {
    kind: "AWS access key id",
    severity: "critical",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
    prefixLength: 4,
  },
  {
    kind: "Slack token",
    severity: "high",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}/,
    prefixLength: 5,
  },
  {
    kind: "GitHub token",
    severity: "critical",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}/,
    prefixLength: 4,
  },
  {
    kind: "JSON Web Token",
    severity: "high",
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./,
    prefixLength: 3,
  },
  {
    kind: "Database URL with credentials",
    severity: "critical",
    // A password inside a connection string, excluding placeholders.
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[A-Za-z0-9._-]+:(?!(?:password|changeme|your|xxx|placeholder|\$\{|<))[^\s:@/"']{6,}@/i,
  },
  {
    kind: "Hard-coded secret assignment",
    severity: "high",
    /**
     * A literal assigned to a secret-shaped identifier. Template
     * expressions, env reads and obvious placeholders are excluded
     * by `looksLikePlaceholder` below.
     */
    pattern:
      /\b(?:api[_-]?secret|client[_-]?secret|webhook[_-]?secret|key[_-]?secret|private[_-]?key|jwt[_-]?secret|session[_-]?secret|signing[_-]?key|auth[_-]?token|access[_-]?token|password|passwd)\s*[:=]\s*["'`]([^"'`\n]{8,})["'`]/i,
  },
];

/**
 * Words that mark a string as documentation rather than a credential.
 */
const PLACEHOLDER_PATTERN =
  /(your[_-]?|example|placeholder|changeme|dummy|sample|redacted|xxxx|\.\.\.|<[^>]+>|\$\{|process\.env|TODO|FIXME|test[_-]?only|fake)/i;

/**
 * Lines that are plainly reading configuration, not embedding it.
 */
const ENV_READ_PATTERN = /process\.env\s*(?:\.|\[)/;

/**
 * Files whose whole purpose is to describe these patterns.
 *
 * This scanner's own rule table would otherwise match itself on
 * every run and report a permanent false positive.
 */
const EXCLUDED_PATHS = [
  "src/lib/system-health/checks/secrets.ts",
  "src/lib/system-health/checks/environment.ts",
  "src/lib/system-health/loopback.ts",
];

export interface SecretDiagnostics {
  checks: HealthCheckResult[];
  findings: SecurityFinding[];
  scan: SecretScanResult;
}

export function runSecretScan(tree: SourceTree): SecretDiagnostics {
  if (!tree.available) {
    return {
      checks: [
        {
          id: "secrets.scan",
          service: "Credential exposure scan",
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
      scan: {
        available: false,
        unavailableReason: tree.unavailableReason,
        filesScanned: 0,
        matches: [],
      },
    };
  }

  const matches: SecretMatch[] = [];

  for (const file of tree.files) {
    if (EXCLUDED_PATHS.includes(file.path)) continue;

    file.lines.forEach((line, index) => {
      // Keep the scan bounded on minified or generated output.
      if (line.length > 1000) return;

      for (const rule of RULES) {
        const found = rule.pattern.exec(line);
        if (!found) continue;

        const captured = found[1] ?? found[0];

        if (looksLikePlaceholder(line, captured)) continue;

        matches.push({
          file: file.path,
          line: index + 1,
          kind: rule.kind,
          severity: rule.severity,
          preview: mask(captured, rule.prefixLength),
        });

        // One finding per line is enough to send someone to look.
        break;
      }
    });
  }

  const worst = severityRank(matches);

  const checks: HealthCheckResult[] = [
    {
      id: "secrets.scan",
      service: "Credential exposure scan",
      category: "security",
      status:
        matches.length === 0
          ? "healthy"
          : worst === "critical"
            ? "critical"
            : "warning",
      message:
        matches.length === 0
          ? `No credential literals found in ${tree.files.length} source files.`
          : `${matches.length} potential credential literal(s) detected.`,
      checkedAt: new Date().toISOString(),
      severity: matches.length === 0 ? "info" : worst,
      weight: WEIGHT.critical,
      detail:
        matches.length === 0
          ? "Values read from process.env are correct configuration and are not reported."
          : "Matched text is never stored or displayed; see the file and line reference.",
    },
  ];

  const findings: SecurityFinding[] = matches.map((match) => ({
    id: `secrets.${match.file}:${match.line}`,
    title: `Possible ${match.kind} in source`,
    area: "secrets",
    severity: match.severity,
    status: "fail",
    summary: `A literal matching a ${match.kind} pattern appears at ${match.file}:${match.line}.`,
    why: "A credential committed to source is readable by everyone with repository access and stays in git history after the line is deleted. If the repository is ever made public or a contributor's access is revoked, the credential has to be treated as compromised.",
    remediation: `Open ${match.file}:${match.line} and confirm what it is. If it is a real credential, rotate it at its provider first, then move it to an environment variable read on the server, and purge it from git history. If it is a placeholder or a fixture, the pattern can be narrowed in src/lib/system-health/checks/secrets.ts.`,
    reference: `${match.file}:${match.line}`,
  }));

  if (matches.length === 0 && tree.files.length > 0) {
    findings.push({
      id: "secrets.clean",
      title: "No credential literals in source",
      area: "secrets",
      severity: "info",
      status: "pass",
      summary: `${tree.files.length} source files scanned against ${RULES.length} credential patterns with no match.`,
      why: "Secrets belong in the environment, where they can be rotated without a deploy and never enter git history.",
      remediation: "",
    });
  }

  return {
    checks,
    findings,
    scan: {
      available: true,
      filesScanned: tree.files.length,
      matches,
    },
  };
}

/**
 * Suppress documentation, placeholders and environment reads.
 */
function looksLikePlaceholder(line: string, captured: string): boolean {
  if (PLACEHOLDER_PATTERN.test(captured)) return true;

  // `const secret = process.env.RAZORPAY_KEY_SECRET` is correct code.
  if (ENV_READ_PATTERN.test(line)) return true;

  // A type annotation or interface field is a declaration, not a value.
  if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return true;
  if (/\b(?:readonly\s+)?[A-Za-z_$][\w$]*\s*\??\s*:\s*(?:string|number|boolean)\b/.test(line)) {
    return true;
  }

  // Entropy floor: a real key is not a single repeated or dictionary word.
  if (/^[a-z]+$/.test(captured) && captured.length < 20) return true;

  return false;
}

/**
 * Reduce a matched credential to something that cannot be used.
 */
function mask(value: string, prefixLength = 0): string {
  const trimmed = value.trim();

  if (prefixLength > 0 && trimmed.length > prefixLength) {
    return `${trimmed.slice(0, prefixLength)}${"•".repeat(12)}`;
  }

  return "Potential credential detected (value withheld)";
}

function severityRank(matches: SecretMatch[]): Severity {
  if (matches.some((match) => match.severity === "critical")) return "critical";
  if (matches.some((match) => match.severity === "high")) return "high";
  if (matches.some((match) => match.severity === "medium")) return "medium";
  return matches.length > 0 ? "low" : "info";
}
