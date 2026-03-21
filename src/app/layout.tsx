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
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "ReservasAI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
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
