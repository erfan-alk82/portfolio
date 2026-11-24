import type { ComponentProps } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkRichTerms } from "@/lib/blog/remark-rich-terms";

type Props = {
  source: string;
};

/** Absolute http(s) links leave the site. Relative paths and fragments stay. */
function isExternal(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}

/** The CSP allows images from this origin only (img-src 'self' data:). */
function isSameOrigin(src: unknown): src is string {
  return typeof src === "string" && src.startsWith("/") && !src.startsWith("//");
}

/** Markdown h1 → h2 and so on: the post title is the page's only h1. */
function demoted(level: 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;
  function Heading({ node, ...props }: ComponentProps<"h2"> & { node?: unknown }) {
    return <Tag {...props} />;
  }
  return Heading;
}

const components: Components = {
  h1: demoted(2),
  h2: demoted(3),
  h3: demoted(4),
  h4: demoted(5),
  h5: demoted(6),
  a({ node, href, ...props }) {
    return <a href={href} rel={isExternal(href) ? "noopener noreferrer" : undefined} {...props} />;
  },
  img({ src, alt }) {
    if (!isSameOrigin(src)) return alt ? <span>{alt}</span> : null;
    // Post images are plain files under public/; next/image would need known dimensions.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />;
  },
  pre({ node, ...props }) {
    return <pre dir="ltr" {...props} />;
  },
  code({ node, className, ...props }) {
    // Fenced blocks carry a language class and sit inside <pre dir="ltr">; inline code needs its own.
    return className ? <code className={className} {...props} /> : <code dir="ltr" {...props} />;
  },
};

/**
 * Renders a post body. Raw HTML in the source is dropped (skipHtml, no
 * rehype-raw), and react-markdown's default URL transform removes
 * javascript:, data: and other unsafe link protocols.
 */
export function MarkdownBody({ source }: Props) {
  return (
    <Markdown remarkPlugins={[remarkGfm, remarkRichTerms]} skipHtml components={components}>
      {source}
    </Markdown>
  );
}
