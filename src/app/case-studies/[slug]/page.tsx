import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Layers,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  caseStudyPath,
  caseStudySlugs,
  getCaseStudy,
} from "@/lib/case-studies";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

/**
 * Case study detail pages.
 *
 * One route renders all of them from the catalogue, so a new case
 * study needs a catalogue entry and nothing else: the card, this
 * page and the sitemap entry all follow from it.
 */
export function generateStaticParams() {
  return caseStudySlugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    return { title: "Case study not found" };
  }

  return pageMetadata({
    title: study.metaTitle,
    description: study.metaDescription,
    path: caseStudyPath(study.slug),
  });
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

export default async function CaseStudyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    notFound();
  }

  const path = caseStudyPath(study.slug);

  const facts = [
    { icon: Target, label: "Sector", value: study.sector },
    { icon: Layers, label: "Engagement", value: study.engagement },
    { icon: Clock, label: "Timeline", value: study.duration },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Case Studies", path: "/case-studies" },
          { name: study.title, path },
        ])}
      />

      <main>
        {/* Hero */}
        <section className="border-b border-[#c3c6d1] bg-white py-16 md:py-20">
          <div className="container-site">
            <Link
              href="/case-studies"
              className={`inline-flex items-center gap-2 text-sm font-bold text-[#964900] hover:underline ${focus}`}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              All case studies
            </Link>

            <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
              <div className="min-w-0">
                <span className="inline-flex rounded-full border border-[#dce3ec] bg-[#eef3fa] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#001b40]">
                  {study.category}
                </span>

                <h1 className="mt-4 break-words text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">
                  {study.title}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#434750]">
                  {study.summary}
                </p>

                <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                  {facts.map((fact) => (
                    <div
                      key={fact.label}
                      className="min-w-0 rounded-xl border border-[#dce3ec] bg-[#f7f9fc] p-4"
                    >
                      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                        <fact.icon size={15} aria-hidden="true" />
                        {fact.label}
                      </dt>
                      <dd className="mt-2 break-words text-sm font-semibold leading-6 text-[#001b40]">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[#dce3ec] bg-[#eef3fa]">
                <Image
                  src={study.image}
                  alt={study.title}
                  width={840}
                  height={525}
                  priority
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="bg-[#f7fafd] py-16 md:py-20">
          <div className="container-site">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#001b40]">
              The challenge
            </h2>

            <ul className="mt-7 grid gap-4 lg:grid-cols-2">
              {study.challenge.map((point) => (
                <li
                  key={point}
                  className="min-w-0 rounded-xl border border-[#dce3ec] bg-white p-5 text-base leading-7 text-[#434750]"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it was done */}
        <section className="bg-white py-16 md:py-20">
          <div className="container-site">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#001b40]">
              Our approach
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-7 text-[#434750]">
              Each step below was finished and verified before the next
              one started, so the risk stayed contained at every stage.
            </p>

            <ol className="mt-9 space-y-5">
              {study.approach.map((step, index) => (
                <li
                  key={step.title}
                  className="flex min-w-0 gap-5 rounded-2xl border border-[#dce3ec] bg-[#f7f9fc] p-6"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#001b40] text-sm font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-bold leading-snug text-[#001b40]">
                      {step.title}
                    </h3>
                    <p className="mt-2 break-words text-base leading-7 text-[#434750]">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What the client ended up with */}
        <section className="bg-[#f7fafd] py-16 md:py-20">
          <div className="container-site grid gap-10 lg:grid-cols-2">
            <div className="min-w-0">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#001b40]">
                What we delivered
              </h2>

              <ul className="mt-7 space-y-3">
                {study.delivered.map((item) => (
                  <li
                    key={item}
                    className="flex min-w-0 items-start gap-3 text-base leading-7 text-[#434750]"
                  >
                    <Check
                      size={18}
                      className="mt-1.5 shrink-0 text-[#964900]"
                      aria-hidden="true"
                    />
                    <span className="break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#001b40]">
                Technology used
              </h2>

              <ul className="mt-7 flex flex-wrap gap-2.5">
                {study.stack.map((tech) => (
                  <li
                    key={tech}
                    className="rounded-full border border-[#dce3ec] bg-white px-4 py-2 text-sm font-semibold text-[#001b40]"
                  >
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Measured outcome */}
        <section className="bg-white py-16 md:py-20">
          <div className="container-site">
            <h2 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-[#001b40]">
              <TrendingUp size={26} aria-hidden="true" />
              The results
            </h2>

            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              {study.results.map((result) => (
                <div
                  key={result.label}
                  className="min-w-0 rounded-2xl border-2 border-[#dce3ec] bg-[#f7f9fc] p-6"
                >
                  <p className="break-words text-3xl font-extrabold tracking-tight text-[#001b40]">
                    {result.metric}
                  </p>
                  <p className="mt-1 break-words text-base font-bold text-[#001b40]">
                    {result.label}
                  </p>
                  <p className="mt-3 break-words text-sm leading-6 text-[#434750]">
                    {result.detail}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-9 max-w-3xl text-base leading-8 text-[#434750]">
              {study.outcome}
            </p>
          </div>
        </section>

        {/* Next step */}
        <section className="bg-[#001b40] py-16 text-white md:py-20">
          <div className="container-site text-center">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              Have a similar problem?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/80">
              Tell us what is slowing you down and we will tell you
              honestly whether it needs a rebuild or a much smaller fix.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/contact"
                className={`inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#f97316] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#ea6a0b] motion-reduce:transition-none ${focus}`}
              >
                Let&apos;s talk
                <ArrowRight size={18} aria-hidden="true" />
              </Link>

              <Link
                href="/case-studies"
                className={`inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 motion-reduce:transition-none ${focus}`}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                All case studies
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
