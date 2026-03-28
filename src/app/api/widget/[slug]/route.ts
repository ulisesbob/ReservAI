import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { applyRateLimit, rateLimiters } from "@/lib/rate-limit"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const blocked = await applyRateLimit(rateLimiters.reservationRead, request)
  if (blocked) return blocked

  const { slug } = await params

  // Validate the restaurant exists
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { slug: true },
  })

  if (!restaurant) {
    return new NextResponse("// Restaurant not found", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL
  if (!origin) {
    console.error("[Widget] NEXT_PUBLIC_APP_URL is not configured")
    return new NextResponse("// Server configuration error", {
      status: 500,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    })
  }

  const script = `
(function() {
  if (document.getElementById('reservasai-widget-${slug}')) return;

  var iframe = document.createElement('iframe');
  iframe.id = 'reservasai-widget-${slug}';
  iframe.src = '${origin}/widget/${slug}';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.minHeight = '520px';
  iframe.style.maxWidth = '420px';
  iframe.style.borderRadius = '12px';
  iframe.style.overflow = 'hidden';
  iframe.allow = '';
  iframe.title = 'Reservar mesa';

  var container = document.currentScript && document.currentScript.parentElement;
  if (container) {
    container.appendChild(iframe);
  } else {
    document.body.appendChild(iframe);
  }

  // Auto-resize iframe based on content height
  window.addEventListener('message', function(e) {
    if (e.origin !== '${origin}') return;
    if (e.data && e.data.type === 'reservasai-resize') {
      iframe.style.height = e.data.height + 'px';
    }
  });
})();
`.trim()

  return new NextResponse(script, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
      "Access-Control-Allow-Origin": "*",
    },
  })
}
