import type { SiteCopy } from "@/content";
import { Rich } from "@/components/ui/Rich";
import { SectionHeading } from "@/components/ui/SectionHeading";

type Props = {
  copy: SiteCopy;
};

export function About({ copy }: Props) {
  const { about } = copy;

  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="border-t border-ink py-20 lg:py-28"
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-3">
          <SectionHeading id="about-title">{about.title}</SectionHeading>
        </div>
        <div className="flex flex-col gap-6 text-lg lg:col-span-6">
          {about.paragraphs.map((paragraph, index) => (
            <p key={index} className="measure">
              <Rich text={paragraph} />
            </p>
          ))}
        </div>
        <dl className="self-start border-t-2 border-ink lg:col-span-3">
          {about.facts.map((fact) => (
            <div
              key={fact.label}
              className="flex flex-col gap-1 border-b border-rule py-4"
            >
              <dt className="text-sm text-contour-strong">{fact.label}</dt>
              <dd className="font-semibold text-ink">
                <Rich text={fact.value} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
