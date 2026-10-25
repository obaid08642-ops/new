// PD-769: the saved-address list shows edit and remove, a default note in the remove dialog, and the not-found text.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock("@/components-next/account/address-map/address-map", () => ({ AddressMap: () => null }));
vi.mock("@/components-next/account/geo-select", () => ({ GeoSelect: () => null }));

const { AddressList } = await import("@/components-next/account/address-book");

const a = { id: "3f2b8c1e-5d4a-4b6f-9a2c-1e8d7f6a5b4c", label: "Home", line1: "12 King Fahd Rd", is_default: true };
const b = { id: "4f2b8c1e-5d4a-4b6f-9a2c-1e8d7f6a5b4d", label: "Work", line1: "3 Olaya St" };

describe("AddressList", () => {
  it("offers edit and remove for each address, and make default only for a non-default one", () => {
    const html = renderToStaticMarkup(<AddressList addresses={[a, b]} locale="en" />);
    expect(html.match(/>edit</g)).toHaveLength(2);
    expect(html.match(/>remove</g)).toHaveLength(2);
    expect(html.match(/>makeDefault</g)).toHaveLength(1);
  });

  it("keeps the confirm dialog and the edit form closed until asked", () => {
    const html = renderToStaticMarkup(<AddressList addresses={[a]} locale="en" />);
    expect(html).not.toContain("alertdialog");
    expect(html).not.toContain("editTitle");
  });
});
