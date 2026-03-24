import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Términos de Servicio | ReservasAI",
  description: "Términos y condiciones de uso de ReservasAI.",
}

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-2">Términos de Servicio</h1>
        <p className="text-sm text-muted-foreground mb-8">Última actualización: 24 de marzo de 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">1. Aceptación de los Términos</h2>
            <p>
              Al acceder o utilizar ReservasAI (&quot;el Servicio&quot;), aceptas estar sujeto a estos
              Términos de Servicio. Si no estás de acuerdo con alguna parte, no podrás utilizar el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">2. Descripción del Servicio</h2>
            <p>
              ReservasAI es una plataforma SaaS que permite a restaurantes gestionar reservas a través de
              WhatsApp mediante un asistente de inteligencia artificial. El Servicio incluye un panel de
              administración web, integración con WhatsApp Business API, y un agente conversacional basado en IA.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">3. Registro y Cuentas</h2>
            <p>
              Para utilizar el Servicio debes crear una cuenta proporcionando información veraz y actualizada.
              Sos responsable de mantener la confidencialidad de tu contraseña y de todas las actividades que
              ocurran bajo tu cuenta. Debes notificarnos inmediatamente cualquier uso no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">4. Período de Prueba y Pagos</h2>
            <p>
              ReservasAI ofrece un período de prueba gratuito de 14 días. Al finalizar el período de prueba,
              deberás suscribirte a un plan pago para continuar utilizando el Servicio. Los pagos se procesan
              a través de MercadoPago. Los precios pueden cambiar con previo aviso de 30 días.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">5. Uso Aceptable</h2>
            <p>Te comprometes a no:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Usar el Servicio para fines ilegales o no autorizados</li>
              <li>Intentar acceder a cuentas o datos de otros usuarios</li>
              <li>Transmitir virus, malware o código malicioso</li>
              <li>Realizar ingeniería inversa del Servicio</li>
              <li>Enviar spam o mensajes no solicitados a través del Servicio</li>
              <li>Sobrecargar intencionalmente la infraestructura del Servicio</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">6. Propiedad Intelectual</h2>
            <p>
              ReservasAI y todo su contenido, características y funcionalidad son propiedad de ReservasAI
              y están protegidos por leyes de propiedad intelectual. Los datos que cargues en el Servicio
              (información de tu restaurante, reservas, mensajes) son de tu propiedad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">7. Disponibilidad del Servicio</h2>
            <p>
              Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos disponibilidad
              ininterrumpida. Podemos realizar mantenimientos programados con previo aviso. No seremos
              responsables por interrupciones causadas por terceros (WhatsApp, proveedores de hosting, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">8. Limitación de Responsabilidad</h2>
            <p>
              ReservasAI se proporciona &quot;tal cual&quot;. No seremos responsables por daños indirectos,
              incidentales o consecuentes derivados del uso del Servicio, incluyendo pérdida de reservas,
              ingresos o datos. Nuestra responsabilidad máxima se limita al monto pagado por el Servicio
              en los últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">9. Cancelación</h2>
            <p>
              Puedes cancelar tu cuenta en cualquier momento desde la configuración de facturación. Al
              cancelar, perderás acceso al Servicio al finalizar el período de facturación actual. Tus
              datos serán eliminados dentro de los 30 días posteriores a la cancelación.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">10. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos Términos en cualquier momento. Te notificaremos
              de cambios significativos por email. El uso continuado del Servicio después de los cambios
              constituye aceptación de los nuevos Términos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-8 mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre estos Términos, contactanos a{" "}
              <a href="mailto:legal@reservasai.com" className="text-emerald-600 hover:underline">
                legal@reservasai.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
