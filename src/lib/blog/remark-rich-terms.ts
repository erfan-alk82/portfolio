import type { Parent, PhrasingContent, Root, Text } from "mdast";
import { parseRich } from "@/lib/rich";

/**
 * Remark plugin: the [[term]] markers used in site copy also work in posts.
 * Each marked term becomes <bdi dir="ltr" lang="en"> so Latin words keep their
 * punctuation order inside Persian sentences. Code is a separate node type,
 * so `[[x]]` inside backticks stays literal.
 */

interface RichTermNode {
  type: "richTerm";
  data: { hName: "bdi"; hProperties: { dir: "ltr"; lang: "en" } };
  children: Text[];
}

function isText(node: { type: string }): node is Text {
  return node.type === "text";
}

/** The parser may split "[[" into several text nodes; join neighbours before matching. */
function mergeAdjacentText(children: readonly PhrasingContent[]): PhrasingContent[] {
  const merged: PhrasingContent[] = [];
  for (const child of children) {
    const previous = merged.at(-1);
    if (previous && isText(previous) && isText(child)) {
      merged[merged.length - 1] = { type: "text", value: previous.value + child.value };
    } else {
      merged.push(child);
    }
  }
  return merged;
}

function splitTerms(node: Text): PhrasingContent[] {
  return parseRich(node.value).map((segment) =>
    segment.isolate
      ? ({
          type: "richTerm",
          data: { hName: "bdi", hProperties: { dir: "ltr", lang: "en" } },
          children: [{ type: "text", value: segment.text }],
        } satisfies RichTermNode as unknown as PhrasingContent)
      : ({ type: "text", value: segment.text } satisfies Text),
  );
}

function transform(parent: Parent): void {
  const hasText = parent.children.some(isText);
  if (hasText) {
    parent.children = mergeAdjacentText(parent.children as PhrasingContent[]).flatMap((child) =>
      isText(child) && child.value.includes("[[") ? splitTerms(child) : [child],
    );
  }
  for (const child of parent.children) {
    if ("children" in child) transform(child as Parent);
  }
}

export function remarkRichTerms() {
  return (tree: Root): void => {
    transform(tree);
  };
}
