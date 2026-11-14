/**
 * A phone (GSM) call or another VoIP call interrupts ours: the system puts it on hold (CallKit / ConnectionService report it through
 * react-native-callkeep). The call screen stops sending audio and video while held and sends them again on resume, without leaving the room.
 */
type Listener = (held: boolean) => void;
const listeners = new Set<Listener>();

export function onCallHold(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCallHold(held: boolean): void {
  listeners.forEach((l) => l(held));
}
