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
| slug | String | URL unica, unique |
| whatsappPhoneId | String? | ID del telefono en Meta |
| whatsappToken | String? | Token encriptado |
| openaiApiKey | String? | API key encriptada |
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
| date | DateTime | Fecha de la reserva |
| time | String | Hora (ej: "20:30") |
| partySize | Int | Cantidad de personas |
| status | Enum (PENDING, CONFIRMED, CANCELLED, COMPLETED) | |
| source | Enum (WHATSAPP, MANUAL) | Origen de la reserva |
| createdAt | DateTime | |

### Conversation
| Campo | Tipo | Notas |
|-------|------|-------|
| id | String (cuid) | PK |
| restaurantId | String | FK → Restaurant |
| customerPhone | String | |
| messages | Json | Array de {role, content} |
| status | Enum (ACTIVE, COMPLETED) | |
| reservationId | String? | FK → Reservation, nullable |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## Flujo del Agente de WhatsApp

1. Cliente escribe al WhatsApp del restaurante
2. Meta envia POST al webhook `/api/whatsapp/webhook`
3. El webhook valida la firma de Meta
4. Busca el Restaurant por `whatsappPhoneId`
5. Busca o crea una Conversation para ese `customerPhone`
6. Arma el prompt para OpenAI:
   - System prompt: rol del asistente + Knowledge Base del restaurante
   - Historial de mensajes de la conversacion
   - Mensaje nuevo del cliente
7. OpenAI responde con texto conversacional
8. Si GPT detecta datos completos, incluye un JSON con la reserva
9. El webhook parsea la respuesta:
   - Si hay JSON de reserva → guarda en DB, vincula a Conversation, confirma al cliente
   - Si no → continua la conversacion
10. Envia la respuesta al cliente via WhatsApp API

### Prompt del Agente

```
Sos el asistente de reservas de {restaurant.name}.

Informacion del restaurante:
{restaurant.knowledgeBase}

Tu trabajo es ayudar al cliente a hacer una reserva.
Necesitas obtener: nombre, fecha, hora, cantidad de personas,
y un email o telefono de contacto.

Cuando tengas todos los datos, responde con un JSON al final del mensaje:
{"reserva": {"nombre": "...", "fecha": "YYYY-MM-DD", "hora": "HH:mm", "personas": N, "contacto": "..."}}

Validaciones:
- No aceptar reservas en fechas pasadas
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
| /settings/restaurant | ADMIN | Datos del restaurante |
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
1. Formulario en /register: nombre restaurante, nombre admin, email, password
2. Crea Restaurant + User (role: ADMIN)
3. Redirige a /dashboard

### Multi-tenancy
- Cada usuario tiene un `restaurantId`
- Toda query filtra por `restaurantId` del usuario logueado
- Middleware que inyecta `restaurantId` en las API routes
- Un restaurante nunca ve datos de otro

### Seguridad
- Passwords hasheados con bcrypt
- JWT para sesiones
- API routes protegidas por middleware de auth + verificacion de rol
- Tokens de WhatsApp y OpenAI encriptados en la DB

## Pasos de Implementacion

| # | Paso | Dificultad |
|---|------|-----------|
| 1 | Setup proyecto (Next.js + Prisma + DB) | Facil |
| 2 | Autenticacion (NextAuth + registro) | Facil-Media |
| 3 | CRUD de reservas + dashboard | Facil |
| 4 | UI del panel con shadcn/ui | Facil |
| 5 | Integracion OpenAI (agente IA) | Media |
| 6 | Integracion WhatsApp Business API | Media-Alta |
| 7 | Knowledge Base editable | Facil |
| 8 | Gestion de equipo (invitar empleados) | Facil |
| 9 | Multi-tenancy y seguridad | Media |
| 10 | Deploy (Vercel + Neon) | Facil |

**Dificultad general: Media**
