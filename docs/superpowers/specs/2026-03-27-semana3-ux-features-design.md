# Semana 3 — Experiencia del Usuario: Spec de Diseño

## Resumen

4 features para mejorar la experiencia del usuario en ReservasAI:
1. Waitlist cuando no hay capacidad
2. Onboarding wizard mejorado post-registro
3. Escalación a humano en chat WhatsApp
4. Cancelaciones por WhatsApp

**Stack:** Next.js 14, Prisma 7.5, PostgreSQL, OpenAI gpt-4o-mini, Meta WhatsApp API

---

## Feature 5: Waitlist cuando no hay capacidad

### Objetivo
Cuando un cliente quiere reservar pero no hay capacidad, puede unirse a una lista de espera. Si se cancela una reserva, el primer cliente en la lista recibe una notificación automática por WhatsApp con 15 minutos para confirmar.

### Modelo de datos

```prisma
enum WaitlistStatus {
  WAITING
  NOTIFIED
  CONFIRMED
  EXPIRED
  CANCELLED
}

model WaitlistEntry {
  id             String         @id @default(cuid())
  restaurantId   String
  restaurant     Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  customerName   String
  customerPhone  String
  customerEmail  String?
  dateTime       DateTime
  partySize      Int
  status         WaitlistStatus @default(WAITING)
  notifiedAt     DateTime?
  expiresAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([restaurantId, dateTime, status])
  @@index([restaurantId, status])
}
```

Agregar relación en Restaurant:
```prisma
model Restaurant {
  // ... existing fields
  waitlistEntries WaitlistEntry[]
}
```

### API Endpoints

- `POST /api/waitlist` — agregar a waitlist (público, rate-limited)
  - Body: `{ restaurantId, customerName, customerPhone, customerEmail?, dateTime, partySize }`
  - Valida que efectivamente no hay capacidad para ese horario
  - Retorna posición en la lista

- `GET /api/waitlist` — listar waitlist (autenticado, dashboard)
  - Query params: `date`, `status`
  - Retorna entries con posición

- `DELETE /api/waitlist/[id]` — remover de waitlist (autenticado)

- `POST /api/waitlist/[id]/confirm` — confirmar desde WhatsApp callback
  - Valida que no expiró (15 min)
  - Crea la reserva automáticamente
  - Status → CONFIRMED

### Lógica de notificación automática

Cuando una reserva se cancela (`PATCH /api/reservations/[id]` con status=CANCELLED):
1. Buscar WaitlistEntry WAITING para el mismo restaurante + horario (±1h) + partySize <= capacidad liberada
2. Ordenar por `createdAt ASC` (primero en llegar, primero en ser notificado)
3. Tomar el primero → status = NOTIFIED, notifiedAt = now(), expiresAt = now() + 15min
4. Enviar WhatsApp: "¡Se liberó un lugar para [fecha] a las [hora]! ¿Querés confirmar tu reserva para [personas] personas? Tenés 15 minutos para responder. Respondé SÍ para confirmar."
5. Si el cliente responde "sí"/"confirmo"/"dale" → crear reserva, status = CONFIRMED
6. Si pasan 15 min sin respuesta → status = EXPIRED → notificar al siguiente en la lista

### Integración con WhatsApp bot

Agregar lógica en el webhook handler:
- Si hay una WaitlistEntry NOTIFIED para ese teléfono → interceptar respuesta antes del flujo normal del bot
- Respuestas afirmativas → confirmar reserva
- Respuestas negativas → CANCELLED, notificar siguiente

### Integración con booking público

En `POST /api/book/[slug]` cuando no hay capacidad:
- Retornar `{ available: false, waitlistAvailable: true }`
- Frontend muestra formulario de waitlist en vez de error

### UI Dashboard

- Nueva sección en sidebar: "Lista de espera" con badge (count de WAITING)
- Tabla: nombre, teléfono, fecha/hora, personas, status, posición, acciones
- Filtros: por fecha, por status
- Acción manual: "Notificar" (para forzar notificación sin esperar cancelación)

---

## Feature 6: Onboarding wizard mejorado post-registro

### Objetivo
Extender el onboarding actual de 3 pasos a 5 pasos, agregando configuración de WhatsApp y personalización del bot. Guardar progreso parcial.

### Cambios en modelo de datos

Agregar campo en Restaurant:
```prisma
model Restaurant {
  // ... existing fields
  onboardingStep Int @default(1)
}
```

### Pasos del wizard

1. **Datos del restaurante** (ya existe) — nombre, timezone, capacidad máxima, tamaño máximo de grupo
2. **Horarios de operación** (ya existe) — horario por día de la semana
3. **Configurar WhatsApp** (nuevo) — phone ID, token, OpenAI API key
   - Guía paso a paso con screenshots/instrucciones
   - Botón "Saltar por ahora"
   - Test de conexión: envía mensaje de prueba
