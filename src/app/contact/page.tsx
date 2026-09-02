import { Mail, MapPin, Phone } from "lucide-react";
import { contactDefaults } from "@/lib/site-data";
import ContactForm from "@/components/ContactForm";

export const metadata = { title: "Contact Us" };

export default function ContactPage() {
  return (
    <main>
      <section className="container-site py-16 md:py-20">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#001b40] md:text-5xl">Get in Touch</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-7 text-[#434750]">
            We're here to help you scale. Reach out with any questions, partnership inquiries, or to discuss how Busiserve can support your business growth.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="rounded-md border border-[#c3c6d1] bg-white p-7">
              <h2 className="text-2xl font-bold text-[#001b40]">Contact Information</h2>
              <div className="mt-7 space-y-7">
                <Info icon={<Mail size={20} />} title="Email" value={contactDefaults.email} href={`mailto:${contactDefaults.email}`} />
                <Info icon={<Phone size={20} />} title="Phone" value={contactDefaults.phone} href={`tel:${contactDefaults.phone.replace(/\s/g, "")}`} />
                <Info icon={<MapPin size={20} />} title="Headquarters" value={contactDefaults.address} />
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-md border border-[#c3c6d1] bg-[#e5e8eb]">
              <iframe
                title="Busiserve location"
                className="h-[300px] w-full border-0 grayscale"
                loading="lazy"
                src="https://www.google.com/maps?q=San%20Francisco%2C%20CA&output=embed"
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ icon, title, value, href }: { icon: React.ReactNode; title: string; value: string; href?: string }) {
  const content = href ? <a href={href} className="text-[#434750] hover:text-[#964900]">{value}</a> : <span className="text-[#434750]">{value}</span>;
  return (
    <div className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#ffdcc6] text-[#964900]">{icon}</span>
      <div>
        <h3 className="font-bold text-[#001b40]">{title}</h3>
        <div className="mt-1 text-sm leading-6">{content}</div>
      </div>
    </div>
  );
}
