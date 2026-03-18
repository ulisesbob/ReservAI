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

## Spec Completa

Ver `docs/superpowers/specs/2026-03-18-reserva-saas-design.md`
