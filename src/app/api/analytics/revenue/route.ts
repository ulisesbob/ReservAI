import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const { searchParams } = request.nextUrl
    const period = searchParams.get("period") || "30"
    const days = Math.min(Number(period), 365)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const subscriptions = await prisma.subscription.findMany({
      where: { restaurantId: session.restaurantId },
      select: {
        id: true, plan: true, status: true, createdAt: true,
        restaurant: { select: { name: true } },
        payments: { where: { status: "APPROVED", paidAt: { gte: startDate } }, orderBy: { paidAt: "desc" } },
      },
    })

    const activeSubscriptions = subscriptions.filter((s) => s.status === "ACTIVE")
    const mrr = activeSubscriptions.reduce((sum, s) => {
      if (s.plan === "MONTHLY") return sum + 250
      if (s.plan === "YEARLY") return sum + 2400 / 12
      return sum
    }, 0)

    const allPayments = subscriptions.flatMap((s) => s.payments)
    const totalRevenue = allPayments.reduce((sum, p) => sum + Number(p.amount), 0)

    const cancelledInPeriod = subscriptions.filter((s) => s.status === "CANCELLED").length
    const totalEver = subscriptions.length
    const churnRate = totalEver > 0 ? (cancelledInPeriod / totalEver) * 100 : 0

    const avgRevenuePerCustomer = totalEver > 0 ? totalRevenue / totalEver : 0
    const monthlyChurnRate = churnRate / 100
    const ltv = monthlyChurnRate > 0 ? avgRevenuePerCustomer / monthlyChurnRate : avgRevenuePerCustomer * 12

    const revenueByMonth: { month: string; revenue: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
      const monthPayments = allPayments.filter((p) => p.paidAt && p.paidAt >= monthStart && p.paidAt <= monthEnd)
      revenueByMonth.push({ month: monthKey, revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0), count: monthPayments.length })
    }

    const statusBreakdown = {
      active: subscriptions.filter((s) => s.status === "ACTIVE").length,
      trialing: subscriptions.filter((s) => s.status === "TRIALING").length,
      pastDue: subscriptions.filter((s) => s.status === "PAST_DUE").length,
      cancelled: subscriptions.filter((s) => s.status === "CANCELLED").length,
    }

    const planBreakdown = {
      monthly: activeSubscriptions.filter((s) => s.plan === "MONTHLY").length,
      yearly: activeSubscriptions.filter((s) => s.plan === "YEARLY").length,
    }

    return NextResponse.json({
      mrr: Math.round(mrr), totalRevenue: Math.round(totalRevenue),
      churnRate: Math.round(churnRate * 10) / 10, ltv: Math.round(ltv),
      activeCount: activeSubscriptions.length, totalCount: totalEver,
      revenueByMonth, statusBreakdown, planBreakdown,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
