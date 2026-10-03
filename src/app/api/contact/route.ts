/**
 * POST /api/contact
 *
 * @security:public A contact form must accept a message from someone who
 * has no account; that is the entire purpose of the page. Anonymous write
 * volume is bounded by takeFormSlot instead.
 */
import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  callerAddress,
  takeFormSlot,
} from "@/lib/portal/form-rate-limit";
import { recordThreat } from "@/lib/security/events";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  try {
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.map(String).join(".") || "form",
        message: issue.message,
      }));

      console.error("Contact form validation failed:", details);

      return NextResponse.json(
        {
          success: false,
          error: details
            .map((issue) => `${issue.field}: ${issue.message}`)
            .join("; "),
          details,
        },
        { status: 400 }
      );
    }

    // Validated input, but still an anonymous write. Bound it per
    // address before it reaches Firestore.
    const limit = await takeFormSlot("contact", callerAddress(request));

    if (!limit.allowed) {
      void recordThreat("form-abuse", request, "/api/contact");

      return NextResponse.json(
        {
          success: false,
          error:
            "Too many messages sent from this network. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const db = getAdminDb();

    await db.collection("contactSubmissions").add({
      ...parsed.data,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      userAgent: request.headers.get("user-agent") ?? null,
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been submitted successfully.",
    });
  } catch (error) {
    console.error("Contact API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to submit form.",
      },
      { status: 500 }
    );
  }
}