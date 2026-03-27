import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { faqs } from "@/data/faqs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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
const title = "ReservasAI | Reservas por WhatsApp con IA para Restaurantes";
const description =
  "Automatiza las reservas de tu restaurante con un bot de IA en WhatsApp. Tus clientes reservan 24/7 en segundos, sin apps ni formularios. Probalo gratis 14 dias.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | ReservasAI",
  },
  description,
  keywords: [
    "reservas restaurante",
    "reservas WhatsApp",
    "bot WhatsApp restaurante",
    "sistema de reservas",
    "reservas con IA",
    "gestión restaurante",
    "reservas online restaurante",
    "bot IA WhatsApp",
    "software restaurante Argentina",
    "reservas automáticas",
  ],
  authors: [{ name: "ReservasAI", url: siteUrl }],
  creator: "ReservasAI",
  publisher: "ReservasAI",
  alternates: {
    canonical: siteUrl,
    languages: {
      "es-AR": siteUrl,
      "es": siteUrl,
    },
  },
  category: "technology",
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
    locale: "es_AR",
    images: [
      {
        url: `${siteUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "ReservasAI - Reservas por WhatsApp con IA para restaurantes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteUrl}/opengraph-image`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ReservasAI",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    description,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Spanish"],
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ReservasAI",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Restaurant Management",
    operatingSystem: "Web",
    url: siteUrl,
    description,
    inLanguage: "es",
    offers: {
      "@type": "Offer",
      price: "25000",
      priceCurrency: "ARS",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/register`,
      priceValidUntil: new Date(new Date().getFullYear() + 1, 0, 1).toISOString().split("T")[0],
    },
    creator: {
      "@type": "Organization",
      name: "ReservasAI",
      url: siteUrl,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "45",
      bestRating: "5",
      worstRating: "1",
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
    <html lang={locale} className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-foreground">
          Saltar al contenido
        </a>
        <script
          id="reservasai-org-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          id="reservasai-software-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        <script
          id="reservasai-faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
