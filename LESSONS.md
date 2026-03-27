# Lessons Learned

Correcciones y aprendizajes del codebase. Claude lee esto para no repetir errores.

---

## Prisma

- **Prisma 7.5 usa `prisma.config.ts`** para datasource, NO en schema.prisma
- **Prisma Client** se genera en `src/generated/prisma/`, importar de `@/generated/prisma/client`
- **Siempre correr `npx prisma generate`** después de cambiar schema antes de build
- **Schema drift**: si hay columnas en schema que no existen en DB, la migración las agrega automáticamente

## NextAuth v5

- Config split: `auth.config.ts` (edge-safe) + `auth.ts` (Node runtime con Prisma/bcrypt)
- JWT callback refresca subscription status cada 5 min desde DB

## Rate Limiting

- `applyRateLimit` es **async** (devuelve Promise) — siempre usar `await`
- Usa Upstash Redis en producción, in-memory fallback en local dev
- `checkRateLimit` también es async

## Multi-tenancy

- **SIEMPRE** filtrar por `restaurantId` en queries
- Patrón: `findFirst` con restaurantId para ownership check, luego `update/delete` con solo `{ id }`

## WhatsApp

- Token y OpenAI key están **encriptados** en DB (AES-256-GCM) — usar `safeDecrypt()` antes de usar
- Webhook signature: HMAC-SHA256 con `WHATSAPP_APP_SECRET`
- Formato de encriptación: `iv:authTag:ciphertext` (hex)

## MercadoPago

- Token `APP_USR-*` puede expirar — si 401, renovar en panel de MP
- `createSubscription` recibe `{ plan, restaurantName, restaurantId }` — NO email
- Webhook secret: se genera por aplicación en panel de MP

## MCPs

- **Nunca** configurar MCPs en `settings.json` con `mcpServers` — usar `claude mcp add -s user`
- `settings.json` → Claude Desktop. `claude mcp add` → Claude Code CLI

## Build

- `npm run build` incluye `prisma generate` via script (definido en package.json)
- Sentry config warnings son informativos, no errores
- ESLint falla si hay variables no usadas — usar `_` prefix o eliminar

## next-intl

- Requiere `NextIntlClientProvider` en root layout
- Locale se lee de cookie, default "es"
- Config en `src/i18n/request.ts`, plugin en `next.config.mjs`

## Código

- No usar `const` para variables que se reasignan (ej: `responseText` en webhook handler)
- Zod schemas ya existen en `src/lib/schemas.ts` — reusar, no crear nuevos
- `parseBody(schema, data)` retorna `{ success: true, data } | { success: false, error: string }`
