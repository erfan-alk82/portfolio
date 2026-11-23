import { ArrowUp } from "lucide-react";
import type { SiteCopy } from "@/content";

type Props = {
  copy: SiteCopy;
};

export function SiteFooter({ copy }: Props) {
  return (
    <footer className="on-ink bg-ink text-paper/75">
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-4 border-t border-paper/15 px-5 py-6 text-sm sm:px-8 lg:px-12">
        <p>{copy.footer.note}</p>
        <a
          href="#top"
          className="inline-flex min-h-11 items-center gap-2 transition-colors duration-150 hover:text-signal-light"
        >
          <ArrowUp aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {copy.footer.backToTop}
        </a>
      </div>
    </footer>
  );
}
