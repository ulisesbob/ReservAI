# ReservaYa - SaaS de Reservas para Restaurantes

## Resumen

SaaS multi-tenant para restaurantes que permite gestionar reservas de clientes a traves de un agente de IA por WhatsApp y un panel de administracion web. Cada restaurante se registra, configura su agente con una Knowledge Base personalizada, y sus clientes pueden reservar escribiendo por WhatsApp.

## Tech Stack

- **Next.js 14** (App Router) — fullstack
- **Prisma** — ORM
- **PostgreSQL** en Neon — base de datos
- **NextAuth.js** — autenticacion (Credentials provider, JWT)
- **Tailwind CSS + shadcn/ui** — UI
- **OpenAI API** (GPT) — agente conversacional
- **WhatsApp Business API** (Meta) — mensajeria
- **Vercel** — hosting

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   Next.js 14                     │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  Panel Web   │  │   API Routes (/api/*)   │  │
│  │  (React)     │  │  - Auth                 │  │
│  │  - Dashboard │  │  - Reservas CRUD        │  │
│  │  - Reservas  │  │  - Webhook WhatsApp     │  │
│  │  - Config KB │  │  - Agente IA (OpenAI)   │  │
│  │  - Usuarios  │  │  - Tenants/Restaurantes │  │
│  └──────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────┤
│              Prisma ORM                          │
├─────────────────────────────────────────────────┤
│           PostgreSQL (Neon)                      │
└─────────────────────────────────────────────────┘

Servicios externos:
  - WhatsApp Business API (Meta)
  - OpenAI API (GPT)
  - Vercel (hosting)
```

## Modelo de Datos

### Restaurant (tenant)
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | Nombre del restaurante |
| slug | String | URL unica, unique, solo letras minusculas, numeros y guiones, max 50 chars |
| timezone | String | Zona horaria (ej: "America/Argentina/Buenos_Aires") |
| maxCapacity | Int | Capacidad maxima total del restaurante |
| maxPartySize | Int | Maximo de personas por reserva (default: 20) |
| operatingHours | Json | Horarios por dia: {"lunes": {"open": "12:00", "close": "23:00"}, ...} |
| whatsappPhoneId | String? | ID del telefono en Meta |
| whatsappToken | String? | Encriptado con AES-256-GCM (key en env var) |
| openaiApiKey | String? | Encriptado con AES-256-GCM (key en env var) |
| knowledgeBase | Text? | Info del restaurante para el agente |
| createdAt | DateTime | |

### User
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| restaurantId | String | FK → Restaurant |
| name | String | |
| email | String | unique |
| password | String | Hasheado con bcrypt |
| role | Enum (ADMIN, EMPLOYEE) | |
| createdAt | DateTime | |

### Reservation
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| restaurantId | String | FK → Restaurant |
| customerName | String | |
| customerPhone | String | |
| customerEmail | String? | Opcional |
| dateTime | DateTime | Fecha y hora de la reserva (con timezone del restaurante) |
| partySize | Int | Cantidad de personas |
| status | Enum (PENDING, CONFIRMED, CANCELLED, COMPLETED) | |
| source | Enum (WHATSAPP, MANUAL) | Origen de la reserva |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Conversation
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| restaurantId | String | FK → Restaurant |
| customerPhone | String | |
| status | Enum (ACTIVE, COMPLETED, EXPIRED) | |
| reservationId | String? | FK → Reservation, nullable |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Message
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| conversationId | String | FK → Conversation |
| role | Enum (USER, ASSISTANT) | Quien envio el mensaje |
| content | String | Texto del mensaje |
| createdAt | DateTime | |

## Flujo del Agente de WhatsApp

### Webhook Setup (GET)
Meta requiere un endpoint GET para verificar el webhook. El endpoint `/api/whatsapp/webhook` responde al challenge de verificacion con un `verify_token` configurado por el admin.

### Flujo de Mensajes (POST)

1. Cliente escribe al WhatsApp del restaurante
2. Meta envia POST al webhook `/api/whatsapp/webhook`
3. El webhook valida la firma HMAC-SHA256 de Meta
4. Rate limiting: max 10 mensajes por minuto por telefono
5. Busca el Restaurant por `whatsappPhoneId`
6. Busca Conversation ACTIVE para ese `customerPhone`, o crea una nueva
   - Conversaciones ACTIVE sin mensajes por mas de 30 minutos se marcan como EXPIRED
7. Guarda el mensaje en la tabla Message
8. Arma el prompt para OpenAI:
   - System prompt: rol del asistente + KB + horarios + capacidad
   - Historial de mensajes (ultimos 20 mensajes max para no exceder tokens)
   - Mensaje nuevo del cliente
9. OpenAI responde con texto conversacional
10. Si GPT detecta datos completos, incluye un JSON con la reserva
11. **El backend valida disponibilidad:**
    - Verifica que la fecha/hora este dentro de los horarios operativos
    - Verifica que no se exceda la capacidad maxima para ese horario
    - Verifica que partySize <= maxPartySize
    - Si no hay disponibilidad, le dice al agente que sugiera alternativas
12. Si es valida → guarda reserva en DB, vincula a Conversation, confirma al cliente
13. Si no es valida → responde con opciones alternativas
14. Envia la respuesta al cliente via WhatsApp API

### Fallback de errores
- Si OpenAI falla: responder "Disculpa, estoy teniendo problemas. Por favor intenta de nuevo en unos minutos."
- Si el JSON no parsea: continuar conversacion pidiendo confirmacion de datos
- Si WhatsApp API falla al enviar: reintentar 1 vez, loguear error

### Prompt del Agente

```
Sos el asistente de reservas de {restaurant.name}.
Zona horaria: {restaurant.timezone}
Fecha y hora actual: {now}

Informacion del restaurante:
{restaurant.knowledgeBase}

Horarios de atencion:
{restaurant.operatingHours}

Capacidad maxima por reserva: {restaurant.maxPartySize} personas

Tu trabajo es ayudar al cliente a hacer una reserva.
Necesitas obtener: nombre, fecha, hora, cantidad de personas,
y un email o telefono de contacto.

Cuando tengas todos los datos, responde con un JSON al final del mensaje:
{"reserva": {"nombre": "...", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "personas": N, "contacto": "..."}}

Validaciones:
- No aceptar reservas en fechas/horas pasadas
- No aceptar reservas fuera del horario de atencion
- No aceptar mas de {maxPartySize} personas
- Si algo no es posible, sugerir alternativas amablemente
- Ser amable, breve y conversacional
```

## Panel Web

### Paginas

| Ruta | Rol | Descripcion |
|------|-----|-------------|
| /login | Todos | Login con email/password |
| /register | Publico | Registro de nuevo restaurante + admin |
| /dashboard | Todos | Lista de reservas del dia |
| /dashboard/reservas | Todos | Crear/editar/cancelar reservas manual |
| /settings/restaurant | ADMIN | Datos del restaurante, horarios, capacidad, timezone |
| /settings/knowledge-base | ADMIN | Editar KB del agente IA |
| /settings/whatsapp | ADMIN | Configurar phoneId y token |
| /settings/team | ADMIN | Invitar/eliminar empleados |

### Dashboard Principal

- Lista de reservas del dia ordenadas por hora
- Cada reserva: hora, nombre, personas, status, origen (WhatsApp/Manual)
- Acciones rapidas: confirmar, cancelar, marcar completada
- Filtro por status
- Boton para crear reserva manual

### Permisos

| Accion | ADMIN | EMPLOYEE |
|--------|-------|----------|
| Ver reservas | Si | Si |
| Crear/editar reservas | Si | Si |
| Cancelar reservas | Si | Si |
| Configurar restaurante | Si | No |
| Editar Knowledge Base | Si | No |
| Gestionar equipo | Si | No |
| Config WhatsApp | Si | No |

## Autenticacion y Multi-tenancy

### Autenticacion
- NextAuth.js con Credentials provider (email + password)
- Sesion con JWT
- Passwords hasheados con bcrypt

### Registro
1. Formulario en /register: nombre restaurante, nombre admin, email, password, timezone
2. Crea Restaurant + User (role: ADMIN)
3. Redirige a /dashboard

### Multi-tenancy (desde el dia 1)
- Cada usuario tiene un `restaurantId`
- Toda query filtra por `restaurantId` del usuario logueado
- Middleware que inyecta `restaurantId` en las API routes
- Un restaurante nunca ve datos de otro
- Multi-tenancy se implementa en el paso 1 como parte del setup base

### Seguridad
- Passwords hasheados con bcrypt
- JWT para sesiones
- API routes protegidas por middleware de auth + verificacion de rol
- Tokens de WhatsApp y OpenAI encriptados con AES-256-GCM
  - Clave de encriptacion en variable de entorno `ENCRYPTION_KEY`
  - Se encriptan al guardar, se desencriptan al usar
- Rate limiting en webhook: 10 msg/min por telefono
- Validacion de firma HMAC-SHA256 en webhooks de Meta

## Pasos de Implementacion

| # | Paso | Dificultad |
|---|------|-----------|
| 1 | Setup proyecto (Next.js + Prisma + DB + multi-tenancy base) | Facil |
| 2 | Autenticacion (NextAuth + registro + roles + middleware tenant) | Facil-Media |
| 3 | CRUD de reservas + dashboard | Facil |
| 4 | UI del panel con shadcn/ui | Facil |
| 5 | Integracion OpenAI (agente IA + validacion disponibilidad) | Media |
| 6 | Integracion WhatsApp Business API (webhook GET+POST + rate limit) | Media-Alta |
| 7 | Knowledge Base + config restaurante (horarios, capacidad) | Facil |
| 8 | Gestion de equipo (invitar empleados) | Facil |
| 9 | Encriptacion de credenciales + seguridad final | Media |
| 10 | Deploy (Vercel + Neon) | Facil |

**Dificultad general: Media**
