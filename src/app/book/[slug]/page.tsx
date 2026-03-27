import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { BookingForm } from "./booking-form"
import type { Metadata } from "next"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true },
  })

  if (!restaurant) return { title: "Restaurante no encontrado" }

  return {
    title: `Reservar en ${restaurant.name} | ReservasAI`,
    description: `Hacé tu reserva online en ${restaurant.name}. Elegí fecha, hora y cantidad de personas.`,
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      maxPartySize: true,
      operatingHours: true,
      depositEnabled: true,
      depositAmount: true,
      depositMinPartySize: true,
    },
  })

  if (!restaurant) notFound()

  // Determine which days the restaurant is open
  const operatingHours = restaurant.operatingHours as Record<string, { open: string; close: string }> | null
  const openDays = operatingHours ? Object.keys(operatingHours) : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-lg px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="text-muted-foreground mt-1">Reserva tu mesa online</p>
        </div>

        {/* Booking form */}
        <BookingForm
          slug={restaurant.slug}
          maxPartySize={restaurant.maxPartySize}
          openDays={openDays}
          depositEnabled={restaurant.depositEnabled}
          depositAmount={restaurant.depositAmount}
          depositMinPartySize={restaurant.depositMinPartySize}
        />

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Reservas gestionadas por{" "}
          <a href="https://reservasai.com" className="underline hover:text-foreground">
            ReservasAI
          </a>
        </p>
      </div>
    </div>
  )
}
