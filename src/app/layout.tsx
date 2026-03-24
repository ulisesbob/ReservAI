import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { faqs } from "@/data/faqs";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = "https://www.reservasai.com";
const title = "ReservasAI | Reservas por WhatsApp con IA";
const description =
  "ReservasAI permite recibir reservas 24/7 por WhatsApp con IA. Sin apps ni formularios. Trial gratis 14 días.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: siteUrl,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "ReservasAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ReservasAI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description,
    offers: {
      "@type": "Offer",
      price: "29",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: siteUrl,
    },
    creator: {
      "@type": "Organization",
      name: "ReservasAI",
      url: siteUrl,
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <html lang="es" className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-foreground">
          Saltar al contenido
        </a>
        <Script id="reservasai-software-schema" type="application/ld+json">
          {JSON.stringify(softwareSchema)}
        </Script>
        <Script id="reservasai-faq-schema" type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </Script>
        {children}
      </body>
    </html>
  );
}
