/**
 * Cache tags for public blog reads. Every list carries POSTS_TAG; a single
 * post also carries its own tag, so an edit can expire exactly that page.
 */
export const POSTS_TAG = "posts";

export function postTag(slug: string): string {
  return `post:${slug}`;
}
