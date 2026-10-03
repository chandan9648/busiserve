import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * =============================================================
 * SAFE SOURCE-TREE READER
 * =============================================================
 *
 * The static audits need the repository's own TypeScript. That is
 * present during development and on a self-hosted or containerised
 * deployment, but a bundled serverless function ships only compiled
 * output, so `available: false` is an expected answer rather than a
 * failure — the dashboard labels those panels NOT AVAILABLE instead
 * of claiming a clean result.
 *
 * Only paths inside `<project>/src` are ever opened, and every path
 * that leaves this module is repository-relative so no filesystem
 * layout is disclosed.
 */

const SCAN_ROOT = "src";
const MAX_FILES = 600;
const MAX_FILE_BYTES = 512 * 1024;

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".next",
  ".git",
  "out",
  "dist",
  "build",
  "coverage",
]);

const SCAN_EXTENSIONS = [".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"];

export interface SourceFile {
  /** Repository-relative, always forward-slashed. */
  path: string;
  lines: string[];
}

export interface SourceTree {
  available: boolean;
  unavailableReason?: string;
  root: string;
  files: SourceFile[];
  truncated: boolean;
}

function projectRoot(): string {
  return process.cwd();
}

export function toRepoPath(absolute: string): string {
  return relative(projectRoot(), absolute).split(sep).join("/");
}

/**
 * Read the scannable source tree once per scan.
 */
export async function loadSourceTree(): Promise<SourceTree> {
  const root = join(projectRoot(), SCAN_ROOT);

  try {
    const info = await stat(root);

    if (!info.isDirectory()) {
      return unavailable(root, "The source directory is not a directory.");
    }
  } catch {
    return unavailable(
      root,
      "The project source tree is not present in this runtime. Static audits require a deployment that ships `src/`, such as a container or a development server.",
    );
  }

  const files: SourceFile[] = [];
  let truncated = false;

  const walk = async (directory: string): Promise<void> => {
    if (files.length >= MAX_FILES) {
      truncated = true;
      return;
    }

    let entries;

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      // An unreadable directory must not end the scan.
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        truncated = true;
        return;
      }

      if (entry.name.startsWith(".") || SKIP_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const absolute = join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }

      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) continue;

      try {
        const info = await stat(absolute);

        // A very large generated file is skipped rather than buffered.
        if (info.size > MAX_FILE_BYTES) continue;

        const text = await readFile(absolute, "utf8");

        files.push({
          path: toRepoPath(absolute),
          lines: text.split(/\r?\n/),
        });
      } catch {
        // Skip anything unreadable and keep auditing the rest.
      }
    }
  };

  await walk(root);

  return {
    available: true,
    root: SCAN_ROOT,
    files,
    truncated,
  };
}

function unavailable(root: string, reason: string): SourceTree {
  return {
    available: false,
    unavailableReason: reason,
    root: toRepoPath(root),
    files: [],
    truncated: false,
  };
}

/**
 * Read one JSON file from the project root, such as `package.json`.
 */
export async function readProjectJson<T>(
  name: string,
): Promise<T | null> {
  try {
    const text = await readFile(join(projectRoot(), name), "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * True when the project root contains this file.
 */
export async function projectFileExists(name: string): Promise<boolean> {
  try {
    const info = await stat(join(projectRoot(), name));
    return info.isFile();
  } catch {
    return false;
  }
}
