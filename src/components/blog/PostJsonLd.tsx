import { blogPostingJsonLd, serializeJsonLd, type PublicPost } from "@/lib/blog/seo";
import { siteUrl } from "@/lib/site";

type Props = {
  post: PublicPost;
};

/** schema.org BlogPosting; the author is the Person entity from the home page. */
export function PostJsonLd({ post }: Props) {
  return (
    <script
      type="application/ld+json"
      // Escaped by serializeJsonLd: "<" cannot appear, so the script cannot be closed early.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogPostingJsonLd(post, { base: siteUrl })) }}
    />
  );
}
