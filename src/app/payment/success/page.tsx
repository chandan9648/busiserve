import type { Metadata } from "next";
import Link from "next/link";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Payment Successful");

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    order?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-[70vh] bg-[#f7fafd] px-5 py-24">
      <div className="mx-auto max-w-xl rounded-xl border border-[#c3c6d1] bg-white p-10 text-center shadow-sm">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
          ✓
        </div>

        <h1 className="mt-6 text-3xl font-bold text-[#001b40]">
          Payment Successful
        </h1>

        <p className="mt-4 text-[#434750]">
          Thank you for choosing BusiServe.
          Your payment has been successfully received.
        </p>

        {params.order && (
          <p className="mt-4 text-sm text-[#434750]">
            Order Number:
            <strong className="ml-2">
              {params.order}
            </strong>
          </p>
        )}

        <p className="mt-4 text-sm text-[#434750]">
          Your invoice has been generated and sent
          to your registered email address.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

          <Link
            href="/dashboard"
            className="rounded-md bg-[#001b40] px-6 py-3 font-semibold text-white"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/"
            className="rounded-md border border-[#001b40] px-6 py-3 font-semibold text-[#001b40]"
          >
            Back to Home
          </Link>

        </div>

      </div>
    </main>
  );
}