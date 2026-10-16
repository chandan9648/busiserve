import type { Metadata } from "next";
import PricingToggle from "@/components/PricingToggle";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { faqs } from "@/lib/site-data";
import { breadcrumbSchema, faqSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Website Update Plans & Pricing",
  description:
    "One-month website update plans from Busiserve: Starter, Growth and Scale, each covering a set number of small changes to a site we have already built for you.",
  path: "/pricing",
  keywords: [
    "website maintenance plans",
    "website update subscription",
    "website support pricing",
  ],
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Pricing", path: "/pricing" }])} />
      <JsonLd data={faqSchema(faqs)} />
      <main>
        <section className="container-site py-16 text-center md:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">
            Website Update Plans
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-[#434750]">
            One-month plans for small changes to a website Busiserve has
            already built for you. Every plan shows its price, its duration
            and exactly how many change requests it includes. New websites
            and larger development work are quoted separately.
          </p>

          <PricingToggle />
        </section>

        <section className="bg-[#f1f4f7] py-20">
          <div className="container-site text-center">
            <h2 className="text-3xl font-bold text-[#001b40]">
              Frequently Asked Questions
            </h2>

            <p className="mt-3 text-[#434750]">
              Need more details? We&apos;re here to help you make the right
              choice.
            </p>

            <FAQ />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}