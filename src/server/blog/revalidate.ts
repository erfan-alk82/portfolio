import "server-only";
import { updateTag } from "next/cache";
import { POSTS_TAG, postTag } from "./tags";

/**
 * Called from Server Actions after every write. updateTag (not revalidateTag)
 * expires the entries immediately, so the next public request already sees the
 * change: the post page, its metadata and hreflang, the index, sitemap and RSS.
 */
export function expirePostCaches(...slugs: readonly (string | null | undefined)[]): void {
  updateTag(POSTS_TAG);
  for (const slug of new Set(slugs.filter((s): s is string => Boolean(s)))) updateTag(postTag(slug));
}
