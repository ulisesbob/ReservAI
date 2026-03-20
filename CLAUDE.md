# ReservaYa - SaaS de Reservas para Restaurantes

## Proyecto

SaaS multi-tenant para restaurantes. Los clientes reservan por WhatsApp a traves de un agente de IA (OpenAI GPT) y los restaurantes gestionan reservas desde un panel web.

## Tech Stack

- **Next.js 14** (App Router) — fullstack
- **Prisma** — ORM
- **PostgreSQL** en Neon — base de datos
- **NextAuth.js** — autenticacion (Credentials, JWT)
- **Tailwind CSS + shadcn/ui** — UI
- **OpenAI API** — agente conversacional
- **WhatsApp Business API** (Meta) — mensajeria
- **Vercel** — hosting

## Arquitectura

- Monolito fullstack en Next.js
- Multi-tenancy por `restaurantId` en toda query (desde el dia 1)
- Webhook WhatsApp en `/api/whatsapp/webhook` (GET verificacion + POST mensajes)
- Credenciales sensibles encriptadas con AES-256-GCM (key en env var `ENCRYPTION_KEY`)

## Modelos Principales

- **Restaurant** — tenant, tiene capacidad, horarios, timezone, KB, credenciales
- **User** — roles ADMIN / EMPLOYEE, vinculado a un restaurant
- **Reservation** — dateTime unico, status (PENDING/CONFIRMED/CANCELLED/COMPLETED), source (WHATSAPP/MANUAL)
- **Conversation** — chat con cliente, status (ACTIVE/COMPLETED/EXPIRED), expira a los 30 min sin actividad
- **Message** — mensajes individuales de cada conversacion

## Reglas de Desarrollo

- Consultar documentacion actualizada antes de escribir codigo (usar context7)
- Minimizar errores y alucinaciones: patrones simples y probados
- Usar OpenAI API (NO Claude/Anthropic) para el agente de IA
- Diseno moderno y simple
- Multi-tenancy: SIEMPRE filtrar por `restaurantId` en queries

## Proceso Obligatorio (8 Pasos)

**Los pasos 1-3 son pre-requisitos absolutos — esta PROHIBIDO escribir codigo sin haberlos completado.**

1. **DIAGNOSTICS** — Leer estado actual del sistema (CURRENT_STATE.md, /health, /diagnostics, Sentry). Nunca empezar sin saber el estado.
2. **REPRODUCIR** — Confirmar el bug/comportamiento en el entorno real (produccion). No fixear sin haber reproducido primero.
3. **INVESTIGAR** — Invocar el skill correspondiente (systematic-debugging para bugs, brainstorming + writing-plans para features, test-driven-development para codigo nuevo). Lanzar agentes Explore en paralelo. Leer TODOS los archivos afectados ANTES de editar.
4. **IMPLEMENTAR** — Escribir el fix minimo. Una sola cosa a la vez. No "mejorar" codigo que no esta roto. No bundlear refactoring con el fix.
5. **DOBLE REVIEW** — Lanzar en paralelo: code-reviewer (bugs, logica, tipos) + security-auditor (si toca auth/queries) + performance-engineer (si toca queries/cache). Corregir TODO antes de continuar.
6. **VERIFICAR** — `tsc --noEmit` → 0 errors + tests pasan. Si falla algo → volver al paso 4, NO commitear.
7. **TEST E2E EN PRODUCCION** — Verificar estado post-cambio contra el entorno real (/diagnostics, curl a API, probar todos los canales afectados).
8. **SCAN PROACTIVO + COMMIT + VERIFY-DEPLOY** — Grep el mismo patron de bug en todo el codebase. Otros archivos tienen el mismo problema? → arreglar. Codigo muerto? → eliminar. Tests cubren el caso? Si no → agregar. Commit + push + verify-deploy.

## Estado del Proyecto (2026-03-18)

**Todos los 10 pasos de implementacion completados.** Proyecto funcional y listo para deploy.

### Pasos Completados
1. ✅ Setup proyecto (Next.js 14 + Prisma 7.5 + Neon PostgreSQL)
2. ✅ Autenticacion (NextAuth v5 + Credentials + JWT + bcrypt)
3. ✅ CRUD reservas + dashboard
4. ✅ UI del panel con shadcn/ui
5. ✅ Integracion OpenAI (agente IA gpt-4o-mini + validacion disponibilidad)
6. ✅ Integracion WhatsApp Business API (webhook + rate limiting)
7. ✅ Knowledge Base + config restaurante (horarios, capacidad)
8. ✅ Gestion de equipo (invitar/eliminar empleados)
9. ✅ Encriptacion AES-256-GCM + seguridad (HMAC webhook, security headers)
10. ✅ Preparacion deploy (Vercel)

### Estructura de Archivos Clave
```
src/
├── auth.ts, auth.config.ts          # NextAuth v5 config (split para edge)
├── middleware.ts                     # Proteccion de rutas
├── lib/
│   ├── prisma.ts                    # Singleton PrismaClient con PrismaPg adapter
│   ├── auth.ts                      # getSession, requireSession, requireAdmin
│   ├── ai-agent.ts                  # Servicio agente OpenAI
│   ├── availability.ts              # Validacion disponibilidad
│   ├── whatsapp.ts                  # Envio mensajes WhatsApp
│   └── encryption.ts                # AES-256-GCM encrypt/decrypt
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/      # NextAuth handler
│   │   ├── register/                # POST registro restaurante+admin
│   │   ├── reservations/            # GET/POST + [id] PATCH/DELETE
│   │   ├── agent/test/              # Test endpoint agente IA
│   │   ├── settings/                # restaurant, knowledge-base, whatsapp, team
│   │   └── whatsapp/webhook/        # GET verificacion + POST mensajes
│   ├── dashboard/                   # Lista reservas, form, acciones
│   ├── settings/                    # Config restaurante, KB, WhatsApp, equipo
│   ├── login/, register/            # Auth pages
│   └── page.tsx                     # Landing page
└── components/ui/                   # shadcn/ui components
```

### Notas Tecnicas
- **Prisma 7.5**: usa `prisma.config.ts` para datasource (no en schema.prisma), requiere PrismaPg adapter
- **NextAuth v5**: config split en auth.config.ts (edge-safe) + auth.ts (Node runtime con Prisma/bcrypt)
- **Prisma Client**: generado en `src/generated/prisma/`, importar de `@/generated/prisma/client`
- **Multi-tenancy**: findFirst con restaurantId para ownership checks, luego update/delete con solo { id }
- **Encriptacion**: formato `iv:authTag:ciphertext` (hex), safeDecrypt() para datos legacy

### Variables de Entorno Requeridas
- DATABASE_URL, ENCRYPTION_KEY, NEXTAUTH_SECRET, NEXTAUTH_URL
- OPENAI_API_KEY, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET

## Roadmap Post-MVP

### Fase 1 (Critico — monetizacion)
1. Planes de pago + billing (Stripe/MercadoPago)
2. Landing page publica con pricing
3. Onboarding wizard post-registro
4. Email transaccional (Resend/SendGrid)
5. Deploy a Vercel + dominio

### Fase 2 (Retencion)
6. Reportes/analytics
7. Notificaciones recordatorio 24h
8. Calendario visual
9. Historial de clientes
10. Export CSV/PDF

### Fase 3 (Diferenciadores)
11. Widget embebible
12. Multi-idioma (i18n)
13. Waitlist
14. Reviews/feedback post-visita
15. API publica

## Spec Completa

Ver `docs/superpowers/specs/2026-03-18-reserva-saas-design.md`
