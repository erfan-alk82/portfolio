"use server";

import { redirect } from "next/navigation";
import { endAdminSession } from "@/server/auth/session";
import { authConfig } from "@/server/env";

/** POST-only (a form action), so a link or image on another site cannot sign the admin out. */
export async function logout(): Promise<void> {
  const auth = authConfig();
  if (auth.ok) {
    try {
      await endAdminSession(auth.config.sessionSecret);
    } catch (error) {
      console.error("[admin] sign-out failed:", error instanceof Error ? error.message : error);
    }
  }
  redirect("/admin/login");
}