4. **Personalizar bot** (nuevo) — knowledge base con template pre-llenado
   - Template: "Somos [nombre], un restaurante ubicado en [dirección]. Nuestra especialidad es [tipo de cocina]. Horarios: [auto-fill desde paso 2]..."
   - Textarea editable con preview del prompt
   - Botón "Saltar por ahora"
5. **Confirmación** — resumen de todo + link de booking público + QR de WhatsApp
   - Botón "Ir al dashboard"

### API

- `PATCH /api/onboarding/step` — guardar progreso de cada paso
  - Body: `{ step: number, data: { ... } }`
  - Valida datos del paso correspondiente
  - Actualiza `onboardingStep` en Restaurant

### UI

- Progress bar visual arriba (5 puntos)
- Navegación: "Anterior" / "Siguiente" / "Saltar"
- Pasos 3 y 4 son opcionales (skip allowed)
- Animación de transición entre pasos
- Responsive (mobile-friendly)

### Cambio en middleware

- Actualmente verifica `operatingHours` para detectar onboarding completo
- Cambiar a verificar `onboardingStep >= 5` (completó todos los pasos o los salteó)

---

## Feature 7: Escalación a humano en chat WhatsApp

### Objetivo
Permitir que conversaciones de WhatsApp se escalen a un humano del staff, tanto por pedido del cliente como por detección automática del bot.

### Cambios en modelo de datos

Agregar valor al enum:
```prisma
enum ConversationStatus {
  ACTIVE
  COMPLETED
  EXPIRED
  ESCALATED  // nuevo
}
```

Agregar campo en Conversation:
```prisma
model Conversation {
  // ... existing fields
  escalatedAt    DateTime?
  escalatedReason String?  // "customer_request" | "bot_unable" | "manual"
}
```

### Detección automática

En el system prompt del bot, agregar instrucción:
- "Si el cliente pide hablar con una persona o un humano, o si no podés resolver su consulta después de 2 intentos, respondé EXACTAMENTE: '[ESCALATE:razón breve]' seguido de un mensaje amable al cliente."

En el webhook handler, después de recibir respuesta del bot:
1. Detectar patrón `[ESCALATE:...]` en la respuesta
2. Si detectado: status → ESCALATED, escalatedAt = now()
3. Enviar al cliente: "Te conecto con nuestro equipo. Te van a responder a la brevedad."
4. No procesar más mensajes del bot para esta conversación

### Detección por keywords del cliente

Antes de enviar al bot, verificar si el mensaje contiene:
- "humano", "persona", "hablar con alguien", "operador", "agente", "encargado"
- Si match → escalar directamente sin pasar por el bot

### API Endpoints

- `GET /api/conversations/escalated` — listar conversaciones escaladas
  - Retorna conversaciones ESCALATED con último mensaje y datos del cliente
  - Ordenadas por escalatedAt DESC

- `POST /api/conversations/[id]/reply` — staff responde desde dashboard
  - Body: `{ message: string }`
  - Envía mensaje por WhatsApp API usando el token del restaurante
  - Guarda Message con role=ASSISTANT
  - Conversación sigue en ESCALATED

- `POST /api/conversations/[id]/resolve` — cerrar conversación escalada
  - Status → COMPLETED
  - Envía mensaje de despedida opcional

- `GET /api/conversations/[id]/messages` — historial de mensajes
  - Retorna todos los mensajes de la conversación (para contexto del staff)

### Manejo de mensajes entrantes durante escalación

En el webhook handler:
- Si conversación está ESCALATED → NO pasar al bot
- Guardar mensaje como Message role=USER
- Enviar notificación al dashboard (polling o WebSocket futuro)

### UI Dashboard

- Nueva sección en sidebar: "Chats" con badge rojo (count de ESCALATED)
- Lista de conversaciones escaladas con:
  - Nombre/teléfono del cliente
  - Último mensaje
  - Tiempo desde escalación
  - Preview del motivo
- Vista de chat:
  - Historial completo de mensajes (bot + cliente + staff)
  - Mensajes del bot en gris, cliente en verde, staff en azul
  - Input de texto + botón enviar
  - Botón "Resolver" para cerrar
  - Info del cliente en sidebar (nombre, teléfono, reservas activas)

### Polling para tiempo real

- Dashboard hace polling cada 5 segundos a `/api/conversations/escalated`
- Sonido de notificación cuando llega nueva escalación
- Badge en sidebar se actualiza

---

## Feature 8: Cancelaciones por WhatsApp

