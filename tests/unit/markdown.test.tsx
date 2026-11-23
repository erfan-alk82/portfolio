import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "@/components/blog/MarkdownBody";

function render(source: string): string {
  return renderToStaticMarkup(<MarkdownBody source={source} />);
}

describe("MarkdownBody", () => {
  test("renders GitHub-flavoured Markdown", () => {
    const html = render("Some **bold** text\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<table>");
    expect(html).toContain('type="checkbox"');
  });

  test("drops raw HTML instead of rendering it", () => {
    const html = render('Hello <script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<div onclick="x()">hi</div>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<div");
  });

  test("strips javascript: links", () => {
    const html = render("[click](javascript:alert(1)) and [data](data:text/html,<script>alert(1)</script>)");
    expect(html).not.toMatch(/href="(javascript|data):/i);
    expect(html).toContain("click");
  });

  test("marks external links noopener noreferrer and leaves internal ones alone", () => {
    const html = render("[ext](https://example.org/x) [int](/en/blog/other)");
    expect(html).toContain('<a href="https://example.org/x" rel="noopener noreferrer">ext</a>');
    expect(html).toContain('<a href="/en/blog/other">int</a>');
  });

  test("keeps same-origin images and replaces remote ones with their alt text", () => {
    const html = render("![local](/og/en.png) ![remote](https://tracker.example/pixel.gif) ![proto](//evil.example/a.png)");
    expect(html).toContain('<img src="/og/en.png" alt="local" loading="lazy" decoding="async"/>');
    expect(html).not.toContain("tracker.example");
    expect(html).not.toContain("evil.example");
    expect(html).toContain("remote");
  });

  test("code blocks are always left-to-right", () => {
    const html = render("```ts\nconst a = 1;\n```\n\nand `inline` code");
    expect(html).toContain('<pre dir="ltr"><code class="language-ts">');
    expect(html).toContain('<code dir="ltr">inline</code>');
  });

  test("isolates [[terms]] in text but not inside code", () => {
    const html = render("ساخته‌شده با [[React]] و [[Next.js]]\n\n`[[raw]]`");
    expect(html).toContain('<bdi dir="ltr" lang="en">React</bdi>');
    expect(html).toContain('<bdi dir="ltr" lang="en">Next.js</bdi>');
    expect(html).toContain('<code dir="ltr">[[raw]]</code>');
  });

  test("demotes level-one headings so the post title stays the only h1", () => {
    const html = render("# Heading\n\n## Sub");
    expect(html).not.toContain("<h1");
    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<h3>Sub</h3>");
  });
});
