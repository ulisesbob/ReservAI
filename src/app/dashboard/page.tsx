import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Bienvenido, {session.user.name}
      </p>
      <pre className="mt-4 p-4 bg-gray-100 rounded text-sm">
        {JSON.stringify(session.user, null, 2)}
      </pre>
    </div>
  )
}
