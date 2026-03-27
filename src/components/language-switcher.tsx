"use client"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locales, localeNames, type Locale } from "@/i18n/config"

export function LanguageSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()
  async function handleChange(locale: Locale) {
    await fetch("/api/locale", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) })
    router.refresh()
  }
  return (
    <Select value={currentLocale} onValueChange={(v) => handleChange(v as Locale)}>
      <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>{localeNames[locale]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
