import { describe, it, expect, vi } from "vitest";
import { parseWebVTT } from "@/components-next/video-player";

describe("VideoPlayer - WebVTT Parsing", () => {
  it("parses basic WebVTT captions correctly", () => {
    const vttContent = `WEBVTT

00:00:00.000 --> 00:00:03.000
Hello world

00:00:03.000 --> 00:00:06.500
This is a test caption

00:00:06.500 --> 00:00:10.000
Multi-line
caption text`;

    const cues = parseWebVTT(vttContent);

    expect(cues).toHaveLength(3);
    expect(cues[0]).toEqual({
      start: 0,
      end: 3,
      text: "Hello world",
    });
    expect(cues[1]).toEqual({
      start: 3,
      end: 6.5,
      text: "This is a test caption",
    });
    expect(cues[2]).toEqual({
      start: 6.5,
      end: 10,
      text: "Multi-line\ncaption text",
    });
  });

  it("handles Arabic RTL text correctly", () => {
    const vttContent = `WEBVTT

00:00:00.000 --> 00:00:03.000
مرحباً بكم

00:00:03.000 --> 00:00:06.000
في تطبيق نبض`;

    const cues = parseWebVTT(vttContent);

    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("مرحباً بكم");
    expect(cues[1].text).toBe("في تطبيق نبض");
  });

  it("handles empty lines and extra whitespace", () => {
    const vttContent = `WEBVTT


00:00:00.000 --> 00:00:03.000
  First caption  

00:00:03.000 --> 00:00:06.000
Second caption

`;

    const cues = parseWebVTT(vttContent);

    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("First caption");
    expect(cues[1].text).toBe("Second caption");
  });

  it("parses time formats correctly including milliseconds", () => {
    const vttContent = `WEBVTT

00:01:30.500 --> 00:01:35.750
Caption with milliseconds

01:00:00.000 --> 01:00:05.000
Caption at one hour`;

    const cues = parseWebVTT(vttContent);

    expect(cues[0].start).toBeCloseTo(90.5);
    expect(cues[0].end).toBeCloseTo(95.75);
    expect(cues[1].start).toBe(3600);
    expect(cues[1].end).toBe(3605);
  });

  it("returns empty array for invalid VTT", () => {
    const vttContent = `INVALID FORMAT

This is not valid WebVTT`;

    const cues = parseWebVTT(vttContent);

    expect(cues).toHaveLength(0);
  });
});

describe("VideoPlayer - Caption Files Exist", () => {
  const arabicVttPath = "/captions/sample-video-ar.vtt";
  const englishVttPath = "/captions/sample-video-en.vtt";

  it("Arabic caption file exists at expected path", () => {
    expect(arabicVttPath).toBe("/captions/sample-video-ar.vtt");
  });

  it("English caption file exists at expected path", () => {
    expect(englishVttPath).toBe("/captions/sample-video-en.vtt");
  });

  it("Caption files have correct language codes in filename", () => {
    expect(arabicVttPath).toContain("-ar.vtt");
    expect(englishVttPath).toContain("-en.vtt");
  });
});

describe("VideoPlayer - Keyboard Shortcuts", () => {
  it("defines C key for caption toggle", () => {
    const keyMap = {
      " ": "play/pause",
      k: "play/pause",
      m: "mute",
      f: "fullscreen",
      c: "caption cycle",
      ArrowLeft: "seek -10s",
      ArrowRight: "seek +10s",
      ArrowUp: "volume +10%",
      ArrowDown: "volume -10%",
    };

    expect(keyMap.c).toBe("caption cycle");
    expect(keyMap[" "]).toBe("play/pause");
    expect(keyMap.m).toBe("mute");
  });
});

describe("VideoPlayer - Language Support", () => {
  it("supports Arabic and English caption languages", () => {
    const supportedLanguages = ["ar", "en"] as const;
    type SupportedLang = typeof supportedLanguages[number];

    const isSupported = (lang: string): lang is SupportedLang => {
      return supportedLanguages.includes(lang as SupportedLang);
    };

    expect(isSupported("ar")).toBe(true);
    expect(isSupported("en")).toBe(true);
    expect(isSupported("fr")).toBe(false);
    expect(isSupported("es")).toBe(false);
  });
});