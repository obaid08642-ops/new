import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

import { filterFaqs, SupportClient } from "../app/[locale]/support/support-client";

const FAQS = [
  { id: "1", question: "How do I track my order?", answer: "Open your orders page for live status." },
  { id: "2", question: "How do I upload a prescription?", answer: "Use the scan page to upload." },
  { id: "3", question: "What are delivery fees?", answer: "Fees depend on your city zone." },
];

const LABELS = {
  faqTitle: "FAQ",
  ticketsTitle: "Tickets",
  noTickets: "Nothing",
  subjectPlaceholder: "Subject",
  messagePlaceholder: "Message",
  send: "Send",
  sending: "Sending",
  sent: "Sent",
  error: "Error",
  searchPlaceholder: "Search help articles",
  noFaqResults: "No match",
  orderHelpLabel: "Need help with an order?",
  orderIdPlaceholder: "Order ID (optional)",
};

describe("help-center search (P22)", () => {
  it("returns everything on an empty query", () => {
    expect(filterFaqs(FAQS, "")).toHaveLength(3);
    expect(filterFaqs(FAQS, "   ")).toHaveLength(3);
  });

  it("matches question and answer text case-insensitively", () => {
    expect(filterFaqs(FAQS, "track").map((f) => f.id)).toEqual(["1"]);
    expect(filterFaqs(FAQS, "SCAN").map((f) => f.id)).toEqual(["2"]);
    expect(filterFaqs(FAQS, "city zone").map((f) => f.id)).toEqual(["3"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterFaqs(FAQS, "zzz-no-such-article")).toEqual([]);
  });

  it("renders a searchbox and an order-linked support entry point", () => {
    const html = renderToStaticMarkup(
      <SupportClient faqs={FAQS} tickets={[]} labels={LABELS} ordersHref="/en/orders" />,
    );
    expect(html).toContain('type="search"');
    expect(html).toContain('aria-label="Search help articles"');
    expect(html).toContain('href="/en/orders"');
    expect(html).toContain("Need help with an order?");
    expect(html).toContain('aria-label="Order ID (optional)"');
  });
});
