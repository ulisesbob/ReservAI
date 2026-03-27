import type { Metadata } from "next"
import localFont from "next/font/local"
import "../globals.css"

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
})

export const metadata: Metadata = {
  title: "Reservar mesa",
  robots: { index: false, follow: false },
}

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={geistSans.variable}>
      <body className={`${geistSans.variable} antialiased bg-transparent`}>
        {children}
      </body>
    </html>
  )
}
