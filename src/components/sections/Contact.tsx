import { ArrowUpRight, Download, Mail, Phone } from "lucide-react";
import { profile, type SiteCopy } from "@/content";
import type { Locale } from "@/i18n/config";
import { Availability } from "@/components/ui/Availability";
import { Rich } from "@/components/ui/Rich";
import { CopyEmailButton } from "./CopyEmailButton";

type Props = {
  locale: Locale;
  copy: SiteCopy;
};

type SocialKey = keyof typeof profile.social;
const SOCIAL_ORDER: readonly SocialKey[] = ["linkedin", "github", "telegram"];

export function Contact({ locale, copy }: Props) {
  const { contact } = copy;

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="on-band bg-band text-on-band"
    >
      <div className="mx-auto grid max-w-[90rem] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:py-28">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <h2
            id="contact-title"
            className="display text-section font-extrabold"
          >
            {contact.title}
          </h2>
          <p className="measure text-lg text-on-band/85">
            <Rich text={contact.lead} />
          </p>
          <Availability
            label={copy.availability.label}
            value={copy.availability.value}
            tone="band"
          />
          <div className="flex flex-col gap-2">
            <p className="text-sm text-on-band/70">{contact.emailLabel}</p>
            <a
              href={`mailto:${profile.email}`}
              dir="ltr"
              className="display w-fit text-[clamp(1.5rem,0.9rem+3.2vw,3.5rem)] font-bold [overflow-wrap:anywhere] text-on-band underline decoration-signal-light/60 decoration-1 underline-offset-[0.18em] hover:decoration-signal-light"
            >
              {profile.email}
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-on-band/70">{contact.phoneLabel}</p>
            <a
              href={`tel:${profile.phone.tel}`}
              dir="ltr"
              data-testid="phone"
              className="inline-flex w-fit items-center gap-3 text-2xl font-semibold text-on-band underline decoration-signal-light/60 decoration-1 underline-offset-[0.2em] hover:decoration-signal-light"
            >
              <Phone aria-hidden="true" className="size-5" strokeWidth={1.75} />
              {profile.phone.display[locale]}
            </a>
          </div>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <CopyEmailButton
              email={profile.email}
              labels={{
                copy: contact.copy,
                copied: contact.copied,
                copyFailed: contact.copyFailed,
              }}
            />
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-on-band/40 px-5 font-semibold transition-colors duration-150 hover:border-signal-light hover:text-signal-light"
            >
              <Mail aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {contact.compose}
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4 lg:col-start-9 lg:self-end">
          <h3 className="text-sm text-on-band/70">{contact.elsewhere}</h3>
          <ul className="border-t border-on-band/25">
            {SOCIAL_ORDER.map((key) => (
              <li key={key} className="border-b border-on-band/25">
                <a
                  href={profile.social[key].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-14 items-center justify-between gap-4 py-3 transition-colors duration-150 hover:text-signal-light"
                >
                  <span className="font-semibold">{contact.links[key]}</span>
                  <span className="flex items-center gap-2 text-sm text-on-band/75 group-hover:text-signal-light">
                    <bdi dir="ltr" lang="en">
                      {profile.social[key].handle}
                    </bdi>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 rtl:-scale-x-100"
                      strokeWidth={1.75}
                    />
                  </span>
                </a>
              </li>
            ))}
            <li className="border-b border-on-band/25">
              <a
                href={profile.cvPath}
                download
                className="group flex min-h-14 items-center justify-between gap-4 py-3 transition-colors duration-150 hover:text-signal-light"
              >
                <span className="font-semibold">{contact.cv}</span>
                <Download
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.75}
                />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
