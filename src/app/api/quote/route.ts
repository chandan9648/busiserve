import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { quoteSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  callerAddress,
  takeFormSlot,
} from "@/lib/portal/form-rate-limit";
import { recordThreat } from "@/lib/security/events";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid quote data.",
        },
        {
          status: 400,
        }
      );
    }

    const db = getAdminDb();

    // Validated input, but still an anonymous write. Bound it per
    // address before it reaches Firestore.
    const limit = await takeFormSlot("quote", callerAddress(request));

    if (!limit.allowed) {
      void recordThreat("form-abuse", request, "/api/quote");

      return NextResponse.json(
        {
          error:
            "Too many requests sent from this network. Please try again shortly.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const quoteRef = await db
      .collection("quote_requests")
      .add({
        ...parsed.data,

        status: "new",

        user_agent:
          request.headers.get("user-agent") ?? null,

        createdAt: FieldValue.serverTimestamp(),

        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json(
      {
        success: true,
        id: quoteRef.id,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Quote API error:", error);

    return NextResponse.json(
      {
        error: "Unable to submit quote request.",
      },
      {
        status: 500,
      }
    );
  }
}