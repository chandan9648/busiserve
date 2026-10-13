import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock,
  Layers,
  PlusCircle,
  Target,
  Wrench,
} from "lucide-react";

import {
  formatProjectPrice,
  getService,
  projectWorkflow,
  serviceCardTitle,
  servicePath,
  serviceSlugs,
  TECH_SCOPE_NOTE,
  type ServiceDetail,
  type ServiceTiers,
} from "@/lib/services-catalogue";
import QuoteForm from "@/components/QuoteForm";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumbSchema,
  pageMetadata,
  serviceSchema,
} from "@/lib/seo";

/**
 * Service detail pages.
 *
 * One route renders all of them from the catalogue, so a new service
 * needs a catalogue entry and nothing else: the card, this page, the
 * sitemap entry and the enquiry option all follow from it.
 */
export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    return { title: "Service not found" };
  }

  return pageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: servicePath(service.slug),
  });
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

export default async function ServiceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    notFound();
  }

  const Icon = service.icon;
  const title = serviceCardTitle(service);
  const path = servicePath(service.slug);

  const publishedPrices = (service.tiers?.items ?? [])
    .map((tier) => tier.startingPrice)
    .filter((price): price is number => typeof price === "number");

  const lowestPrice = publishedPrices.length
    ? Math.min(...publishedPrices)
    : null;

  const related = service.related
    .map((relatedSlug) => getService(relatedSlug))
    .filter((item): item is ServiceDetail => Boolean(item));

  const enquiryHref = "#enquiry";

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Services", path: "/services" },
          { name: service.title, path },
        ])}
      />
      <JsonLd
        data={serviceSchema({
          name: service.title,
          description: service.short,
          path,
          startingPrice: lowestPrice,
        })}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="bg-white text-[#001b40]"
      >
        {/* Hero */}
        <section
          aria-labelledby="service-title"
          className="border-b border-[#dce3ec] bg-[#f3f6fa] py-10 md:py-16"
        >
          <div className="container-site">
            <Link
              href="/services"
              className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#964900] hover:underline ${focus}`}
            >
              <ArrowLeft size={17} aria-hidden="true" />
              All services
            </Link>

            <div className="mt-6 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start lg:gap-16">
              <div className="min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#001b40] text-[#ffac69]">
                  <Icon size={24} aria-hidden="true" />
                </div>

                <h1
                  id="service-title"
                  className="mt-6 text-3xl font-extrabold leading-[1.12] tracking-[-0.04em] sm:text-4xl lg:text-5xl"
                >
                  {service.title}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#434750]">
                  {service.short}
                </p>

                <ul className="mt-6 flex list-none flex-wrap gap-2 p-0">
                  {service.techBadges.map((badge) => (
                    <li
                      key={badge}
                      className="rounded-md border border-[#dce3ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#003066]"
                    >
                      {badge}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={enquiryHref}
                    className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#001b40] px-6 py-3.5 font-semibold text-white hover:bg-[#003066] ${focus}`}
                  >
                    Discuss your project
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>

                  <a
                    href={enquiryHref}
                    className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#bcc9d9] bg-white px-6 py-3.5 font-semibold hover:bg-[#fff0e4] ${focus}`}
                  >
                    Request a quote
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>

                  {service.tiers && (
                    <a
                      href="#tiers"
                      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl px-6 py-3.5 font-semibold text-[#964900] hover:bg-white ${focus}`}
                    >
                      Compare service tiers
                      <ArrowRight size={18} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>

              {/* On this page */}
              <nav
                aria-label="On this page"
                className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                  On this page
                </p>

                <ul className="mt-4 list-none space-y-1 p-0 text-sm font-semibold">
                  {[
                    { href: "#overview", label: "Overview" },
                    { href: "#suitable", label: "Who it suits" },
                    { href: "#features", label: "Features and deliverables" },
                    { href: "#technologies", label: "Technologies" },
                    ...(service.tiers
                      ? [{ href: "#tiers", label: "Service tiers" }]
                      : []),
                    { href: "#workflow", label: "Project workflow" },
                    { href: "#timeline", label: "Timeline" },
                    { href: "#add-ons", label: "Add-ons and exclusions" },
                    { href: "#enquiry", label: "Start an enquiry" },
                  ].map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-[#eef3fa] ${focus}`}
                      >
                        {item.label}
                        <ArrowRight
                          size={15}
                          className="shrink-0 text-[#964900]"
                          aria-hidden="true"
                        />
                      </a>
                    </li>
                  ))}
                </ul>

                {lowestPrice !== null ? (
                  <p className="mt-5 border-t border-[#e5ebf2] pt-5 text-sm leading-6 text-[#434750]">
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                      Projects start from
                    </span>
                    <strong className="mt-1 block text-2xl font-extrabold text-[#001b40]">
                      {formatProjectPrice(lowestPrice)}
                    </strong>
                    Indicative, for a one-time project.
                  </p>
                ) : (
                  <p className="mt-5 border-t border-[#e5ebf2] pt-5 text-sm leading-6 text-[#434750]">
                    <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                      Pricing
                    </span>
                    Quoted after a requirement discussion.
                  </p>
                )}
              </nav>
            </div>
          </div>
        </section>

        {/* Overview */}
        <Section id="overview" title="Overview" labelledBy="overview-title">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
            <div className="max-w-2xl space-y-5">
              {service.overview.map((paragraph) => (
                <p key={paragraph} className="leading-8 text-[#434750]">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-[#f7f9fc] p-6">
              <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.1em] text-[#964900]">
                <Target size={17} aria-hidden="true" />
                Problems this solves
              </h3>

              <ul className="mt-4 list-none space-y-3 p-0">
                {service.problems.map((problem) => (
                  <li
                    key={problem}
                    className="flex items-start gap-2.5 text-sm leading-6 text-[#434750]"
                  >
                    <Check
                      size={16}
                      className="mt-1 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Who it suits */}
        <Section
          id="suitable"
          title="Who this service suits"
          labelledBy="suitable-title"
          tinted
        >
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {service.suitableFor.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-xl border border-[#dce3ec] bg-white p-5 leading-7 text-[#434750]"
              >
                <Check
                  size={18}
                  className="mt-1 shrink-0 text-[#964900]"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Features */}
        <Section
          id="features"
          title="Features and deliverables"
          labelledBy="features-title"
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {service.features.map((group) => (
              <div
                key={group.group}
                className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6"
              >
                <h3 className="flex items-center gap-2.5 text-base font-bold tracking-tight">
                  <Wrench
                    size={17}
                    className="shrink-0 text-[#964900]"
                    aria-hidden="true"
                  />
                  {group.group}
                </h3>

                <ul className="mt-4 list-none space-y-3 p-0">
                  {group.items.map((item) => (
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
            ))}
          </div>
        </Section>

        {/* Technologies */}
        <Section
          id="technologies"
          title="Technologies we use"
          labelledBy="technologies-title"
          tinted
          intro={TECH_SCOPE_NOTE}
        >
          <div className="grid gap-5 lg:grid-cols-3">
            {service.tech.map((group) => (
              <div
                key={group.label}
                className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6"
              >
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#964900]">
                  {group.label}
                </h3>

                <dl className="mt-4 space-y-4">
                  {group.items.map((item) => (
                    <div key={item.name}>
                      <dt className="text-sm font-bold">{item.name}</dt>
                      <dd className="mt-1 text-sm leading-6 text-[#434750]">
                        {item.purpose}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-6">
            <a
              href={enquiryHref}
              className={`inline-flex min-h-12 items-center gap-2 font-semibold text-[#964900] hover:underline ${focus}`}
            >
              Ask about technologies
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </p>
        </Section>

        {/* Tiers */}
        {service.tiers && (
          <Section
            id="tiers"
            title="Service tiers"
            labelledBy="tiers-title"
            intro={service.tiers.note}
          >
            <Tiers tiers={service.tiers} enquiryHref={enquiryHref} />
          </Section>
        )}

        {/* Workflow */}
        <Section
          id="workflow"
          title="How a project runs"
          labelledBy="workflow-title"
          tinted
          intro="The same stages apply to every project. Which of them are included, and how long each takes, is set out in your proposal."
        >
          <ol className="grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {projectWorkflow.map((stage) => (
              <li
                key={stage.step}
                className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6"
              >
                <span className="text-sm font-bold text-[#964900]">
                  {stage.step}
                </span>

                <h3 className="mt-3 text-base font-bold tracking-tight">
                  {stage.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#434750]">
                  {stage.description}
                </p>
              </li>
            ))}
          </ol>
        </Section>

        {/* Timeline */}
        <Section id="timeline" title="Timeline" labelledBy="timeline-title">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            <div className="max-w-2xl">
              <p className="leading-8 text-[#434750]">
                A delivery estimate is given in the written proposal, once
                the scope is agreed. Estimates are not delivery guarantees:
                the date moves with the scope and with how quickly reviews
                and content come back.
              </p>

              <h3 className="mt-7 flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.1em] text-[#964900]">
                <Clock size={17} aria-hidden="true" />
                What affects the timeline
              </h3>

              <ul className="mt-4 list-none space-y-3 p-0">
                {service.timelineDrivers.map((driver) => (
                  <li
                    key={driver}
                    className="flex items-start gap-2.5 leading-7 text-[#434750]"
                  >
                    <Check
                      size={17}
                      className="mt-1.5 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-[#f7f9fc] p-6">
              <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.1em] text-[#964900]">
                <CircleDollarSign size={17} aria-hidden="true" />
                How pricing works
              </h3>

              <p className="mt-4 text-sm leading-7 text-[#434750]">
                {lowestPrice !== null
                  ? `Projects start from ${formatProjectPrice(
                      lowestPrice,
                    )}. That is an indicative starting price: the final scope, deliverables and cost are confirmed in a written proposal after a requirement assessment.`
                  : "This service is quoted per project. Tell us what you need and we will come back with a written proposal covering scope, deliverables, timeline and cost."}
              </p>

              <p className="mt-4 text-sm leading-7 text-[#434750]">
                A project quotation is separate from the{" "}
                <Link
                  href="/pricing"
                  className={`font-semibold text-[#964900] hover:underline ${focus}`}
                >
                  monthly care plans
                </Link>
                , which cover ongoing changes after launch.
              </p>
            </div>
          </div>
        </Section>

        {/* Add-ons and exclusions */}
        <Section
          id="add-ons"
          title="Add-ons and what is not included"
          labelledBy="add-ons-title"
          tinted
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 md:p-7">
              <h3 className="flex items-center gap-2.5 text-base font-bold tracking-tight">
                <PlusCircle
                  size={18}
                  className="shrink-0 text-[#964900]"
                  aria-hidden="true"
                />
                Optional add-ons
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#434750]">
                Quoted separately, on top of the agreed scope.
              </p>

              <ul className="mt-4 list-none space-y-3 p-0">
                {service.addOns.map((item) => (
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

            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 md:p-7">
              <h3 className="flex items-center gap-2.5 text-base font-bold tracking-tight">
                <AlertCircle
                  size={18}
                  className="shrink-0 text-[#964900]"
                  aria-hidden="true"
                />
                Third-party costs and exclusions
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#434750]">
                Paid directly to the provider, or outside the project scope.
              </p>

              <ul className="mt-4 list-none space-y-3 p-0">
                {service.exclusions.map((item) => (
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
          </div>
        </Section>

        {/* Enquiry */}
        <section
          id="enquiry"
          aria-labelledby="enquiry-title"
          className="scroll-mt-24 border-t border-[#e5ebf2] bg-[#f3f6fa] py-14 md:py-20"
        >
          <div className="container-site grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="lg:pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                Start a project enquiry
              </p>

              <h2
                id="enquiry-title"
                className="mt-5 text-3xl font-extrabold leading-tight tracking-tight md:text-4xl"
              >
                Let’s talk about your
                <br />
                {title} project.
              </h2>

              <p className="mt-6 max-w-lg leading-8 text-[#434750]">
                {title} is already selected below. Send a few details and we
                will come back with next steps and a written proposal — you
                don’t need a technical brief to start.
              </p>

              <ul className="mt-7 list-none space-y-4 p-0 text-[#434750]">
                {[
                  "What you want to build or improve",
                  "The tools or systems you already use",
                  "Your timeline and budget, if known",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <Check
                      size={19}
                      className="mt-0.5 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
                <Link
                  href="/contact"
                  className={`inline-flex min-h-12 items-center gap-2 font-semibold text-[#964900] hover:underline ${focus}`}
                >
                  View contact options
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link
                  href="/services"
                  className={`inline-flex min-h-12 items-center gap-2 font-semibold text-[#964900] hover:underline ${focus}`}
                >
                  Back to all services
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 shadow-sm md:p-9">
              <QuoteForm
                defaultService={service.enquiryValue}
                showProjectFields
                submitLabel="Send enquiry"
              />
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <Section
            id="related"
            title="Related services"
            labelledBy="related-title"
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => {
                const RelatedIcon = item.icon;

                return (
                  <Link
                    key={item.slug}
                    href={servicePath(item.slug)}
                    className={`group flex min-w-0 flex-col rounded-2xl border border-[#dce3ec] bg-white p-6 no-underline hover:border-[#e8a571] hover:bg-[#fffaf5] ${focus}`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3fa] text-[#001b40]">
                      <RelatedIcon size={21} aria-hidden="true" />
                    </span>

                    <span className="mt-5 text-lg font-bold tracking-tight">
                      {serviceCardTitle(item)}
                    </span>

                    <span className="mt-2 flex-1 text-sm leading-6 text-[#434750]">
                      {item.short}
                    </span>

                    <span className="mt-5 flex items-center gap-2 text-sm font-bold text-[#964900]">
                      View service
                      <ArrowRight size={16} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}
      </main>

      <Footer />
    </>
  );
}

/** A titled page section, so the heading levels and spacing stay uniform. */
function Section({
  id,
  title,
  labelledBy,
  intro,
  tinted = false,
  children,
}: {
  id: string;
  title: string;
  labelledBy: string;
  intro?: string;
  tinted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-24 border-b border-[#e5ebf2] py-12 md:py-16 ${
        tinted ? "bg-[#f7f9fc]" : "bg-white"
      }`}
    >
      <div className="container-site">
        <h2
          id={labelledBy}
          className="text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {title}
        </h2>

        {intro && (
          <p className="mt-4 max-w-3xl leading-8 text-[#434750]">{intro}</p>
        )}

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * The tier cards and the comparison table.
 *
 * A tier shows a price only where the catalogue holds a verified
 * figure; otherwise it shows a quote action, so an unpriced tier is
 * never presented as if it had a price.
 */
function Tiers({
  tiers,
  enquiryHref,
}: {
  tiers: ServiceTiers;
  enquiryHref: string;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiers.items.map((tier) => (
          <article
            key={tier.name}
            className="flex min-w-0 flex-col rounded-2xl border border-[#dce3ec] bg-white p-6"
          >
            <h3 className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <Layers
                size={18}
                className="shrink-0 text-[#964900]"
                aria-hidden="true"
              />
              {tier.name}
            </h3>

            <p className="mt-3 text-sm leading-6 text-[#434750]">
              {tier.tagline}
            </p>

            <p className="mt-5 border-t border-[#e5ebf2] pt-5">
              {tier.startingPrice !== null ? (
                <>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#964900]">
                    Starting from
                  </span>
                  <strong className="mt-1 block text-2xl font-extrabold">
                    {formatProjectPrice(tier.startingPrice)}
                  </strong>
                  <span className="mt-1 block text-xs text-[#434750]">
                    Indicative, one-time project price
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-[#964900]">
                    Pricing
                  </span>
                  <strong className="mt-1 block text-lg font-extrabold">
                    Request a quote
                  </strong>
                  <span className="mt-1 block text-xs text-[#434750]">
                    Scoped per project
                  </span>
                </>
              )}
            </p>

            {tier.estimatedTimeline && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-[#434750]">
                <Clock size={14} aria-hidden="true" />
                Estimated {tier.estimatedTimeline}
              </p>
            )}

            <ul className="mt-5 list-none space-y-3 p-0">
              {tier.highlights.map((item) => (
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

            <a
              href={enquiryHref}
              className={`mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#bcc9d9] px-4 py-3 text-sm font-bold hover:bg-[#fff0e4] ${focus}`}
            >
              {tier.startingPrice !== null
                ? `Enquire about ${tier.name}`
                : "Request a quote"}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>

      {/* Comparison */}
      <div className="mt-10">
        <h3 className="text-lg font-bold tracking-tight">
          Tier comparison
        </h3>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#dce3ec]">
          <table className="w-full min-w-[720px] border-collapse bg-white text-left text-sm">
            <caption className="sr-only">
              What each service tier includes
            </caption>

            <thead>
              <tr className="bg-[#f3f6fa]">
                <th scope="col" className="p-4 font-bold">
                  Included
                </th>

                {tiers.items.map((tier) => (
                  <th key={tier.name} scope="col" className="p-4 font-bold">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {tiers.matrix.map((row) => (
                <tr
                  key={row.label}
                  className="border-t border-[#e5ebf2] align-top"
                >
                  <th
                    scope="row"
                    className="p-4 font-semibold text-[#001b40]"
                  >
                    {row.label}
                  </th>

                  {row.values.map((value, index) => (
                    <td
                      key={`${row.label}-${tiers.items[index]?.name ?? index}`}
                      className="p-4 leading-6 text-[#434750]"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#434750]">
          Tier contents are a starting point for the conversation, not a
          fixed package. The exact deliverables for your project are
          confirmed in a written proposal.
        </p>
      </div>
    </>
  );
}
