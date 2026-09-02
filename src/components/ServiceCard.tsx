import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { iconMap } from "./icons";

type Props = {
  title: string;
  short: string;
  description: string;
  icon: keyof typeof iconMap;
  bullets?: readonly string[];
  featured?: boolean;
};

export default function ServiceCard({ title, short, description, icon, bullets = [], featured = false }: Props) {
  const Icon = iconMap[icon];

  return (
    <article
      className={`group rounded-md border p-6 transition duration-300 hover:-translate-y-1 ${
        featured
          ? "border-[#003066] bg-[#001b40] text-white soft-shadow"
          : "border-[#c3c6d1] bg-white hover:border-[#789ad6] hover:shadow-lg"
      }`}
    >
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-md ${
        featured ? "bg-[#003066] text-[#ff8927]" : "bg-[#e5e8eb] text-[#001b40]"
      }`}>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      <h3 className={`text-2xl font-bold ${featured ? "text-white" : "text-[#001b40]"}`}>{title}</h3>
      <p className={`mt-2 font-medium ${featured ? "text-[#d7e3ff]" : "text-[#434750]"}`}>{short}</p>
      <p className={`mt-4 text-sm leading-6 ${featured ? "text-[#eef1f4]" : "text-[#434750]"}`}>{description}</p>

      {bullets.length > 0 && (
        <ul className="mt-5 space-y-2">
          {bullets.map((bullet) => (
            <li key={bullet} className={`flex items-center gap-2 text-sm ${featured ? "text-[#eef1f4]" : "text-[#434750]"}`}>
              <CheckCircle2 size={16} className="shrink-0 text-[#ff8927]" />
              {bullet}
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/services"
        className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${
          featured ? "text-[#ff8927]" : "text-[#964900]"
        }`}
      >
        Learn More <ArrowRight size={16} />
      </Link>
    </article>
  );
}
