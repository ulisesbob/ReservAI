import type { NextAuthConfig, User } from "next-auth"

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as User & { role?: string }).role
        token.restaurantId = (user as User & { restaurantId?: string }).restaurantId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.restaurantId = token.restaurantId as string
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const { pathname } = nextUrl

      const protectedPaths = ["/dashboard", "/settings"]
      const isProtected = protectedPaths.some((path) => pathname.startsWith(path))

      if (isProtected && !isLoggedIn) return false

      const authPaths = ["/login", "/register"]
      const isAuthPage = authPaths.some((path) => pathname.startsWith(path))

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
  providers: [], // Providers are added in auth.ts (requires Node.js runtime for bcrypt/prisma)
} satisfies NextAuthConfig
