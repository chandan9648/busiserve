import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import RazorpayCheckout from "@/components/RazorpayCheckout";
import { privatePageMetadata } from "@/lib/seo";
import { PLANS, formatMoney } from "@/lib/portal/plans";

export const metadata: Metadata = privatePageMetadata("Checkout");

interface Props {
  searchParams: Promise<{
    plan?: string;
  }>;
}

export default async function CheckoutPage({
  searchParams,
}: Props) {
  const params = await searchParams;

  const requested = params.plan?.trim();

  /*
   * The plan is resolved against PLANS before anything is shown.
   *
   * This page previously printed whatever the `plan` query parameter
   * contained and charged for it, so the page could name a plan that
   * does not exist and could not state its price. A buyer must see
   * the actual price, duration and allowance before paying, and an
   * unrecognised plan belongs back on the pricing page.
   */
  const plan = requested
    ? Object.values(PLANS).find(
        (item) =>
          item.name.toLowerCase() === requested.toLowerCase() ||
          item.id === requested.toLowerCase(),
      )
    : undefined;

  if (!plan) {
    redirect("/pricing");
  }

  return (
    <main className="min-h-[70vh] bg-[#f7fafd] py-20">
      <div className="container-site mx-auto max-w-2xl">

        <div className="rounded-xl border border-[#c3c6d1] bg-white p-8 shadow-sm">

          <h1 className="text-3xl font-bold text-[#001b40]">
            Complete Your Order
          </h1>

          <p className="mt-3 text-[#434750]">
            You are purchasing the{" "}
            <strong>{plan.name}</strong> plan.
          </p>

          <dl className="mt-6 grid gap-4 rounded-xl bg-[#f1f4f7] p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-[#434750]">Price</dt>
              <dd className="mt-1 text-2xl font-bold text-[#001b40]">
                {formatMoney(plan.amount)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#434750]">Duration</dt>
              <dd className="mt-1 font-semibold text-[#001b40]">
                One calendar month
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#434750]">Included changes</dt>
              <dd className="mt-1 font-semibold text-[#001b40]">
                {plan.changes} small change requests
              </dd>
            </div>

            <div>
              <dt className="text-sm text-[#434750]">Renewal</dt>
              <dd className="mt-1 font-semibold text-[#001b40]">
                None — a separate purchase for each month
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-sm leading-7 text-[#434750]">
            {plan.description} Prices are in US dollars. Unused change
            requests expire with the month and do not carry over.
          </p>

          <div className="mt-8">
            <RazorpayCheckout
              planName={plan.name}
            />
          </div>

          <p className="mt-4 text-xs leading-6 text-[#434750]">
            By paying you agree to our{" "}
            <Link href="/terms" className="font-semibold text-[#964900] underline underline-offset-4">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="font-semibold text-[#964900] underline underline-offset-4">
              Refund &amp; Cancellation Policy
            </Link>
            . See our{" "}
            <Link href="/privacy" className="font-semibold text-[#964900] underline underline-offset-4">
              Privacy Policy
            </Link>{" "}
            for how your information is handled.
          </p>

        </div>

      </div>
    </main>
  );
}