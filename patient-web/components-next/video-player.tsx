"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";

interface CaptionCue {
  start: number;
  end: number;
  text: string;
}

export function parseWebVTT(vttText: string): CaptionCue[] {
  const cues: CaptionCue[] = [];
  const lines = vttText.split("\n");
  let i = 0;

  const parseTime = (timeStr: string): number | null => {
    const parts = timeStr.split(":");
    if (parts.length !== 3) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split(".");
    const seconds = parseInt(secondsParts[0], 10);
    const ms = secondsParts[1] ? parseInt(secondsParts[1].padEnd(3, "0").slice(0, 3), 10) : 0;
    return hours * 3600 + minutes * 60 + seconds + ms / 1000;
  };

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes("-->")) {
      const timeParts = line.split("-->");
      const start = parseTime(timeParts[0].trim());
      const end = parseTime(timeParts[1].trim());
      i++;
      let text = "";
      while (i < lines.length && lines[i].trim() !== "") {
        text += (text ? "\n" : "") + lines[i].trim();
        i++;
      }
      if (text && start !== null && end !== null) {
        cues.push({ start, end, text });
      }
    }
    i++;
  }
  return cues;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  captions?: {
    ar?: string;
    en?: string;
  };
  defaultLanguage?: "ar" | "en" | "off";
  title?: string;
  className?: string;
}

