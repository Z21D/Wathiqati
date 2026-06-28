import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/home",
    "/dashboard/:path*",
    "/login",
    "/register",
    "/api/protected/:path*",
  ],
};
