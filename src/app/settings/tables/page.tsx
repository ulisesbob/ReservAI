import { requireAdmin } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TablesManager } from "./tables-manager"

export default async function TablesPage() {
  try {
    await requireAdmin()
  } catch {
    redirect("/dashboard")
  }

  return <TablesManager />
}
