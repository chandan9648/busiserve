import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RazorpayCheckout from "@/components/RazorpayCheckout";
import { privatePageMetadata } from "@/lib/seo";

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

  const plan = params.plan;

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
            <strong>{plan}</strong> plan.
          </p>

          <div className="mt-8">
            <RazorpayCheckout
              planName={plan}
            />
          </div>

        </div>

      </div>
    </main>
  );
}