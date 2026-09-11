import Link from "next/link";
import { ArrowRight, BarChart3, Bot, Building2, Check, Cloud, Code2, Gamepad2, Globe2, LayoutGrid, ShieldCheck, Smartphone, Users, Workflow, type LucideIcon } from "lucide-react";
import { prototypeImages, approach } from "@/lib/site-data";
import QuoteForm from "@/components/QuoteForm";

export const metadata = {
  title: "Services",
  description: "Explore Busiserve’s product development, business software, cloud, cybersecurity, data and automation services.",
};

type Solution = { title: string; icon: LucideIcon; description: string; deliverables: string[] };
type Category = { id: string; number: string; label: string; title: string; description: string; items: Solution[] };

const categories: Category[] = [
  {
    id: "digital-products", number: "01", label: "Digital products", title: "Build something people want to use.",
    description: "Create your next customer experience, from a business website to an app or an interactive game.",
    items: [
      { title: "Web Development", icon: Globe2, description: "A responsive website or web application shaped around your customers and business goals.", deliverables: ["Responsive interface development", "Custom pages and business features", "Forms and third-party integrations"] },
      { title: "App Development", icon: Smartphone, description: "Bring your service to mobile with focused journeys and interfaces designed for smaller screens.", deliverables: ["iOS, Android or cross-platform apps", "User journeys and app interfaces", "Backend and API integration"] },
      { title: "Game Design", icon: Gamepad2, description: "Turn an idea into an interactive experience with clear mechanics and a considered player journey.", deliverables: ["Game concepts and core mechanics", "Player flows and interface design", "Interactive prototypes"] },
    ],
  },
  {
    id: "business-systems", number: "02", label: "Business systems", title: "Give your operations a better foundation.",
    description: "Organise your content, customer relationships and internal processes with software built for your team.",
    items: [
      { title: "CMS Development", icon: LayoutGrid, description: "Make publishing and maintaining your content easier with an organised editing experience.", deliverables: ["WordPress, Drupal or custom CMS", "Content models and editing workflows", "Roles and publishing permissions"] },
      { title: "CRM Solutions", icon: Users, description: "Keep leads, customer history and follow-ups in one place so your team can act with context.", deliverables: ["Lead and customer management", "Sales pipelines and follow-ups", "Reports and workflow integrations"] },
      { title: "ERP Development", icon: Building2, description: "Connect key business functions and reduce the friction of working across disconnected tools.", deliverables: ["Inventory and operational modules", "Finance and HR workflows", "Role-based dashboards and reporting"] },
    ],
  },
  {
    id: "connected-platforms", number: "03", label: "Connected platforms", title: "Connect your tools. Strengthen your systems.",
    description: "Help applications work together while taking a considered approach to access, reliability and security.",
    items: [
      { title: "Cloud Integration", icon: Cloud, description: "Bring your cloud services and applications together with clear data flows and maintainable connections.", deliverables: ["Cloud application integration", "Data synchronisation workflows", "Deployment and configuration support"] },
      { title: "API Development", icon: Code2, description: "Build the connections your products need to exchange information and support new functionality.", deliverables: ["Custom API endpoints", "Third-party service integrations", "Authentication and API documentation"] },
      { title: "Cybersecurity", icon: ShieldCheck, description: "Understand weaknesses in your applications and systems, then prioritise practical improvements.", deliverables: ["Application security assessments", "Access and configuration reviews", "Remediation guidance and hardening"] },
    ],
  },
  {
    id: "intelligence-automation", number: "04", label: "Intelligence & automation", title: "Make more of your data. Do less repetitive work.",
    description: "Explore insights, intelligent assistance and connected workflows that support your everyday decisions.",
    items: [
      { title: "Data Science", icon: BarChart3, description: "Explore your business data and turn patterns into insights your team can understand and use.", deliverables: ["Data preparation and analysis", "Dashboards and visual reporting", "Predictive model development"] },
      { title: "AI Agent Development", icon: Bot, description: "Build assistants around your knowledge and tools, with review and controls suited to the task.", deliverables: ["Knowledge-connected assistants", "Business tool and API connections", "Human review and approval steps"] },
      { title: "Automation (n8n)", icon: Workflow, description: "Connect the apps you already use and reduce manual work across recurring business processes.", deliverables: ["n8n workflow development", "Lead routing and notifications", "Data syncing and scheduled tasks"] },
    ],
  },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#964900]";

export default function ServicesPage() {
  return (
    <main id="main-content" tabIndex={-1} className="bg-white text-[#001b40]">
      <section aria-labelledby="services-title" className="overflow-hidden border-b border-[#dce3ec] bg-[#f3f6fa] py-12 md:py-20">
        <div className="container-site grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#964900]">Busiserve / Our expertise</p>
            <h1 id="services-title" className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">Big ideas need<br />the right <span className="text-[#964900]">expertise.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#434750]">Launch a product. Improve your operations. Connect your systems. Find the right starting point for what your business needs next.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#service-categories" className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#001b40] px-6 py-3.5 font-semibold text-white hover:bg-[#003066] ${focus}`}>Find your service <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#quote" className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#bcc9d9] px-6 py-3.5 font-semibold hover:bg-white ${focus}`}>Discuss a project <ArrowRight size={18} aria-hidden="true" /></a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-[#dce3ec] pt-6">
              <p><strong className="text-2xl font-extrabold">12</strong><span className="ml-2 text-sm text-[#434750]">specialist services</span></p>
              <p><strong className="text-2xl font-extrabold">04</strong><span className="ml-2 text-sm text-[#434750]">areas of expertise</span></p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#dce3ec] bg-white shadow-sm">
            <img src={prototypeImages.servicesHero} alt="Team discussing a digital project" width={640} height={460} fetchPriority="high" className="aspect-[4/3] w-full object-cover" />
            <div className="grid gap-4 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
              <div><p className="text-xs font-bold uppercase tracking-widest text-[#964900]">Your starting point</p><p className="mt-2 text-lg font-bold">What should work better?</p></div>
              <a href="#quote" aria-label="Discuss what should work better in your business" className={`flex h-12 w-12 items-center justify-center rounded-full bg-[#ff8927] text-[#001b40] hover:bg-[#ffac69] ${focus}`}><ArrowRight size={21} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <nav id="service-categories" aria-label="Service categories" className="scroll-mt-28 border-b border-[#dce3ec] bg-white">
        <div className="container-site grid grid-cols-1 gap-2 py-5 sm:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => <a key={category.id} href={`#${category.id}`} className={`flex min-h-12 items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-semibold hover:bg-[#eef3fa] ${focus}`}><span><span className="mr-3 text-[#964900]">{category.number}</span>{category.label}</span><ArrowRight size={16} aria-hidden="true" /></a>)}
        </div>
      </nav>

      {categories.map((category, index) => (
        <section key={category.id} id={category.id} aria-labelledby={`${category.id}-title`} className={`scroll-mt-24 border-b border-[#e5ebf2] py-14 md:py-20 ${index % 2 ? "bg-[#f7f9fc]" : "bg-white"}`}>
          <div className="container-site">
            <div className="mb-9 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:gap-16">
              <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">{category.number} / {category.label}</p><h2 id={`${category.id}-title`} className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{category.title}</h2></div>
              <p className="max-w-xl leading-8 text-[#434750]">{category.description}</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {category.items.map((service) => <DetailedService key={service.title} service={service} />)}
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="approach-title" className="bg-[#001b40] py-14 text-white md:py-20">
        <div className="container-site">
          <div className="grid gap-5 lg:grid-cols-2 lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#ffac69]">From brief to build</p><h2 id="approach-title" className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">A clear path forward.</h2></div>
            <p className="max-w-xl leading-8 text-[#d0dded]">Start with the problem you need to solve. Together, we can define the scope, agree on priorities and shape a practical delivery plan.</p>
          </div>
          <ol className="mt-10 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-4">
            {approach.map((item) => <li key={item.step} className="border-t border-[#4b6380] pt-6"><span className="text-sm font-bold text-[#ffac69]">{item.step}</span><h3 className="mt-4 text-lg font-bold">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#d0dded]">{item.description}</p></li>)}
          </ol>
        </div>
      </section>

      <section id="quote" aria-labelledby="quote-title" className="scroll-mt-24 bg-[#f3f6fa] py-14 md:py-20">
        <div className="container-site grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#964900]">Your next step</p>
            <h2 id="quote-title" className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">Bring the challenge.<br />Let’s plan the solution.</h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#434750]">Tell us what you want to improve and which service caught your attention. You don’t need a technical brief to start the conversation.</p>
            <ul className="mt-7 list-none space-y-4 p-0 text-[#434750]">
              {["What you want to build or improve", "The tools or systems you already use", "Your timeline and budget, if known"].map((text) => <li key={text} className="flex items-start gap-3"><Check size={19} className="mt-0.5 shrink-0 text-[#964900]" aria-hidden="true" /><span>{text}</span></li>)}
            </ul>
            <Link href="/contact" className={`mt-7 inline-flex min-h-12 items-center gap-2 font-semibold text-[#964900] hover:underline ${focus}`}>View contact options <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
          <div className="min-w-0 rounded-2xl border border-[#dce3ec] bg-white p-6 shadow-sm md:p-9"><QuoteForm /></div>
        </div>
      </section>
    </main>
  );
}

function DetailedService({ service }: { service: Solution }) {
  const Icon = service.icon;
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#dce3ec] bg-white">
      <div className="flex-1 p-6 md:p-7">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#001b40] text-[#ffac69]"><Icon size={24} aria-hidden="true" /></div>
        <h3 className="text-xl font-bold tracking-tight">{service.title}</h3>
        <p className="mt-3 text-sm leading-7 text-[#434750]">{service.description}</p>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#964900]">What we can help with</p>
        <ul className="mt-4 list-none space-y-3 p-0">
          {service.deliverables.map((item) => <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[#434750]"><Check size={16} className="mt-1 shrink-0 text-[#964900]" aria-hidden="true" /><span>{item}</span></li>)}
        </ul>
      </div>
      <a href="#quote" aria-label={`Discuss ${service.title}`} className={`flex min-h-14 items-center justify-between gap-3 border-t border-[#e5ebf2] bg-[#f7f9fc] px-6 py-4 text-sm font-bold hover:bg-[#fff0e4] md:px-7 ${focus}`}>Discuss this service <ArrowRight size={18} aria-hidden="true" /></a>
    </article>
  );
}
