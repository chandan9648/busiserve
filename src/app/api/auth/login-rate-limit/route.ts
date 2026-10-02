import { NextResponse } from "next/server";
import { z } from "zod";

import {
  LOGIN_CAPACITY,
  LOGIN_WINDOW_MS,
  loginRateLimitKey,
  resetLoginLimit,
  takeLoginToken,
  type LoginLimit,
} from "@/lib/portal/login-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guards /login for users and administrators alike:
 *
 *   "attempt" takes one token before the password is checked
 *   "success" returns the bucket to full after a valid sign-in
 */
const schema = z.object({
  stage: z.enum(["attempt", "success"]),
  email: z.string().trim().max(254).email(),
});

function json(data: unknown, status = 200, retryAfterMs = 0) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfterMs > 0
        ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) }
        : {}),
    },
  });
}

function callerAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function payload(limit: LoginLimit) {
  return {
    allowed: limit.allowed,
    remaining: limit.remaining,
    retryAfterMs: limit.retryAfterMs,
    capacity: LOGIN_CAPACITY,
    windowMs: LOGIN_WINDOW_MS,
  };
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    const text = await request.text();

    if (text.length > 1000) {
      return json({ error: "Request is too large." }, 413);
    }

    body = JSON.parse(text);
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return json({ error: "A valid email address is required." }, 400);
  }

  const key = loginRateLimitKey(parsed.data.email, callerAddress(request));

  try {
    if (parsed.data.stage === "success") {
      await resetLoginLimit(key);

      return json({ success: true });
    }

    const limit = await takeLoginToken(key);

    if (!limit.allowed) {
      return json(payload(limit), 429, limit.retryAfterMs);
    }

    return json(payload(limit));
  } catch (error) {
    // Firestore being unavailable must not lock everybody out of the
    // portal; Firebase Authentication still applies its own throttle.
    console.error("Login rate limit unavailable", {
      stage: parsed.data.stage,
      code:
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: unknown }).code)
          : "unknown",
    });

    return json(
      payload({
        allowed: true,
        remaining: LOGIN_CAPACITY,
        retryAfterMs: 0,
      }),
    );
  }
}
