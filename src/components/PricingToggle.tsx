import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import {
  PLANS,
  formatMoney,
  type PlanId,
} from "@/lib/portal/plans";

type PlanPresentation = {
  label: string;
  popular: boolean;
  features: string[];
};

// Presentation only.
// Prices, names, descriptions and allowances come from PLANS.
const presentation: Record<PlanId, PlanPresentation> = {
  starter: {
    label: "Small, occasional updates",
    popular: false,
    features: [
      "Text, image and link replacements",
      "Small colour, font or spacing adjustments",
      "One request handled at a time",
    ],
  },

  growth: {
    label: "Regular website improvements",
    popular: true,
    features: [
      "All Starter update types included",
      "Updates to existing banners and sections",
      "Small mobile layout adjustments",
      "One request handled at a time",
    ],
  },

  scale: {
    label: "Frequent content and layout updates",
    popular: false,
    features: [
      "All Growth update types included",
      "Updates across existing website pages",
      "An agreed order for your update requests",
      "One request handled at a time",
    ],
  },
};

export default function PricingToggle() {
  return (
    <div className="mt-9 text-[#001b40]">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#dce3ec] bg-[#eef3fa] px-4 py-2 text-sm font-semibold">
          <CalendarDays size={17} aria-hidden="true" />
          One-month website update subscriptions
        </span>

        <p className="mt-4 text-base leading-7 text-[#434750]">
          Choose how many small changes you need. Each plan covers one
          existing website for one calendar month.
        </p>

        <p className="mt-2 text-sm leading-6 text-[#434750]">
          Sign in to purchase a plan and track your subscription,
          expiry date and remaining changes.
        </p>
      </div>

      <div className="mt-12 grid items-stretch gap-7 lg:grid-cols-3">
        {Object.values(PLANS).map((plan) => {
          const details = presentation[plan.id];

          const features = [
            "1 calendar month of website update support",
            `${plan.changes} small change requests during your month`,
            ...details.features,
          ];

          return (
            <article
              key={plan.id}
              className={`relative flex min-w-0 flex-col rounded-2xl border-2 bg-white p-6 sm:p-8 ${
                details.popular
                  ? "border-[#003066] shadow-lg"
                  : "border-[#e0e6ee]"
              }`}
            >
              {details.popular && (
                <span className="absolute -top-4 left-6 rounded-full bg-[#001b40] px-4 py-1.5 text-xs font-bold tracking-wide text-white">
                  For regular updates
                </span>
              )}

              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#964900]">
                {details.label}
              </p>

              <h3 className="mt-4 text-2xl font-extrabold tracking-tight">
                {plan.name}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#434750]">
                {plan.description}
              </p>

              <div className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  {formatMoney(plan.amount)}
                </span>

                <span className="text-sm text-[#434750]">
                  / month
                </span>
              </div>

              <p className="mt-2 text-xs leading-6 text-[#434750]">
                One-month purchase · No automatic renewal
              </p>

              <div className="mt-6 flex items-center gap-3 rounded-xl border border-[#f2d9c5] bg-[#fff3e9] p-4">
                <RefreshCw
                  size={20}
                  className="shrink-0 text-[#964900]"
                  aria-hidden="true"
                />

                <p className="text-sm leading-6">
                  <strong className="text-lg">
                    {plan.changes} small changes
                  </strong>

                  <span className="block text-[#434750]">
                    included during your month
                  </span>
                </p>
              </div>

              <ul className="mt-7 list-none space-y-4 p-0">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm leading-6 text-[#434750]"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-1 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href="/dashboard"
                  aria-label={`Open your dashboard to purchase ${plan.name}`}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-5 py-3.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900] motion-reduce:transition-none ${
                    details.popular
                      ? "border-[#ff8927] bg-[#ff8927] text-[#001b40] hover:bg-[#ffac69]"
                      : "border-[#001b40] text-[#001b40] hover:bg-[#001b40] hover:text-white"
                  }`}
                >
                  Choose {plan.name}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>

                <p className="mt-3 text-center text-xs leading-5 text-[#434750]">
                  Complete your purchase in your dashboard.
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <section
        aria-labelledby="subscription-start-title"
        className="mt-8 rounded-2xl border border-[#dce3ec] bg-white p-6 md:p-8"
      >
        <h3
          id="subscription-start-title"
          className="text-xl font-bold"
        >
          When does your subscription start?
        </h3>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="font-semibold text-[#001b40]">
              Your first purchase
            </p>

            <p className="mt-2 text-sm leading-7 text-[#434750]">
              Your first month starts when your payment is verified.
              Your dashboard shows the exact activation and expiry
              dates.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#001b40]">
              Renewing early
            </p>

            <p className="mt-2 text-sm leading-7 text-[#434750]">
              Your next month starts after your existing paid periods
              finish. Each period receives its own change allowance.
              Renewals require a new purchase.
            </p>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="change-scope-title"
        className="mt-8 rounded-2xl border border-[#dce3ec] bg-[#f3f6fa] p-6 md:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3
              id="change-scope-title"
              className="text-xl font-bold"
            >
              What counts as one small change?
            </h3>

            <p className="mt-3 text-sm leading-7 text-[#434750]">
              One focused update to an existing element or
              section—for example, replacing a banner using an image
              you provide, updating a contact number, or adjusting
              the spacing in one section. Several unrelated updates
              count as separate requests. We confirm the scope
              before work starts.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold">
              A clear scope for your month
            </h3>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[#434750]">
              <li>
                Requests cover one existing website and must fit the
                small-change scope.
              </li>

              <li>
                Unused requests expire with their subscription
                period and do not roll over.
              </li>

              <li>
                New pages, redesigns, new features and complex fixes
                need a separate quote.
              </li>

              <li>
                Hosting, domains, paid tools and third-party
                charges are separate.
              </li>

              <li>
                Your account shows your plan, expiry countdown,
                verified payments and remaining change allowance.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <p className="mt-6 text-center text-sm leading-7 text-[#434750]">
        Need a new website or a larger development project?{" "}
        <Link
          href="/contact"
          className="rounded font-semibold text-[#964900] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]"
        >
          Request a custom quote
        </Link>
        .
      </p>
    </div>
  );
}