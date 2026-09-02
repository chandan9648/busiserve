import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid quote data." }, { status: 400 });
    }

    const db = getAdminDb();

    await db.collection("quoteRequests").add({
      ...parsed.data,
      status: "new",
      createdAt: FieldValue.serverTimestamp(),
      userAgent: request.headers.get("user-agent") ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quote API error:", error);
    return NextResponse.json({ error: "Unable to submit quote request." }, { status: 500 });
  }
}
