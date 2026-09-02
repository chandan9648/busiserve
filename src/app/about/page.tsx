import { Eye, Target } from "lucide-react";
import { prototypeImages, team } from "@/lib/site-data";
import { FadeIn } from "@/components/Motion";

export const metadata = { title: "About Us" };

export default function AboutPage() {
  return (
    <main>
      <section className="bg-[#f7fafd] py-16">
        <div className="container-site grid items-center gap-12 md:grid-cols-2">
          <FadeIn>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">Digital Solutions for Growth</h1>
            <p className="mt-6 text-lg leading-7 text-[#434750]">
              At Busiserve, we architect scalable digital infrastructure designed to propel enterprise growth. We bridge the gap between complex technological capabilities and clear business outcomes.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="h-[350px] overflow-hidden rounded-lg border border-[#c3c6d1]">
              <img src={prototypeImages.aboutHero} alt="Busiserve team meeting" className="h-full w-full object-cover" />
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="container-site py-16">
        <div className="grid gap-5 lg:grid-cols-5">
          <article className="rounded-md border border-[#c3c6d1] bg-white p-7 lg:col-span-3">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-[#e5e8eb] text-[#001b40]"><Target size={21} /></div>
            <h2 className="text-2xl font-bold text-[#001b40]">Our Mission</h2>
            <p className="mt-4 leading-7 text-[#434750]">
              To empower businesses through robust, scalable, and intuitive digital solutions. We strive to demystify technology, providing clear pathways to operational efficiency and sustainable market growth. Our commitment is to deliver structural integrity in every line of code and strategic clarity in every consultation.
            </p>
          </article>

          <article className="rounded-md border border-[#c3c6d1] bg-[#f1f4f7] p-7 lg:col-span-2">
            <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-[#ffdcc6] text-[#964900]"><Eye size={21} /></div>
            <h2 className="text-2xl font-bold text-[#001b40]">Our Vision</h2>
            <p className="mt-4 leading-7 text-[#434750]">
              A future where every enterprise operates with the agility of a startup and the stability of a legacy institution, driven by intelligent digital foundations.
            </p>
          </article>
        </div>
      </section>

      <section id="team" className="bg-[#f1f4f7] py-20">
        <div className="container-site">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#001b40] md:text-4xl">Meet the Team</h2>
            <p className="mt-3 text-[#434750]">The architects behind our digital solutions.</p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, index) => (
              <FadeIn key={member.name} delay={index * 0.06}>
                <article className="overflow-hidden rounded-md border border-[#c3c6d1] bg-white">
                  <div className="h-64 overflow-hidden">
                    <img src={member.image} alt={member.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#001b40]">{member.name}</h3>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#964900]">{member.role}</p>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
