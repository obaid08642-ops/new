// 17.4: the article share row shares the page's canonical address, and its links open the share pages with that address.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArticleShare } from "@/components-next/articles/article-share";

const labels = { heading: "Share this article", copy: "Copy link", copied: "Copied", whatsapp: "WhatsApp", x: "X" };
const url = "https://www.nabd.plus/en/articles/iron-basics";

describe("ArticleShare", () => {
  it("links WhatsApp and X with the canonical address and the title", () => {
    const html = renderToStaticMarkup(<ArticleShare url={url} title="Iron basics" labels={labels} />);
    expect(html).toContain(`https://wa.me/?text=${encodeURIComponent(`Iron basics ${url}`)}`);
    expect(html).toContain(`https://x.com/intent/post?url=${encodeURIComponent(url)}`);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("offers a copy button labelled from the caller and names its section", () => {
    const html = renderToStaticMarkup(<ArticleShare url={url} title="Iron basics" labels={labels} />);
    expect(html).toContain(">Copy link<");
    expect(html).toContain('aria-label="Share this article"');
  });
});
