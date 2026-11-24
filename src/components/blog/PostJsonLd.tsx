import { getCopy } from "@/content";
import { blogPostingJsonLd, type PublicPost } from "@/lib/blog/seo";
import { siteUrl } from "@/lib/site";
import { JsonLd } from "@/components/ui/JsonLd";

type Props = {
  post: PublicPost;
};

/** schema.org BlogPosting with the author and blog inlined in the post's language. */
export function PostJsonLd({ post }: Props) {
  const copy = getCopy(post.locale);
  return (
    <JsonLd
      data={blogPostingJsonLd(post, { base: siteUrl, authorName: copy.hero.name, blogName: copy.blog.feedTitle })}
    />
  );
}
