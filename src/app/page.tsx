import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Cloud,
  Code2,
  Gamepad2,
  Globe2,
  LayoutGrid,
  PanelsTopLeft,
  PenTool,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Users,
  Workflow,
} from "lucide-react";

import { prototypeImages, services } from "@/lib/site-data";
import { servicePathForTitle } from "@/lib/services-catalogue";
import Footer from "@/components/Footer";

import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { serviceCatalogSchema } from "@/lib/seo";

/**
 * The title and description are inherited from the root layout; only
 * the canonical is declared here, because a canonical must never be
 * inherited — one set on the layout would make every route claim to
 * be a copy of this page.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type HomeService = {
  title: string;
  short: string;
  icon: string;
};

const additionalServices: HomeService[] = [
  {
    title: "WordPress Development",
    short: "Business Websites You Can Manage Yourself",
    icon: "panels",
  },
  {
    title: "Shopify Development",
    short: "Online Stores, Products & Checkout Setup",
    icon: "shopping-bag",
  },
  {
    title: "ERP Development",
    short: "Custom ERP, Inventory & Business Operations",
    icon: "building",
  },
  {
    title: "UI/UX and Graphic Design",
    short: "Research, Screen Design & Design Systems",
    icon: "pen",
  },
  {
    title: "Game Design",
    short: "Game Concepts, Mechanics & Player Experiences",
    icon: "gamepad",
  },
  {
    title: "API Development",
    short: "Custom APIs, Third-Party Integrations",
    icon: "code",
  },
  {
    title: "AI Agent Development",
    short: "AI Assistants, Business Tools & Knowledge Integration",
    icon: "bot",
  },
  {
    title: "Automation (n8n)",
    short: "n8n Workflows, App Connections & Task Automation",
    icon: "workflow",
  },
];

const homepageServices: HomeService[] = [
  ...services,
  ...additionalServices.filter(
    (extra) =>
      !services.some(
        (existing) =>
          existing.title.trim().toLowerCase() ===
          extra.title.toLowerCase(),
      ),
  ),
];

const benefits = [
  {
    title: "Built around your business",
    text: "Websites and tools shaped around the way you work and the customers you serve.",
  },
  {
    title: "Easy to use",
    text: "Clear layouts and thoughtful interactions that make everyday tasks simpler.",
  },
  {
    title: "Connected systems",
    text: "Bring your website, applications and business workflows together.",
  },
  {
    title: "Room to grow",
    text: "A considered technical foundation for your next stage of growth.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={serviceCatalogSchema([...services, ...additionalServices.map((service) => ({ title: service.title, description: service.short }))])} />
      <main id="main-content" className="bs-home" tabIndex={-1}>
        {/* Hero */}
        <section className="bs-hero" aria-labelledby="hero-title">
          <div className="container-site bs-hero-grid">
            <div>
              <p className="bs-eyebrow bs-eyebrow-light">
                <span aria-hidden="true" />
                Your digital development partner
              </p>

              <h1 id="hero-title">
                Your next chapter.
                <br />
                <span>Built for digital.</span>
              </h1>

              <p className="bs-hero-description">
                Websites, apps, enterprise software and intelligent
                automation built around your goals. Bring your next idea to
                life with Busiserve.
              </p>

              <div className="bs-actions">
                <Link
                  href="/contact"
                  className="bs-button bs-button-primary"
                >
                  Get a free consultation
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link
                  href="#home-services"
                  className="bs-button bs-button-outline"
                >
                  Explore services
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>

              <ul
                className="bs-hero-tags"
                aria-label="Development services"
              >
                {["Web & Apps", "CMS, CRM & ERP", "AI & Automation"].map(
                  (item) => (
                    <li key={item}>
                      <Check size={15} aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <figure className="bs-hero-visual">
              <div className="bs-image-frame">
                <Image
                  src={prototypeImages.homeHero}
                  alt="Team collaborating on a digital project"
                  width={640}
                  height={560}
                  priority
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="bs-hero-image"
                />
              </div>

              <figcaption className="bs-image-caption">
                <span className="bs-caption-icon" aria-hidden="true">
                  <LayoutGrid size={22} />
                </span>

                <span>
                  <strong>From idea to everyday impact.</strong>
                  <span>
                    Development · Integration · Automation
                  </span>
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Services */}
        <section
          id="home-services"
          className="bs-section"
          aria-labelledby="services-title"
        >
          <div className="container-site">
            <div className="bs-section-heading">
              <div>
                <p className="bs-eyebrow">What we build</p>

                <h2 id="services-title">
                  The right tools.
                  <br />
                  For your next move.
                </h2>
              </div>

              <p>
                From websites and enterprise software to data and AI, find
                the service that fits your next move.
              </p>
            </div>

            <div className="bs-service-grid">
              {homepageServices.map((service) => (
                <ServiceCard
                  key={service.title}
                  service={service}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section
          className="bs-section bs-benefits"
          aria-labelledby="benefits-title"
        >
          <div className="container-site bs-benefit-layout">
            <div>
              <p className="bs-eyebrow">Why Busiserve</p>

              <h2 id="benefits-title">
                Good technology.
                <br />
                A clear purpose.
              </h2>

              <p className="bs-section-description">
                Your digital tools should make business easier. We bring
                design and development together with a focus on the people
                using them.
              </p>

              <Link
                href="/services"
                className="bs-text-link"
              >
                Find the right solution
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="bs-benefit-grid">
              {benefits.map((item, index) => (
                <article
                  key={item.title}
                  className="bs-benefit-card"
                >
                  <span
                    className="bs-number"
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </span>

                  <h3>{item.title}</h3>

                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section
          className="bs-section"
          aria-labelledby="contact-title"
        >
          <div className="container-site">
            <div className="bs-contact-panel">
              <div>
                <p className="bs-eyebrow bs-eyebrow-light">
                  Let’s talk about your idea
                </p>

                <h2 id="contact-title">
                  What would you
                  <br />
                  like to build?
                </h2>

                <p>
                  Tell us about your goals, your challenges and where you
                  want to go next.
                </p>
              </div>

              <Link
                href="/contact"
                className="bs-button bs-button-primary"
              >
                Start a conversation
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </>
  );
}

function ServiceCard({
  service,
}: {
  service: HomeService;
}) {
  const icons = {
    globe: Globe2,
    smartphone: Smartphone,
    "layout-grid": LayoutGrid,
    users: Users,
    building: Building2,
    shield: ShieldCheck,
    gamepad: Gamepad2,
    cloud: Cloud,
    code: Code2,
    panels: PanelsTopLeft,
    "shopping-bag": ShoppingBag,
    pen: PenTool,
    bot: Bot,
    workflow: Workflow,
  };

  const Icon =
    icons[service.icon as keyof typeof icons] ?? Globe2;

  /*
   * Link to the service's own page where the catalogue has one, so
   * the homepage card lands on the matching detail rather than the
   * top of the services index.
   */
  const href = servicePathForTitle(service.title) ?? "/services";

  return (
    <Link
      href={href}
      className="bs-service-card"
    >
      <span className="bs-service-icon">
        <Icon size={25} aria-hidden="true" />
      </span>

      <h3>{service.title}</h3>

      <p>{service.short}</p>

      <span className="bs-card-link">
        Explore service
        <ArrowRight size={17} aria-hidden="true" />
      </span>
    </Link>
  );
}