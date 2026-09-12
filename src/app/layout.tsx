import type { Metadata } from "next";
import { Manrope, Hanken_Grotesk } from "next/font/google";

import "./globals.css";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToastProvider from "@/components/providers/ToastProvider";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Busiserve — Digital Solutions",
    template: "%s | Busiserve",
  },
  description:
    "Scalable web, app, CMS and CRM development services for startups and enterprises.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${hanken.variable}`}
      >
        <Header />

        {children}

        <Footer />

        <ToastProvider />
      </body>
    </html>
  );
}