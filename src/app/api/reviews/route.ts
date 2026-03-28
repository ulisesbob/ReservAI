/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"
import { reviewCreateSchema, parseBody } from "@/lib/schemas"

export async function GET(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reviewRead, request)
    if (blocked) return blocked

    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const ratingFilter = searchParams.get("rating")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    const where: Record<string, unknown> = {
      restaurantId: session.restaurantId,
    }

    if (ratingFilter && ratingFilter !== "ALL") {
      const r = parseInt(ratingFilter, 10)
      if (!isNaN(r) && r >= 1 && r <= 5) {
        where.rating = r
      }
    }

    const [reviews, total, aggregation, distribution] = await Promise.all([
      // @ts-expect-error — Review model pending Prisma migration
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          rating: true,
          comment: true,
          source: true,
          createdAt: true,
        },
      }),
      // @ts-expect-error — Review model pending Prisma migration
      prisma.review.count({ where: { restaurantId: session.restaurantId } }),
      // @ts-expect-error — Review model pending Prisma migration
      prisma.review.aggregate({
        where: { restaurantId: session.restaurantId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      // @ts-expect-error — Review model pending Prisma migration
      prisma.review.groupBy({
        by: ["rating"],
        where: { restaurantId: session.restaurantId },
        _count: { rating: true },
      }),
    ])

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const d of distribution) {
      dist[d.rating] = d._count.rating
    }

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total: aggregation._count.id,
        avgRating: aggregation._avg.rating
          ? Math.round(aggregation._avg.rating * 10) / 10
          : null,
        distribution: dist,
      },
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const blocked = await applyRateLimit(rateLimiters.reviewWrite, request)
    if (blocked) return blocked

    const session = await requireSession()
    const body = await request.json()

    const parsed = parseBody(reviewCreateSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { customerName, customerPhone, rating, comment, source, guestId } = parsed.data

    const review = // @ts-expect-error — Review model pending Prisma migration
    await prisma.review.create({
      data: {
        restaurantId: session.restaurantId,
        customerName,
        customerPhone,
        rating,
        comment: comment || null,
        source: source || "MANUAL",
        guestId: guestId || null,
      },
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      if (error.message === "Forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
