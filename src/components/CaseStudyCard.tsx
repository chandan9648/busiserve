import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CaseStudyCard({
  category,
  title,
  description,
  image,
}: {
  category: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <article className="group overflow-hidden rounded-md border border-[#dfe3e8] bg-white transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-56 overflow-hidden">
        <img src={image} alt={title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-4 top-4 rounded-sm bg-[#001b40]/95 px-3 py-1 text-sm font-semibold text-white">
          {category}
        </span>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold text-[#001b40]">{title}</h3>
        <p className="mt-3 text-base leading-6 text-[#434750]">{description}</p>
        <Link href="/case-studies" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#964900]">
          Read More <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}
