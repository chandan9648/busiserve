import type { Metadata } from "next";

import {
  Manrope,
  Hanken_Grotesk,
} from "next/font/google";

import "./globals.css";

import Header from "@/components/Header";
import ToastProvider from "@/components/providers/ToastProvider";
import SmoothScroll from "@/components/SmoothScroll";
import VisitTracker from "@/components/VisitTracker";

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
    default: "Busiserve — Infotech Solution",
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
        <SmoothScroll />
        <ToastProvider />
        <VisitTracker />

        <Header />

        {children}
      </body>
    </html>
  );
}