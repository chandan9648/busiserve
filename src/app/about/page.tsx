import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  Target,
  MessageSquare,
  Layers,
  Users,
} from "lucide-react";

import { prototypeImages, team } from "@/lib/site-data";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About Us",
  description:
    "Meet the Busiserve Infotech Solution team in Noida and how we build websites, apps, business software and automation for startups and enterprises.",
  path: "/about",
  keywords: [
    "about Busiserve",
    "software development team Noida",
    "IT services company Uttar Pradesh",
  ],
});

const principles = [
  {
    icon: MessageSquare,
    title: "Clarity comes first",
    description:
      "Start with the problem, explain the options and agree on what the work should achieve.",
  },
  {
    icon: Users,
    title: "Design for real people",
    description:
      "Make everyday tasks easier for the customers and teams who will use the product.",
  },
  {
    icon: Layers,
    title: "Build with the future in mind",
    description:
      "Choose a considered foundation that can be maintained and adapted as needs change.",
  },
];

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "About Us", path: "/about" }])} />
      <main
        id="main-content"
        tabIndex={-1}
        className="bg-white text-[#001b40]"
      >
        <section
          aria-labelledby="about-title"
          className="border-b border-[#dce3ec] bg-[#f3f6fa] py-14 md:py-20"
        >
          <div className="container-site grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#964900]">
                About Busiserve
              </p>

              <h1
                id="about-title"
                className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
              >
                Technology with
                <br />
                a <span className="text-[#964900]">human purpose.</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[#434750]">
                We build digital tools around the people who use them. From a
                first website to connected business systems, our focus is on
                making technology useful.
              </p>

              <p className="mt-4 max-w-xl leading-8 text-[#434750]">
                Busiserve brings design and development together to help
                businesses serve customers, organise work and turn ideas into
                practical solutions.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#001b40] px-6 py-3.5 font-semibold text-white hover:bg-[#003066] ${focus}`}
                >
                  Let’s talk
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                {team.length > 0 && (
                  <a
                    href="#team"
                    className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#bcc9d9] px-6 py-3.5 font-semibold hover:bg-white ${focus}`}
                  >
                    Meet the team
                    <ArrowRight size={18} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            <figure className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
              <Image
                src={prototypeImages.aboutHero}
                alt="People collaborating in a meeting"
                width={640}
                height={560}
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="aspect-[8/7] w-full object-cover"
              />

              <figcaption className="flex items-start gap-4 border-t border-[#dce3ec] p-6">
                <span
                  className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#ff8927]"
                  aria-hidden="true"
                />

                <div>
                  <p className="font-bold">
                    Good work starts with understanding.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#434750]">
                    Your goals. Your users. Your next step.
                  </p>
                </div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          aria-labelledby="purpose-title"
          className="py-14 md:py-20"
        >
          <div className="container-site">
            <div className="mb-9 grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                  What drives us
                </p>

                <h2
                  id="purpose-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
                >
                  A clear purpose.
                  <br />
                  A considered direction.
                </h2>
              </div>

              <p className="max-w-xl leading-8 text-[#434750]">
                Technology should support your business ambitions. Our mission
                and vision keep the focus on useful outcomes and lasting value.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-5">
              <article className="relative overflow-hidden rounded-2xl bg-[#001b40] p-7 text-white md:p-10 lg:col-span-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#ffac69]">
                    <Target size={24} aria-hidden="true" />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#b9cde7]">
                    Our mission
                  </span>
                </div>

                <h3 className="mt-8 max-w-lg text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  Make complex technology
                  <br />
                  work for everyday business.
                </h3>

                <p className="mt-5 max-w-xl leading-8 text-[#d0dded]">
                  Help businesses build practical, intuitive digital
                  solutions. Make technical choices easier to understand,
                  connect them to clear goals and create tools that support the
                  way people work.
                </p>
              </article>

              <article className="rounded-2xl border border-[#f0d9c6] bg-[#fff3e9] p-7 md:p-10 lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#964900]">
                    <Eye size={24} aria-hidden="true" />
                  </span>

                  <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                    Our vision
                  </span>
                </div>

                <h3 className="mt-8 text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  More possibility.
                  <br />
                  Less digital friction.
                </h3>

                <p className="mt-5 leading-8 text-[#434750]">
                  A future where businesses can adapt with confidence,
                  supported by connected systems, accessible experiences and
                  digital foundations that grow with them.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="principles-title"
          className="border-y border-[#e5ebf2] bg-[#f7f9fc] py-14 md:py-20"
        >
          <div className="container-site">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
              Our working principles
            </p>

            <h2
              id="principles-title"
              className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
            >
              How we approach the work.
            </h2>

            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {principles.map((principle, index) => {
                const Icon = principle.icon;

                return (
                  <article
                    key={principle.title}
                    className="border-t border-[#cbd6e3] pt-6"
                  >
                    <div className="flex items-center justify-between">
                      <Icon
                        size={25}
                        className="text-[#964900]"
                        aria-hidden="true"
                      />

                      <span
                        className="text-xs font-bold text-[#964900]"
                        aria-hidden="true"
                      >
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-bold tracking-tight">
                      {principle.title}
                    </h3>

                    <p className="mt-3 leading-8 text-[#434750]">
                      {principle.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {team.length > 0 && (
          <section
            id="team"
            aria-labelledby="team-title"
            className="scroll-mt-24 py-14 md:py-20"
          >
            <div className="container-site">
              <div className="mb-10 grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-16">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                    The people behind the work
                  </p>

                  <h2
                    id="team-title"
                    className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
                  >
                    Meet the team.
                  </h2>
                </div>

                <p className="max-w-xl leading-8 text-[#434750]">
                  The people bringing our design, development and
                  problem-solving work together.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {team.map((member) => (
                  <article
                    key={member.name}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce3ec] bg-white"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-[#eef3fa]">
                      <Image
                        src={member.image}
                        alt={member.name}
                        width={480}
                        height={600}
                        loading="lazy"
                        unoptimized
                        className="h-full w-full object-cover object-top transition-transform duration-500 motion-safe:group-hover:scale-105 motion-reduce:transition-none"
                      />
                    </div>

                    <div className="flex-1 border-t border-[#e5ebf2] p-5">
                      <h3 className="break-words text-lg font-bold tracking-tight">
                        {member.name}
                      </h3>

                      <p className="mt-2 break-words text-xs font-semibold uppercase leading-6 tracking-[0.08em] text-[#964900]">
                        {member.role}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section
          aria-labelledby="about-contact-title"
          className="pb-14 pt-8 md:pb-20"
        >
          <div className="container-site">
            <div className="grid items-center gap-8 rounded-2xl border border-[#dce3ec] bg-[#f3f6fa] p-7 md:p-12 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">
                  Let’s start a conversation
                </p>

                <h2
                  id="about-contact-title"
                  className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl"
                >
                  What’s next for your business?
                </h2>

                <p className="mt-4 max-w-2xl leading-8 text-[#434750]">
                  Tell us what you want to build or improve. We can explore the
                  right next step together.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/contact"
                  className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#ff8927] px-6 py-3.5 font-bold text-[#001b40] hover:bg-[#ffac69] ${focus}`}
                >
                  Start a conversation
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link
                  href="/services"
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold hover:bg-[#e5ebf2] ${focus}`}
                >
                  Explore our services
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
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