import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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