export function VideoPlayer({
  src,
  poster,
  captions,
  defaultLanguage = "off",
  title = "Video player",
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(defaultLanguage !== "off");
  const [currentCaptionLanguage, setCurrentCaptionLanguage] = useState<"ar" | "en" | "off">(defaultLanguage);
  const [parsedCaptions, setParsedCaptions] = useState<CaptionCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex] = useState(-1);
  const captionTrackRef = useRef<HTMLTrackElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!captions || !videoRef.current) return;

    const lang = currentCaptionLanguage;
    if (lang === "off" || !captions[lang as "ar" | "en"]) {
      setParsedCaptions([]);
      return;
    }

    const captionUrl = captions[lang as "ar" | "en"];
    if (!captionUrl) {
      setParsedCaptions([]);
      return;
    }
    fetch(captionUrl)
      .then((res) => res.text())
      .then((text) => {
        const cues = parseWebVTT(text);
        setParsedCaptions(cues);
      })
      .catch(() => setParsedCaptions([]));
  }, [captions, currentCaptionLanguage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !captionsEnabled || parsedCaptions.length === 0) return;

    const currentTime = video.currentTime;
    let foundIndex = -1;

    for (let i = 0; i < parsedCaptions.length; i++) {
      const cue = parsedCaptions[i];
      if (currentTime >= cue.start && currentTime < cue.end) {
        foundIndex = i;
        break;
      }
    }

    setCurrentCueIndex(foundIndex);
  }, [currentTime, captionsEnabled, parsedCaptions]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isFullscreen) {
      video.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleCaptions = () => {
    if (!captions || !captions.ar && !captions.en) return;
    if (!captionsEnabled) {
      const availableLangs = Object.keys(captions) as ("ar" | "en")[];
      setCurrentCaptionLanguage(availableLangs[0]);
      setCaptionsEnabled(true);
    } else {
      setCaptionsEnabled(false);
      setCurrentCaptionLanguage("off");
    }
  };

  const cycleCaptionLanguage = () => {
    if (!captions) return;
    const availableLangs = Object.keys(captions).filter((k) => captions[k as keyof typeof captions]) as ("ar" | "en")[];
    if (availableLangs.length === 0) return;
    if (!captionsEnabled) {
      setCurrentCaptionLanguage(availableLangs[0]);
      setCaptionsEnabled(true);
      return;
    }
    const currentIndex = availableLangs.indexOf(currentCaptionLanguage as "ar" | "en");
    const nextIndex = (currentIndex + 1) % (availableLangs.length + 1);
    if (nextIndex === availableLangs.length) {
      setCaptionsEnabled(false);
      setCurrentCaptionLanguage("off");
    } else {
      setCurrentCaptionLanguage(availableLangs[nextIndex]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "c":
          cycleCaptionLanguage();
          break;
        case "arrowleft":
          if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          break;
        case "arrowright":
          if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
          break;
        case "arrowup":
          if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
          break;
        case "arrowdown":
          if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, isPlaying, isMuted, isFullscreen, captionsEnabled, currentCaptionLanguage, captions]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const availableCaptionLangs = captions
    ? (Object.keys(captions) as ("ar" | "en")[]).filter((k) => !!captions[k])
    : [];

  return (
    <div
      className={`video-player-container ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 800,
        margin: "0 auto",
        borderRadius: 12,
        overflow: "hidden",
        background: "#000",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={() => setShowControls(false)}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        title={title}
        playsInline
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        {captions?.ar && (
          <track
            kind="captions"
            src={captions.ar}
            srcLang="ar"
            label="Arabic"
            default={defaultLanguage === "ar"}
          />
        )}
        {captions?.en && (
          <track
            kind="captions"
            src={captions.en}
            srcLang="en"
            label="English"
            default={defaultLanguage === "en"}
          />
        )}
      </video>

      {captionsEnabled && currentCueIndex >= 0 && parsedCaptions[currentCueIndex] && (
        <div
          className="video-captions-overlay"
          style={{
            position: "absolute",
            bottom: 80,
            left: 20,
            right: 20,
            padding: "12px 16px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 16,
            lineHeight: 1.4,
            textAlign: "center",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            pointerEvents: "none",
            zIndex: 10,
            direction: currentCaptionLanguage === "ar" ? "rtl" : "ltr",
          }}
          role="region"
          aria-label={currentCaptionLanguage === "ar" ? "الترجمة العربية" : "English captions"}
          aria-live="polite"
        >
          {parsedCaptions[currentCueIndex].text}
        </div>
      )}

      {(showControls || isPlaying) && (
        <div
          className="video-controls"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 5,
            opacity: showControls || isPlaying ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            style={{
              width: "100%",
              accentColor: "#5FD9B3",
              cursor: "pointer",
            }}
            aria-label="Seek"
            aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#fff",
              fontSize: 14,
            }}
          >
            <button
              type="button"
              onClick={togglePlay}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            <span style={{ minWidth: 80, textAlign: "center" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              style={{
                width: 80,
                accentColor: "#5FD9B3",
                cursor: "pointer",
              }}
              aria-label="Volume"
            />

            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={isMuted ? "Unmute" : "Mute"}
              aria-pressed={isMuted}
            >
              {isMuted ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 9v3h4v-3" /><path d="M17 9v3h4v-3" /><line x1="11" y1="5" x2="11" y2="19" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
              )}
            </button>

            {availableCaptionLangs.length > 0 && (
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={toggleCaptions}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cycleCaptionLanguage();
                  }}
                  style={{
                    background: captionsEnabled ? "#5FD9B3" : "rgba(255,255,255,0.2)",
                    border: "none",
                    color: captionsEnabled ? "#1E332E" : "#fff",
                    cursor: "pointer",
                    padding: "8px 12px",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  aria-label={captionsEnabled ? "Hide captions (C to cycle)" : "Show captions (C to toggle)"}
                  aria-pressed={captionsEnabled}
                >
                  <FileText size={16} aria-hidden="true" />
                  <span>{captionsEnabled ? currentCaptionLanguage.toUpperCase() : "OFF"}</span>
                </button>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                background: "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                padding: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <X size={24} aria-hidden="true" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .video-player-container:focus-visible {
          outline: 2px solid #5FD9B3;
          outline-offset: 2px;
        }
        .video-controls button:focus-visible {
          outline: 2px solid #5FD9B3;
          outline-offset: 2px;
          border-radius: 4px;
        }
        .video-controls input:focus-visible {
          outline: 2px solid #5FD9B3;
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}