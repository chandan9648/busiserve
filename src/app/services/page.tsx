import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { prototypeImages, services, approach } from "@/lib/site-data";
import { FadeIn, ScaleIn } from "@/components/Motion";
import ServiceCard from "@/components/ServiceCard";
import QuoteForm from "@/components/QuoteForm";

export const metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <main>
      <section className="bg-[#f7fafd] py-14 md:py-20">
        <div className="container-site grid items-center gap-12 md:grid-cols-2">
          <FadeIn>
            <span className="inline-flex rounded-full bg-[#e5e8eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#001b40]">Our Expertise</span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">Empowering Your Digital Transformation</h1>
            <p className="mt-5 max-w-xl text-lg leading-7 text-[#434750]">
              We architect scalable, high-performance digital solutions tailored to your unique business challenges. From intuitive web applications to robust CRM integrations, our approach drives measurable growth.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-sm bg-[#ff8927] px-6 py-3 font-semibold text-white hover:bg-[#964900]">Get a Quote <ArrowRight size={17} /></Link>
              <a href="#solutions" className="rounded-sm border border-[#001b40] px-6 py-3 font-semibold text-[#001b40]">Explore Services</a>
            </div>
          </FadeIn>
          <ScaleIn>
            <div className="h-[340px] overflow-hidden rounded-lg border border-[#c3c6d1] md:h-[430px]">
              <img src={prototypeImages.servicesHero} alt="Digital transformation workshop" className="h-full w-full object-cover" />
            </div>
          </ScaleIn>
        </div>
      </section>

      <section id="solutions" className="container-site section-gap">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-[#001b40] md:text-4xl">Core Solutions</h2>
          <p className="mt-4 text-[#434750]">Comprehensive technical services designed to streamline operations and enhance customer engagement across all digital touchpoints.</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {services.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.05}>
              <ServiceCard {...service} featured={service.title === "CRM Solutions"} />
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="bg-[#f1f4f7] py-20">
        <div className="container-site grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-[#001b40] md:text-4xl">Our Approach: Structural Integrity Meets Innovation</h2>
            <p className="mt-5 leading-7 text-[#434750]">
              We don't just write code; we build digital infrastructure. Our methodology is rooted in rigorous planning, transparent communication, and agile execution, ensuring that every project delivers lasting value.
            </p>

            <div className="mt-8 space-y-6">
              {approach.map((item) => (
                <div key={item.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#ffdcc6] text-xs font-bold text-[#964900]">{item.step}</span>
                  <div>
                    <h3 className="font-bold text-[#001b40]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#434750]">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#c3c6d1]">
            <img src={prototypeImages.servicesApproach} alt="Project planning workshop" className="h-[500px] w-full object-cover" />
          </div>
        </div>
      </section>

      <section className="container-site section-gap">
        <div className="rounded-lg border border-[#c3c6d1] bg-[#e5e8eb] p-6 md:p-10">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-[#001b40]">Ready to Build Something Exceptional?</h2>
              <p className="mt-4 max-w-xl text-[#434750]">
                Partner with Busiserve to transform your operational challenges into digital advantages. Provide some details, and our experts will craft a tailored proposal.
              </p>
            </div>
            <QuoteForm />
          </div>
        </div>
      </section>
    </main>
  );
}
