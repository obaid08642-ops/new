import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import { VoiceNotePlayer } from "@/components-next/consult/voice-note-player";

describe("voice note player", () => {
  it("renders a play button, a keyboard-operable seek bar and the length", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={{ ChatDetail: en.ChatDetail }}>
        <VoiceNotePlayer mediaId="m1" durationSeconds={75} />
      </NextIntlClientProvider>,
    );
    expect(html).toContain("Play");
    expect(html).toContain('type="range"');
    expect(html).toContain("Voice note, 1:15");
    expect(html).toContain("1:15");
    expect(html).toContain("disabled");
    expect(html).not.toContain("<audio");
  });
});
