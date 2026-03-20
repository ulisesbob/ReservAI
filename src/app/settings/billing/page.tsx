import { requireAdmin } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BillingForm } from "./billing-form"

export default async function BillingPage() {
  const session = await requireAdmin()

  const subscription = await prisma.subscription.findUnique({
    where: { restaurantId: session.restaurantId },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  const serialized = subscription ? {
    ...subscription,
    trialEndsAt: subscription.trialEndsAt.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    payments: subscription.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toString(),
      status: p.status,
      paidAt: p.paidAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
  } : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Facturacion</h2>
        <p className="text-muted-foreground">Gestiona tu suscripcion y pagos.</p>
      </div>
      <BillingForm subscription={serialized} />
    </div>
  )
}
