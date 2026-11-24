import type { BlogCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { formatPostDate } from "@/lib/dates";

type Props = {
  locale: Locale;
  copy: BlogCopy;
  publishedAt: string;
  updatedAt?: string;
};

/** Publication date, plus the last update when it falls on a later day. */
export function PostDates({ locale, copy, publishedAt, updatedAt }: Props) {
  const published = formatPostDate(locale, publishedAt);
  const updated = updatedAt ? formatPostDate(locale, updatedAt) : null;
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-contour-strong">
      <span>
        {copy.published}{" "}
        <time dateTime={publishedAt} className="font-semibold">
          {published}
        </time>
      </span>
      {updated && updatedAt && updated !== published ? (
        <span>
          {copy.updated}{" "}
          <time dateTime={updatedAt} className="font-semibold">
            {updated}
          </time>
        </span>
      ) : null}
    </p>
  );
}
