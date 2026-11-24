import "server-only";
import { postIdSchema } from "@/lib/blog/schemas";
import { requireAdmin } from "../auth/dal";
import { getPostById, listPostsForAdmin, type AdminPostSummary, type PostRecord } from "./repository";

/**
 * Admin reads: never cached (the editor must show the latest save) and
 * always behind requireAdmin(), even though the dashboard layout checks too,
 * because layouts and pages render independently.
 */

export async function listAdminPosts(): Promise<AdminPostSummary[]> {
  await requireAdmin();
  return listPostsForAdmin();
}

export async function getAdminPost(id: string): Promise<PostRecord | null> {
  await requireAdmin();
  if (!postIdSchema.safeParse(id).success) return null;
  return getPostById(id);
}
