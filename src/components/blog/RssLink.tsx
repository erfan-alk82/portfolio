import { Rss } from "lucide-react";
import type { BlogCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { feedPath } from "@/lib/blog/seo";
import { Rich } from "@/components/ui/Rich";

type Props = {
  locale: Locale;
  copy: BlogCopy;
};

export function RssLink({ locale, copy }: Props) {
  return (
    <a
      href={feedPath(locale)}
      type="application/rss+xml"
      className="link-signal inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
    >
      <Rss aria-hidden="true" className="size-4 text-contour" strokeWidth={1.75} />
      <span>
        <Rich text={copy.rss} />
      </span>
    </a>
  );
}
