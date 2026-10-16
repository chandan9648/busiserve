import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";

import { prototypeImages, approach } from "@/lib/site-data";
import {
  serviceCardTitle,
  serviceCatalogue,
  serviceCategories,
  servicePath,
  type ServiceDetail,
} from "@/lib/services-catalogue";
import QuoteForm from "@/components/QuoteForm";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata, serviceCatalogSchema } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Software Development Services",
  description:
    "Website, WordPress, Shopify and app development, UI/UX design, CMS, CRM, ERP, API integration and n8n automation, from Busiserve in Noida.",
  path: "/services",
  keywords: [
    "software development services",
    "website development services",
    "mobile app development services",
    "CRM and ERP development",
    "API integration services",
  ],
});

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

/** Two digits, to match the typographic treatment of the category numbers. */
const padded = (value: number) => String(value).padStart(2, "0");

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Services", path: "/services" }])} />
      <JsonLd
        data={serviceCatalogSchema(
          serviceCatalogue.map((service) => ({
            title: service.title,
            description: service.short,
          })),
        )}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-white text-[#001b40]"
      >
        {/* Hero */}
        <section
          aria-labelledby="services-title"
          className="overflow-hidden border-b border-[#dce3ec] bg-[#f3f6fa] py-12 md:py-20"
        >
          <div className="container-site grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#964900]">
                Busiserve / Our expertise
              </p>

              <h1
                id="services-title"
                className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
              >
                Big ideas need
                <br />
                the right{" "}
                <span className="text-[#964900]">expertise.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[#434750]">
                Launch a product. Improve your operations. Connect your
                systems. Find the right starting point for what your business
                needs next.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#service-categories"
                  className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#001b40] px-6 py-3.5 font-semibold text-white hover:bg-[#003066] ${focus}`}
                >
                  Find your service
                  <ArrowRight size={18} aria-hidden="true" />
                </a>

                <a
                  href="#quote"
                  className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#bcc9d9] px-6 py-3.5 font-semibold hover:bg-white ${focus}`}
                >
                  Start a project enquiry
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#dce3ec] pt-6">
                <p>
                  <strong className="text-2xl font-extrabold">
                    {padded(serviceCatalogue.length)}
                  </strong>
                  <span className="ml-2 text-sm text-[#434750]">
                    specialist services
                  </span>
                </p>

                <p>
                  <strong className="text-2xl font-extrabold">
                    {padded(serviceCategories.length)}
                  </strong>
                  <span className="ml-2 text-sm text-[#434750]">
                    areas of expertise
                  </span>
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white shadow-sm">
              <Image
                src={prototypeImages.servicesHero}
                alt="Team discussing a digital project"
                width={640}
                height={460}
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="aspect-[4/3] w-full object-cover"
              />

              <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#964900]">
                    Your starting point
                  </p>

                  <p className="mt-2 text-lg font-bold">
                    What should work better?
                  </p>
                </div>

                <a
                  href="#quote"
                  aria-label="Discuss what should work better in your business"
                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#ff8927] text-[#001b40] hover:bg-[#ffac69] ${focus}`}
                >
                  <ArrowRight size={21} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Service Categories Navigation */}
        <nav
          id="service-categories"
          aria-label="Service categories"
          className="scroll-mt-28 border-b border-[#dce3ec] bg-white"
        >
          <div className="container-site grid grid-cols-1 gap-2 py-5 sm:grid-cols-2 xl:grid-cols-5">
            {serviceCategories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#eef3fa] ${focus}`}
              >
                <span>
                  <span className="mr-3 text-[#964900]">
                    {category.number}
                  </span>
                  {category.label}
                </span>

                <ArrowRight size={16} aria-hidden="true" />
              </a>
            ))}
          </div>
        </nav>

        {/* Service Categories */}
        {serviceCategories.map((category, index) => {
          const items = category.services
            .map((slug) =>
              serviceCatalogue.find((service) => service.slug === slug),
            )
            .filter((service): service is ServiceDetail => Boolean(service));

          return (
            <section
              key={category.id}
              id={category.id}
              aria-labelledby={`${category.id}-title`}
              className={`scroll-mt-24 border-b border-[#e5ebf2] py-14 md:py-20 ${
                index % 2 ? "bg-[#f7f9fc]" : "bg-white"
              }`}
            >
              <div className="container-site">
                <div className="mb-9 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                      {category.number} / {category.label}
                    </p>

                    <h2
                      id={`${category.id}-title`}
                      className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl"
                    >
                      {category.title}
                    </h2>
                  </div>

                  <p className="max-w-xl leading-8 text-[#434750]">
                    {category.description}
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((service) => (
                    <DetailedService key={service.slug} service={service} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* Approach */}
        <section
          aria-labelledby="approach-title"
          className="bg-[#001b40] py-14 text-white md:py-20"
        >
          <div className="container-site">
            <div className="grid gap-5 lg:grid-cols-2 lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ffac69]">
                  From brief to build
                </p>

                <h2
                  id="approach-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
                >
                  A clear path forward.
                </h2>
              </div>

              <p className="max-w-xl leading-8 text-[#d0dded]">
                Start with the problem you need to solve. Together, we can
                define the scope, agree on priorities and shape a practical
                delivery plan.
              </p>
            </div>

            <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-4">
              {approach.map((item) => (
                <li
                  key={item.step}
                  className="border-t border-[#4b6380] pt-6"
                >
                  <span className="text-sm font-bold text-[#ffac69]">
                    {item.step}
                  </span>

                  <h3 className="mt-4 text-lg font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#d0dded]">
                    {item.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Quote */}
        <section
          id="quote"
          aria-labelledby="quote-title"
          className="scroll-mt-24 bg-[#f3f6fa] py-14 md:py-20"
        >
          <div className="container-site grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="lg:pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                Your next step
              </p>

              <h2
                id="quote-title"
                className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl"
              >
                Bring the challenge.
                <br />
                Let’s plan the solution.
              </h2>

              <p className="mt-6 max-w-lg text-lg leading-8 text-[#434750]">
                Tell us what you want to improve and which service caught
                your attention. You don’t need a technical brief to start
                the conversation.
              </p>

              <ul className="mt-7 list-none space-y-4 p-0 text-[#434750]">
                {[
                  "What you want to build or improve",
                  "The tools or systems you already use",
                  "Your timeline and budget, if known",
                ].map((text) => (
                  <li
                    key={text}
                    className="flex items-start gap-3"
                  >
                    <Check
                      size={19}
                      className="mt-0.5 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />

                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={`mt-7 inline-flex min-h-12 items-center gap-2 font-semibold text-[#964900] hover:underline ${focus}`}
              >
                View contact options
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 shadow-sm md:p-9">
              <h3 className="text-xl font-bold tracking-tight">
                Start a project enquiry
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#434750]">
                Every service is quoted after a requirement discussion. Send
                the details and we will come back with next steps.
              </p>

              <div className="mt-6">
                <QuoteForm showProjectFields submitLabel="Send enquiry" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}

/**
 * A service card.
 *
 * The footer action now opens the service's own detail page rather
 * than jumping to the form at the bottom of this page, which gave
 * the enquiry no context about what the visitor had clicked.
 */
function DetailedService({ service }: { service: ServiceDetail }) {
  const Icon = service.icon;
  const title = serviceCardTitle(service);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#001b40] text-[#ffac69]">
          <Icon size={24} aria-hidden="true" />
        </div>

        <h3 className="text-xl font-bold tracking-tight">
          <Link
            href={servicePath(service.slug)}
            className={`rounded-sm hover:text-[#964900] ${focus}`}
          >
            {title}
          </Link>
        </h3>

        <p className="mt-3 text-sm leading-7 text-[#434750]">
          {service.short}
        </p>

        <ul className="mt-5 flex list-none flex-wrap gap-2 p-0">
          {service.techBadges.map((badge) => (
            <li
              key={badge}
              className="rounded-md border border-[#dce3ec] bg-[#f7f9fc] px-2.5 py-1 text-[11px] font-semibold text-[#003066]"
            >
              {badge}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#964900]">
          What we can help with
        </p>

        <ul className="mt-4 list-none space-y-3 p-0">
          {service.deliverables.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm leading-6 text-[#434750]"
            >
              <Check
                size={16}
                className="mt-1 shrink-0 text-[#964900]"
                aria-hidden="true"
              />

              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={servicePath(service.slug)}
        aria-label={`Discuss ${title} — view service details`}
        className={`flex min-h-14 items-center justify-between gap-3 border-t border-[#e5ebf2] bg-[#f7f9fc] px-6 py-4 text-sm font-bold hover:bg-[#fff0e4] md:px-7 ${focus}`}
      >
        Discuss this service
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}
