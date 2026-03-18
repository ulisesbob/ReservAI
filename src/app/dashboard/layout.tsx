import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { SignOutButton } from "./sign-out-button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { name, role } = session.user

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: brand + links */}
            <div className="flex items-center gap-8">
              <a href="/dashboard" className="text-xl font-bold text-indigo-600">
                ReservaYa
              </a>
              <div className="flex items-center gap-4">
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  Reservas
                </a>
                {role === "ADMIN" && (
                  <a
                    href="/dashboard/settings"
                    className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Configuraci&oacute;n
                  </a>
                )}
              </div>
            </div>

            {/* Right: user info + sign out */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  {name}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    role === "ADMIN"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {role}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
