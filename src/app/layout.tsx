import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
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
  "Automatizá reservas 24/7 por WhatsApp con IA. Tus clientes reservan en 30 segundos, vos reducís no-shows 35%. Probá gratis 14 días.";

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
    "reservas por WhatsApp Argentina",
    "software reservas restaurantes",
    "automatizar reservas",
    "bot whatsapp para restaurantes",
    "software restaurante Buenos Aires",
    "mesero virtual whatsapp",
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
  verification: {
    google: "google4ba4c661b938e70b",
    other: {
      "msvalidate.01": "CE0F3E1452E648F2E6E307A029595FC5",
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

  return (
    <html lang={locale} className={cn("font-sans", geistSans.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-foreground">
          Saltar al contenido
        </a>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
