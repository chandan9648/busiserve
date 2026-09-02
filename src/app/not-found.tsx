import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-site flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#964900]">404</p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#001b40]">Page not found</h1>
      <p className="mt-4 text-[#434750]">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-7 rounded-md bg-[#ff8927] px-6 py-3 font-semibold text-white">Back to Home</Link>
    </main>
  );
}
