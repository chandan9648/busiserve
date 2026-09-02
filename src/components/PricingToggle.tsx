"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { pricingPlans } from "@/lib/site-data";
import Link from "next/link";

export default function PricingToggle() {
  const [annual, setAnnual] = useState(true);

  return (
    <>
      <div className="mt-9 flex items-center justify-center gap-4 text-sm font-semibold text-[#434750]">
        <span>Monthly</span>
        <button
          type="button"
          onClick={() => setAnnual((v) => !v)}
          aria-label="Toggle annual pricing"
          className={`relative h-6 w-11 rounded-full transition ${annual ? "bg-[#001b40]" : "bg-[#c3c6d1]"}`}
        >
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${annual ? "right-1" : "left-1"}`} />
        </button>
        <span className="text-[#001b40]">Annually <span className="text-[#ff8927]">(Save 20%)</span></span>
      </div>

      <div className="mt-20 grid gap-7 lg:grid-cols-3">
        {pricingPlans.map((plan) => {
          const price = annual ? plan.annual : plan.monthly;
          return (
            <article key={plan.name} className={`relative rounded-md border bg-white p-7 ${plan.popular ? "border-2 border-[#003066] shadow-xl" : "border-[#c3c6d1]"}`}>
              {plan.popular && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#001b40] px-4 py-1 text-sm font-semibold text-white">
                  Most Popular
                </span>
              )}
              <span className="inline-flex bg-[#e5e8eb] px-3 py-1 text-xs font-semibold text-[#001b40]">{plan.label}</span>
              <h2 className="mt-5 text-3xl font-bold text-[#001b40]">{plan.name}</h2>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-extrabold text-[#001b40]">${price}</span>
                <span className="pb-2 text-sm text-[#434750]">/mo</span>
              </div>
              <p className="mt-2 text-sm text-[#434750]">{annual ? "Billed annually" : "Billed monthly"}</p>

              <ul className="mt-7 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3 text-sm text-[#434750]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#ff8927]" size={18} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.name === "Scale" ? "/contact" : `/contact?plan=${encodeURIComponent(plan.name)}`}
                className={`mt-9 block rounded-sm border px-5 py-3 text-center text-sm font-semibold transition ${
                  plan.popular
                    ? "border-[#ff8927] bg-[#ff8927] text-[#311400] hover:bg-[#964900] hover:text-white"
                    : "border-[#001b40] text-[#001b40] hover:bg-[#001b40] hover:text-white"
                }`}
              >
                {plan.name === "Scale" ? "Contact Sales" : "Select Plan"}
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
