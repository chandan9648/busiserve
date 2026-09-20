import PricingToggle from "@/components/PricingToggle";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Pricing",
};

export default function PricingPage() {
  return (
    <>
      <main>
        <section className="container-site py-16 text-center md:py-20">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">
            Transparent Pricing for Growth
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-[#434750]">
            Choose the perfect plan to scale your operations. No hidden fees,
            just reliable service tailored to your enterprise needs.
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