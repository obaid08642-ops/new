import { Button } from "@/components-next/ui-generated/components/Button";
import styles from "@/components-next/consult/consult.module.css";

export type CallMediaLabels = { microphone: string; camera: string; leave: string };
export type CallMediaPending = "microphone" | "camera" | null;

type Props = {
  microphoneOn: boolean;
  cameraOn: boolean;
  /** The toggle whose change LiveKit is still applying; it is disabled until the answer comes back. */
  pending: CallMediaPending;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
  labels: CallMediaLabels;
};

/**
 * Decision 4 (2026-10-14): the camera and microphone on/off controls inside the call. Each is a toggle button whose
 * aria-pressed is the real state of the local LiveKit track (pressed = on), painted by the shared `.choice` toggle style
 * (tokens only); the caller passes the state it read back from LiveKit, never the state it asked for.
 */
export function CallMediaToggles({ microphoneOn, cameraOn, pending, onToggleMicrophone, onToggleCamera, onLeave, labels }: Props) {
  return (
    <div className={styles.actionsRow}>
      <button type="button" className={styles.choice} aria-pressed={microphoneOn} disabled={pending === "microphone"} onClick={onToggleMicrophone} data-media="microphone">
        {labels.microphone}
      </button>
      <button type="button" className={styles.choice} aria-pressed={cameraOn} disabled={pending === "camera"} onClick={onToggleCamera} data-media="camera">
        {labels.camera}
      </button>
      <Button variant="danger" label={labels.leave} onClick={onLeave} />
    </div>
  );
}
