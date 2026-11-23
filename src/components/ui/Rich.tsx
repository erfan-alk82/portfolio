import { Fragment } from "react";
import { parseRich } from "@/lib/rich";

type Props = {
  text: string;
};

/** Renders a content string, isolating [[Latin terms]] for correct bidi order. */
export function Rich({ text }: Props) {
  return (
    <>
      {parseRich(text).map((segment, index) =>
        segment.isolate ? (
          <bdi key={index} dir="ltr" lang="en">
            {segment.text}
          </bdi>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
