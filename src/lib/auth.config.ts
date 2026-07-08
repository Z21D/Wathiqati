import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    newUser: "/home",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected =
        nextUrl.pathname.startsWith("/home") ||
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/api/protected");

      if (isProtected) {
        return isLoggedIn;
      }

      const isAuthPage =
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/register" ||
        nextUrl.pathname === "/forgot-password" ||
        nextUrl.pathname === "/reset-password";

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/home", nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt",
  },
  trustHost: true,
} satisfies NextAuthConfig;
