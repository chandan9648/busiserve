import type { Metadata } from "next";
import { caseStudyCards } from "@/lib/case-studies";
import CaseStudyCard from "@/components/CaseStudyCard";
import { FadeIn } from "@/components/Motion";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Case Studies",
  description:
    "Client projects delivered by Busiserve Infotech Solution across web platforms, mobile apps, business software and workflow automation.",
  path: "/case-studies",
  keywords: [
    "software development case studies",
    "web development portfolio",
    "client projects",
  ],
});

export default function CaseStudiesPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Case Studies", path: "/case-studies" }])} />
      <main>
        <section className="border-b border-[#c3c6d1] bg-white py-20 text-center">
          <div className="container-site">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">
              Proven Results. Measurable Impact.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-[#434750]">
              Explore how we&apos;ve partnered with industry leaders to
              overcome complex challenges, streamline operations, and drive
              scalable growth through structured innovation.
            </p>
          </div>
        </section>

        <section className="bg-[#f7fafd] py-20">
          <div className="container-site grid gap-6 lg:grid-cols-3">
            {caseStudyCards.map((study, index) => (
              <FadeIn
                key={study.title}
                delay={index * 0.08}
              >
                <CaseStudyCard {...study} />
              </FadeIn>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}