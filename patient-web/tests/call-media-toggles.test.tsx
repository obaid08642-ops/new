import { Children, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CallMediaToggles } from "@/components-next/consult/call-media-toggles";
import { DEFAULT_LIVEKIT_URL, livekitConnectSources, livekitUrl } from "@/lib/consult/livekit-url";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { messagesFor } from "./helpers/intl";

const labels = { microphone: "Microphone", camera: "Camera", leave: "Leave" };
const props = (over: Partial<Parameters<typeof CallMediaToggles>[0]> = {}) => ({
  microphoneOn: true, cameraOn: true, pending: null, onToggleMicrophone: vi.fn(), onToggleCamera: vi.fn(), onLeave: vi.fn(), labels, ...over,
});
const toggle = (html: string, media: string) => new RegExp(`<button[^>]*aria-pressed="(true|false)"[^>]*data-media="${media}"[^>]*>`).exec(html);

describe("decision 4: camera and microphone toggles inside the call", () => {
  it("shows each toggle's real state in aria-pressed (pressed = on)", () => {
    const on = renderToStaticMarkup(<CallMediaToggles {...props()} />);
    expect(toggle(on, "microphone")?.[1]).toBe("true");
    expect(toggle(on, "camera")?.[1]).toBe("true");
    const off = renderToStaticMarkup(<CallMediaToggles {...props({ microphoneOn: false, cameraOn: false })} />);
    expect(toggle(off, "microphone")?.[1]).toBe("false");
    expect(toggle(off, "camera")?.[1]).toBe("false");
    expect(off).toContain(">Microphone<");
    expect(off).toContain(">Camera<");
  });

  it("disables only the toggle LiveKit is still applying", () => {
    const html = renderToStaticMarkup(<CallMediaToggles {...props({ pending: "camera" })} />);
    expect(toggle(html, "camera")?.[0]).toContain("disabled");
    expect(toggle(html, "microphone")?.[0]).not.toContain("disabled");
  });

  it("calls the matching handler for each control", () => {
    const p = props();
    const tree = CallMediaToggles(p) as ReactElement<{ children: ReactElement[] }>;
    const buttons = Children.toArray(tree.props.children).filter(isValidElement) as ReactElement<{ onClick: () => void; "data-media"?: string }>[];
    buttons.find((b) => b.props["data-media"] === "microphone")?.props.onClick();
    buttons.find((b) => b.props["data-media"] === "camera")?.props.onClick();
    buttons.find((b) => !b.props["data-media"])?.props.onClick();
    expect(p.onToggleMicrophone).toHaveBeenCalledTimes(1);
    expect(p.onToggleCamera).toHaveBeenCalledTimes(1);
    expect(p.onLeave).toHaveBeenCalledTimes(1);
  });

  it("has every call label in the six languages", () => {
    for (const locale of ["ar", "en", "ur", "hi", "bn", "fil"]) {
      const consult = (messagesFor(locale) as Record<string, Record<string, string>>).ConsultWeb;
      for (const key of ["callMicrophone", "callCamera", "callLeave", "callLive", "callWaitingForDoctor", "callYou", "callDoctor"]) {
        expect(consult[key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });
});

describe("the LiveKit server the call screens use", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("defaults to the production LiveKit, which the policy already allows", () => {
    expect(livekitUrl({})).toBe(DEFAULT_LIVEKIT_URL);
    expect(livekitConnectSources({})).toEqual([]);
    expect(livekitUrl({ NABD_LIVEKIT_URL: "https://not-a-websocket.example" })).toBe(DEFAULT_LIVEKIT_URL);
  });

  it("uses NABD_LIVEKIT_URL at request time and lets the policy reach exactly that origin", () => {
    expect(livekitUrl({ NABD_LIVEKIT_URL: "ws://127.0.0.1:7880/" })).toBe("ws://127.0.0.1:7880");
    expect(livekitConnectSources({ NABD_LIVEKIT_URL: "ws://127.0.0.1:7880" })).toEqual(["ws://127.0.0.1:7880", "http://127.0.0.1:7880"]);
    vi.stubEnv("NABD_LIVEKIT_URL", "ws://127.0.0.1:7880");
    const connect = contentSecurityPolicy("n", false).split("; ").find((d) => d.startsWith("connect-src "));
    expect(connect).toBe("connect-src 'self' https://api.nabd.plus wss://live.nabd.plus https://cdn.nabd.plus https://accounts.google.com/gsi/ ws://127.0.0.1:7880 http://127.0.0.1:7880");
  });
});
