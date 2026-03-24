import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidad | ReservasAI",
  description: "Política de privacidad y manejo de datos de ReservasAI.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Reservas<span className="text-emerald-500">AI</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Iniciar sesion
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidad</h1>
        <p className="text-sm text-muted-foreground mb-8">Última actualización: 24 de marzo de 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">1. Información que Recopilamos</h2>
            <p>Recopilamos la siguiente información:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Datos de cuenta:</strong> nombre, email, contraseña (hasheada), nombre del restaurante</li>
              <li><strong>Datos de reservas:</strong> nombre del cliente, teléfono, email, fecha/hora, cantidad de personas</li>
              <li><strong>Conversaciones de WhatsApp:</strong> mensajes intercambiados entre el asistente IA y los clientes</li>
              <li><strong>Datos de configuración:</strong> horarios, capacidad, knowledge base del restaurante</li>
              <li><strong>Datos de pago:</strong> procesados por MercadoPago (no almacenamos datos de tarjeta)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">2. Cómo Usamos la Información</h2>
            <p>Utilizamos tu información para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Proporcionar y mantener el Servicio de gestión de reservas</li>
              <li>Procesar reservas a través del asistente de IA por WhatsApp</li>
              <li>Enviar emails transaccionales (confirmaciones, recuperación de contraseña)</li>
              <li>Procesar pagos de suscripción</li>
              <li>Mejorar el Servicio y la experiencia del usuario</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">3. Inteligencia Artificial</h2>
            <p>
              ReservasAI utiliza modelos de lenguaje de OpenAI para procesar las conversaciones de WhatsApp.
              Los mensajes de los clientes se envían a la API de OpenAI para generar respuestas. OpenAI no
              utiliza estos datos para entrenar sus modelos (según su política de API). El knowledge base
              que configures para tu restaurante se incluye como contexto en estas conversaciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">4. Almacenamiento y Seguridad</h2>
            <p>
              Los datos se almacenan en servidores seguros (PostgreSQL en Neon). Las credenciales sensibles
              (tokens de WhatsApp, claves de API) se encriptan con AES-256-GCM. Las contraseñas se hashean
              con bcrypt. Utilizamos HTTPS para todas las comunicaciones.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">5. Compartir Información</h2>
            <p>No vendemos ni compartimos tu información personal, excepto con:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Meta/WhatsApp:</strong> para el envío y recepción de mensajes de WhatsApp</li>
              <li><strong>OpenAI:</strong> para el procesamiento de conversaciones por IA</li>
              <li><strong>MercadoPago:</strong> para el procesamiento de pagos</li>
              <li><strong>Resend:</strong> para el envío de emails transaccionales</li>
              <li><strong>Vercel:</strong> hosting de la aplicación</li>
              <li><strong>Neon:</strong> hosting de la base de datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">6. Retención de Datos</h2>
            <p>
              Mantenemos tus datos mientras tu cuenta esté activa. Las conversaciones de WhatsApp se
              mantienen por 90 días. Al cancelar tu cuenta, eliminaremos tus datos dentro de los 30 días,
              excepto donde la ley requiera retención más prolongada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">7. Tus Derechos</h2>
            <p>Tenés derecho a:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acceder a tus datos personales</li>
              <li>Corregir datos inexactos</li>
              <li>Solicitar la eliminación de tus datos</li>
              <li>Exportar tus datos en formato legible</li>
              <li>Retirar tu consentimiento en cualquier momento</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, contactanos a{" "}
              <a href="mailto:privacidad@reservasai.com" className="text-emerald-600 hover:underline">
                privacidad@reservasai.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies esenciales para el funcionamiento del Servicio (sesión de autenticación).
              No utilizamos cookies de rastreo ni publicidad de terceros.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">9. Menores de Edad</h2>
            <p>
              El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente
              información de menores.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">10. Cambios</h2>
            <p>
              Podemos actualizar esta Política de Privacidad. Te notificaremos de cambios significativos
              por email. La versión vigente siempre estará disponible en esta página.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre privacidad:{" "}
              <a href="mailto:privacidad@reservasai.com" className="text-emerald-600 hover:underline">
                privacidad@reservasai.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
