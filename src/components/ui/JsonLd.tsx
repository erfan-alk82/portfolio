import { serializeJsonLd } from "@/lib/jsonld";

type Props = {
  data: unknown;
};

/** Structured data as an inline script. serializeJsonLd escapes "<", so it cannot close the element. */
export function JsonLd({ data }: Props) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
