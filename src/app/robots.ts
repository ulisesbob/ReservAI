import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/book/", "/register", "/login", "/terms", "/privacy"],
        disallow: [
          "/api/",
          "/dashboard/",
          "/settings/",
          "/onboarding/",
          "/forgot-password/",
          "/reset-password/",
        ],
      },
    ],
    sitemap: "https://www.reservasai.com/sitemap.xml",
  }
}