### Objetivo
Permitir que clientes cancelen sus reservas directamente por WhatsApp a través del bot.

### Cambios en el bot

Agregar nueva tool al system prompt:
```json
{
  "name": "cancelar_reserva",
  "description": "Cancela una reserva existente del cliente",
  "parameters": {
    "reservationId": "ID de la reserva a cancelar"
  }
}
```

Agregar instrucción al system prompt:
- "Si el cliente quiere cancelar una reserva, buscá sus reservas futuras confirmadas usando su número de teléfono. Si tiene una sola, confirmá que quiere cancelar esa. Si tiene varias, listálas y pedile que elija cuál."

### Nueva tool: buscar_reservas

```json
{
  "name": "buscar_reservas",
  "description": "Busca reservas futuras del cliente por teléfono",
  "parameters": {
    "telefono": "Número de teléfono del cliente"
  }
}
```

Retorna lista de reservas CONFIRMED/PENDING futuras con: id, fecha, hora, personas.

### Flujo

1. Cliente dice "quiero cancelar" / "cancelar reserva" / "no voy a ir"
2. Bot usa `buscar_reservas` con el teléfono del cliente
3. Si no tiene reservas → "No encontré reservas a tu nombre"
4. Si tiene 1 reserva → "Tenés una reserva para [fecha] a las [hora] para [N] personas. ¿Querés cancelarla?"
5. Si tiene varias → lista numerada, pide elegir
6. Cliente confirma → bot usa `cancelar_reserva` con el ID
7. Backend: status → CANCELLED + trigger de waitlist (feature 5)
8. Bot confirma: "Tu reserva fue cancelada. Si querés reservar de nuevo, escribime."
9. Si tiene email → enviar email de confirmación de cancelación

### Implementación en webhook handler

Agregar handler para las tools `buscar_reservas` y `cancelar_reserva`:

```typescript
// buscar_reservas
const reservations = await prisma.reservation.findMany({
  where: {
    restaurantId,
    customerPhone: { contains: telefono },
    status: { in: ['CONFIRMED', 'PENDING'] },
    dateTime: { gte: new Date() }
  },
  orderBy: { dateTime: 'asc' }
})

// cancelar_reserva
const reservation = await prisma.reservation.update({
  where: { id: reservationId },
  data: { status: 'CANCELLED' }
})
// + trigger waitlist notification
```

### Integración con Waitlist (Feature 5)

Cuando `cancelar_reserva` se ejecuta:
1. Cancelar la reserva
2. Llamar función `notifyNextInWaitlist(restaurantId, dateTime, partySize)`
3. Esta función busca el primer WAITING entry y lo notifica

---

## Orden de implementación

1. **Feature 6: Onboarding wizard** — no depende de nada, mejora el flujo existente
2. **Feature 5: Waitlist** — modelo nuevo + API + UI + integración WhatsApp
3. **Feature 8: Cancelaciones WhatsApp** — depende del webhook handler + trigger waitlist
4. **Feature 7: Escalación a humano** — la más compleja, tiene UI de chat nueva

## Archivos principales a crear/modificar

### Crear
- `src/app/api/waitlist/route.ts`
- `src/app/api/waitlist/[id]/route.ts`
- `src/app/api/waitlist/[id]/confirm/route.ts`
- `src/app/api/onboarding/step/route.ts`
- `src/app/api/conversations/escalated/route.ts`
- `src/app/api/conversations/[id]/reply/route.ts`
- `src/app/api/conversations/[id]/resolve/route.ts`
- `src/app/api/conversations/[id]/messages/route.ts`
- `src/app/dashboard/waitlist/page.tsx`
- `src/app/dashboard/chats/page.tsx`
- `src/app/dashboard/chats/[id]/page.tsx`
- `src/components/waitlist-table.tsx`
- `src/components/chat-view.tsx`
- `src/components/chat-message.tsx`
- `src/components/onboarding/step-whatsapp.tsx`
- `src/components/onboarding/step-knowledge.tsx`
- `src/components/onboarding/step-confirmation.tsx`
- `src/lib/waitlist.ts` (lógica de notificación)

### Modificar
- `prisma/schema.prisma` — WaitlistEntry model, ConversationStatus enum, Restaurant fields
- `src/app/api/whatsapp/webhook/route.ts` — waitlist responses, escalation detection, cancel tools
- `src/app/api/reservations/[id]/route.ts` — trigger waitlist on cancel
- `src/app/api/book/[slug]/route.ts` — ofrecer waitlist cuando no hay capacidad
- `src/app/onboarding/page.tsx` — 5 pasos en vez de 3
- `src/components/sidebar.tsx` — nuevas secciones (waitlist, chats)
- `src/middleware.ts` — verificar onboardingStep
