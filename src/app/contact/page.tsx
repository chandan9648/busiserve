import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
  MessageSquare,
} from "lucide-react";

import { contactDefaults } from "@/lib/site-data";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, contactPageSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description:
    "Talk to Busiserve Infotech Solution in Noida about your website, app, business software or automation project. Get a free consultation.",
  path: "/contact",
  keywords: [
    "contact Busiserve",
    "hire web developers Noida",
    "software development enquiry",
    "free project consultation",
  ],
});

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

export default function ContactPage() {
  const address = contactDefaults.address.trim();

  const mapQuery = encodeURIComponent(address);

  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const phoneHref = `tel:${contactDefaults.phone.replace(
    /[^\d+]/g,
    "",
  )}`;

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Contact Us", path: "/contact" }])} />
      <JsonLd data={contactPageSchema()} />
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-white text-[#001b40]"
      >
        {/* Hero */}
        <section
          aria-labelledby="contact-title"
          className="border-b border-[#dce3ec] bg-[#f3f6fa] py-14 md:py-20"
        >
          <div className="container-site grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#964900]">
                Contact Busiserve
              </p>

              <h1
                id="contact-title"
                className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
              >
                Your next idea.
                <br />
                <span className="text-[#964900]">
                  Let’s talk about it.
                </span>
              </h1>
            </div>

            <div>
              <p className="max-w-xl text-lg leading-8 text-[#434750]">
                Have a project in mind, a question about our services or a
                partnership idea? Tell us what you’re working on and where you
                need support.
              </p>

              <a
                href="#contact-form"
                className={`mt-5 inline-flex min-h-12 items-center gap-3 rounded-lg font-bold text-[#964900] hover:underline ${focus}`}
              >
                Send us a message
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* Contact Details + Form */}
        <section
          aria-label="Contact details and enquiry form"
          className="py-14 md:py-20"
        >
          <div className="container-site grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
            <aside className="min-w-0 lg:col-span-5">
              <div className="rounded-2xl border border-[#dce3ec] bg-white p-6 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                  Let’s connect
                </p>

                <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                  Choose what works for you.
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#434750]">
                  Use the form to share project details, or reach us directly
                  using the information below.
                </p>

                <div className="mt-7 space-y-6">
                  <ContactInfo
                    icon={
                      <Mail
                        size={21}
                        aria-hidden="true"
                      />
                    }
                    title="Email us"
                    value={contactDefaults.email}
                    href={`mailto:${contactDefaults.email}`}
                  />

                  <ContactInfo
                    icon={
                      <Phone
                        size={21}
                        aria-hidden="true"
                      />
                    }
                    title="Call us"
                    value={contactDefaults.phone}
                    href={phoneHref}
                  />

                  {address && (
                    <ContactInfo
                      icon={
                        <MapPin
                          size={21}
                          aria-hidden="true"
                        />
                      }
                      title="Our location"
                      value={address}
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-[#001b40] p-6 text-white md:p-8">
                <MessageSquare
                  size={25}
                  className="text-[#ffac69]"
                  aria-hidden="true"
                />

                <h2 className="mt-4 text-xl font-bold">
                  A rough idea is enough to start.
                </h2>

                <p className="mt-3 text-sm leading-7 text-[#d0dded]">
                  Describe the problem you want to solve. If you already have
                  a website, a target date or a budget in mind, include those
                  details too.
                </p>

                <Link
                  href="/services"
                  className="mt-5 inline-flex min-h-12 items-center gap-2 rounded font-semibold text-[#ffac69] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffac69]"
                >
                  Explore our services
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </aside>

            {/* Contact Form */}
            <div
              id="contact-form"
              className="min-w-0 scroll-mt-28 lg:col-span-7"
            >
              <div className="rounded-2xl border border-[#dce3ec] bg-[#f7f9fc] p-5 md:p-8">
                <div className="mb-6 border-b border-[#dce3ec] pb-6">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                    Your project starts here
                  </p>

                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight md:text-3xl">
                    Tell us what you have in mind.
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#434750]">
                    Share a question, request an estimate or introduce a
                    partnership opportunity.
                  </p>
                </div>

                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* Location */}
        {address && (
          <section
            aria-labelledby="location-title"
            className="border-t border-[#e5ebf2] bg-[#f3f6fa] py-14 md:py-16"
          >
            <div className="container-site">
              <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                    Find us
                  </p>

                  <h2
                    id="location-title"
                    className="mt-3 text-3xl font-extrabold tracking-tight"
                  >
                    Our location.
                  </h2>

                  <p className="mt-3 max-w-2xl break-words leading-7 text-[#434750]">
                    {address}
                  </p>
                </div>

                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#bcc9d9] bg-white px-5 py-3 text-sm font-bold hover:bg-[#fff0e4] ${focus}`}
                >
                  Open in Google Maps
                  <ArrowUpRight
                    size={18}
                    aria-hidden="true"
                  />
                  <span className="sr-only">
                    {" "}
                    (opens in a new tab)
                  </span>
                </a>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-[#e5ebf2]">
                <iframe
                  title={`Busiserve location: ${address}`}
                  className="h-72 w-full border-0 md:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapEmbedUrl}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}

function ContactInfo({
  icon,
  title,
  value,
  href,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0e4] text-[#964900]">
        {icon}
      </span>

      <div className="min-w-0">
        <h3 className="font-bold">{title}</h3>

        <div className="mt-1 break-words text-sm leading-7 text-[#434750]">
          {href ? (
            <a
              href={href}
              className={`inline-block rounded py-1 underline decoration-[#c3c6d1] underline-offset-4 hover:text-[#964900] ${focus}`}
            >
              {value}
            </a>
          ) : (
            <span>{value}</span>
          )}
        </div>
      </div>
    </div>
  );
}