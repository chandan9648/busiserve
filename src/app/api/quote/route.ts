import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { quoteSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase-admin";

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