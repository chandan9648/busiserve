import Link from "next/link";
import { ArrowRight, Globe2, LayoutGrid, Smartphone, Users } from "lucide-react";
import { prototypeImages, services } from "@/lib/site-data";
import { FadeIn, ScaleIn } from "@/components/Motion";

export default function HomePage() {
  return (
    <main>
      <section className="hero-diagonal relative overflow-hidden bg-[#001b40] py-14 text-white md:py-20">
        <div className="container-site relative z-10 grid items-center gap-12 md:grid-cols-2">
          <FadeIn>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#aac7ff]">Digital Solutions</p>
            <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              Elevate Your Business with <span className="text-[#ff8927]">Busiserve</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-7 text-[#d7e3ff]">
              Expert Web, App, CMS & CRM Development Services for Startups and Enterprises.
            </p>
            <Link href="/contact" className="mt-8 inline-flex items-center gap-2 rounded-md bg-[#ff8927] px-7 py-3.5 font-semibold text-white hover:bg-[#964900]">
              Get a Free Consultation <ArrowRight size={18} />
            </Link>
          </FadeIn>

          <ScaleIn>
            <div className="relative z-10 h-[330px] overflow-hidden rounded-lg border border-white/20 md:h-[390px]">
              <img src={prototypeImages.homeHero} alt="Corporate team collaborating" className="h-full w-full object-cover" />
            </div>
          </ScaleIn>
        </div>
      </section>

      <section className="relative z-20 -mt-14 pb-20 md:-mt-16">
        <div className="container-site grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.06}>
              <ServiceMini service={service} />
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="bg-[#f1f4f7] py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#964900]">Why Busiserve</p>
            <h2 className="mt-3 text-4xl font-extrabold text-[#001b40]">Growth through structure.</h2>
            <p className="mt-5 max-w-xl text-lg leading-7 text-[#434750]">
              We combine rigorous planning, scalable engineering and clear business outcomes to create digital infrastructure that lasts.
            </p>
            <Link href="/services" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#964900]">
              Explore our services <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Scalable Architecture", "Modern UX", "API & Integrations", "Enterprise Support"].map((item) => (
              <div key={item} className="rounded-md border border-[#c3c6d1] bg-white p-6">
                <div className="mb-4 h-2 w-10 bg-[#ff8927]" />
                <h3 className="font-bold text-[#001b40]">{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-site section-gap">
        <div className="rounded-lg bg-[#003066] p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-3xl font-bold">Ready to build something exceptional?</h2>
              <p className="mt-3 max-w-2xl text-[#d7e3ff]">
                Tell us what you are trying to solve and our team will shape a practical digital roadmap.
              </p>
            </div>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 rounded-md bg-[#ff8927] px-7 py-3.5 font-semibold text-white hover:bg-[#964900]">
              Start a Conversation <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function ServiceMini({ service }: { service: (typeof services)[number] }) {
  const icons = { globe: Globe2, smartphone: Smartphone, "layout-grid": LayoutGrid, users: Users };
  const Icon = icons[service.icon];

  return (
    <Link href="/services" className="group block h-full rounded-md border border-[#c3c6d1] bg-white p-6 soft-shadow transition hover:-translate-y-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#e5e8eb] text-[#001b40] group-hover:bg-[#ff8927] group-hover:text-white">
        <Icon size={24} />
      </div>
      <h3 className="mt-6 text-lg font-bold text-[#001b40]">{service.title.toUpperCase()}</h3>
      <p className="mt-3 text-sm leading-6 text-[#434750]">{service.short}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#001b40]">Learn More <ArrowRight size={16} /></span>
    </Link>
  );
}
