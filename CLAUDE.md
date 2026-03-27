# ReservasAI

SaaS multi-tenant de reservas para restaurantes. Clientes reservan por WhatsApp (agente IA con OpenAI GPT), restaurantes gestionan desde panel web.

## Stack
- Next.js 14 (App Router) + Prisma 7.5 + PostgreSQL (Neon) + Vercel
- NextAuth v5 (JWT) + Tailwind + shadcn/ui + OpenAI API + WhatsApp Business API
- MercadoPago (pagos) + Resend (emails) + Upstash Redis (rate limiting) + Sentry
- next-intl (i18n: es/en/pt) + Playwright (E2E tests)

## Reglas Críticas
1. **Multi-tenancy**: SIEMPRE filtrar por `restaurantId`. Sin excepciones.
2. **Credenciales encriptadas**: WhatsApp token y OpenAI key usan AES-256-GCM. Usar `safeDecrypt()`.
3. **Rate limiting async**: `applyRateLimit()` devuelve Promise — siempre `await`.
4. **OpenAI, NO Anthropic**: el bot de WhatsApp usa OpenAI gpt-4o-mini.
5. **Zod para validación**: usar schemas de `src/lib/schemas.ts` con `parseBody()`.
6. **Context7 antes de código**: consultar docs actualizadas antes de escribir.

## Workflow
- Plan mode para tareas de 3+ pasos. Si algo sale mal, PARAR y re-planificar.
- Bug reports: arreglar directo sin preguntar. Encontrar root cause, no fix temporal.
- Nunca marcar tarea completa sin probar que funciona.
- Después de cada corrección → actualizar LESSONS.md.

## Proceso
1. Leer estado actual (archivos afectados, no asumir)
2. Implementar el fix/feature mínimo
3. `tsc --noEmit` + `npm run build` = 0 errors antes de commit
4. No mejorar código que no está roto

## Archivos Clave
- `src/lib/ai-agent.ts` — agente OpenAI con function calling (crear_reserva, buscar_reservas, cancelar_reserva)
- `src/lib/availability.ts` — chequeo capacidad (ventana ±1h)
- `src/lib/rate-limit.ts` — Upstash Redis + fallback in-memory (ASYNC)
- `src/lib/waitlist.ts` — notificación automática de waitlist
- `src/app/api/whatsapp/webhook/route.ts` — webhook handler principal
- `prisma/schema.prisma` — 8 modelos + WaitlistEntry

## Aprendizajes del codebase
Ver `LESSONS.md` para errores comunes y cómo evitarlos.

## Env vars requeridas
DATABASE_URL, ENCRYPTION_KEY, NEXTAUTH_SECRET, OPENAI_API_KEY, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, NEXT_PUBLIC_SENTRY_DSN, RESEND_API_KEY
